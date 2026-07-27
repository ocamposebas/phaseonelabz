<?php
/**
 * Plugin Name: Phase One Labz - Signed Agreements
 * Description: Emails the executed checkout agreement through WordPress when a WooCommerce order is paid.
 * Version: 1.1.0
 * Author: Phase One Labz
 * Requires Plugins: woocommerce
 * Requires PHP: 7.4
 */

defined( 'ABSPATH' ) || exit;

define( 'PHASEONE_SIGNED_AGREEMENTS_VERSION', '1.1.0' );

add_action(
	'before_woocommerce_init',
	static function () {
		$features_class = '\Automattic\WooCommerce\Utilities\FeaturesUtil';

		if ( class_exists( $features_class ) ) {
			$features_class::declare_compatibility(
				'custom_order_tables',
				__FILE__,
				true
			);
		}
	}
);

/**
 * Confirm successful activation once in the WordPress admin.
 *
 * @return void
 */
function phaseone_signed_agreements_activate() {
	set_transient( 'phaseone_signed_agreements_activated', 'yes', 5 * MINUTE_IN_SECONDS );
}

register_activation_hook( __FILE__, 'phaseone_signed_agreements_activate' );

/**
 * Display a one-time activation confirmation.
 *
 * @return void
 */
function phaseone_signed_agreements_activation_notice() {
	if ( 'yes' !== get_transient( 'phaseone_signed_agreements_activated' ) ) {
		return;
	}

	delete_transient( 'phaseone_signed_agreements_activated' );

	echo '<div class="notice notice-success is-dismissible"><p><strong>Phase One Labz Signed Agreements is active.</strong> Paid WooCommerce orders can now send their signed PDF through WordPress email.</p></div>';
}

add_action( 'admin_notices', 'phaseone_signed_agreements_activation_notice' );

/**
 * Register a harmless public health check. It exposes no order or customer
 * information and makes deployment verification unambiguous.
 *
 * @return void
 */
function phaseone_signed_agreements_register_status_route() {
	register_rest_route(
		'phaseone/v1',
		'/signed-agreements/status',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'permission_callback' => '__return_true',
			'callback'            => static function () {
				return rest_ensure_response(
					array(
						'active'      => true,
						'version'     => PHASEONE_SIGNED_AGREEMENTS_VERSION,
						'woocommerce' => class_exists( 'WooCommerce' ),
						'wp_mail'     => function_exists( 'wp_mail' ),
					)
				);
			},
		)
	);
}

add_action(
	'rest_api_init',
	'phaseone_signed_agreements_register_status_route'
);

/**
 * Rebuild the stored PDF base64 value, including chunked storage.
 *
 * @param WC_Order $order Order object.
 * @return string
 */
function phaseone_get_agreement_pdf_base64( $order ) {
	if ( ! $order instanceof WC_Order ) {
		return '';
	}

	$pdf_base64 = (string) $order->get_meta(
		'_phaseone_contract_pdf_base64',
		true
	);

	if ( '' !== $pdf_base64 ) {
		return $pdf_base64;
	}

	$chunk_count = absint(
		$order->get_meta( '_phaseone_contract_pdf_chunk_count', true )
	);

	if ( $chunk_count <= 0 || $chunk_count > 180 ) {
		return '';
	}

	$chunks = array();

	for ( $index = 1; $index <= $chunk_count; $index++ ) {
		$chunk = (string) $order->get_meta(
			'_phaseone_contract_pdf_chunk_' . $index,
			true
		);

		if ( '' === $chunk ) {
			return '';
		}

		$chunks[] = $chunk;
	}

	return implode( '', $chunks );
}

/**
 * Decode and validate the agreement record.
 *
 * @param WC_Order $order Order object.
 * @return array
 */
function phaseone_get_agreement_record( $order ) {
	if ( ! $order instanceof WC_Order ) {
		return array();
	}

	$record = json_decode(
		(string) $order->get_meta( '_phaseone_contract_record', true ),
		true
	);

	return is_array( $record ) ? $record : array();
}

/**
 * Send the signed agreement once, using wp_mail().
 *
 * wp_mail() automatically uses the SMTP/delivery plugin already configured in
 * WordPress. No SMTP credentials are stored in the Astro checkout.
 *
 * @param int $order_id WooCommerce order ID.
 * @return void
 */
function phaseone_send_paid_order_agreement( $order_id ) {
	static $orders_in_progress = array();

	$order_id = absint( $order_id );

	if ( ! $order_id || isset( $orders_in_progress[ $order_id ] ) ) {
		return;
	}

	$order = wc_get_order( $order_id );

	if ( ! $order instanceof WC_Order || ! $order->is_paid() ) {
		return;
	}

	$sent_at = (string) $order->get_meta( '_phaseone_contract_email_sent_at', true );

	if ( '' !== $sent_at ) {
		return;
	}

	$evidence_hash = sanitize_text_field(
		(string) $order->get_meta( '_phaseone_contract_hash', true )
	);
	$pdf_base64   = phaseone_get_agreement_pdf_base64( $order );
	$record_json  = (string) $order->get_meta( '_phaseone_contract_record', true );

	if ( '' === $evidence_hash || '' === $record_json ) {
		return;
	}

	if ( '' === $pdf_base64 ) {
		$missing_pdf_reported = (string) $order->get_meta(
			'_phaseone_contract_missing_pdf_reported',
			true
		);

		if ( 'yes' !== $missing_pdf_reported ) {
			$order->update_meta_data(
				'_phaseone_contract_email_status',
				'missing_pdf'
			);
			$order->update_meta_data(
				'_phaseone_contract_missing_pdf_reported',
				'yes'
			);
			$order->add_order_note(
				'Signed agreement email was not sent because the PDF attachment is missing from the order.'
			);
			$order->save_meta_data();
		}

		return;
	}

	$current_status = (string) $order->get_meta(
		'_phaseone_contract_email_status',
		true
	);
	$processing_at  = (string) $order->get_meta(
		'_phaseone_contract_email_processing_at',
		true
	);

	if (
		'processing' === $current_status &&
		$processing_at &&
		( time() - strtotime( $processing_at ) ) < 10 * MINUTE_IN_SECONDS
	) {
		return;
	}

	$orders_in_progress[ $order_id ] = true;

	$order->update_meta_data( '_phaseone_contract_email_status', 'processing' );
	$order->update_meta_data(
		'_phaseone_contract_email_processing_at',
		gmdate( 'c' )
	);
	$order->save_meta_data();

	$temp_file = '';

	try {
		$pdf_bytes = base64_decode( $pdf_base64, true );

		if (
			false === $pdf_bytes ||
			0 !== strpos( $pdf_bytes, '%PDF-' ) ||
			strlen( $pdf_bytes ) > 2 * MB_IN_BYTES
		) {
			throw new RuntimeException( 'Stored signed agreement PDF is invalid.' );
		}

		$record = json_decode( $record_json, true );

		if ( ! is_array( $record ) ) {
			throw new RuntimeException( 'Stored signed agreement record is invalid.' );
		}

		$recipient = sanitize_email( $order->get_billing_email() );

		if ( ! is_email( $recipient ) ) {
			throw new RuntimeException( 'Order billing email is invalid.' );
		}

		$stored_filename = sanitize_file_name(
			(string) $order->get_meta(
				'_phaseone_contract_pdf_filename',
				true
			)
		);
		$filename        = $stored_filename
			? $stored_filename
			: sprintf(
				'Phase-One-Labz-Signed-Agreement-Order-%s.pdf',
				sanitize_file_name( $order->get_order_number() )
			);
		$temp_file       = trailingslashit( get_temp_dir() ) .
			wp_unique_filename( get_temp_dir(), $filename );

		if ( false === file_put_contents( $temp_file, $pdf_bytes ) ) {
			throw new RuntimeException( 'Signed agreement attachment could not be prepared.' );
		}

		$signer_name = sanitize_text_field(
			(string) ( $record['signer']['fullName'] ?? $order->get_formatted_billing_full_name() )
		);
		$evidence_id = strtoupper( substr( $evidence_hash, 0, 16 ) );
		$order_number = $order->get_order_number();

		$body = sprintf(
			'<p>Hello %s,</p>
			<p>Payment for order <strong>#%s</strong> has been confirmed.</p>
			<p>Your executed <strong>Purchase &amp; Research Use Agreement</strong> is attached as a PDF. It includes the products covered by your signature, the acceptance timestamp, signature evidence, and the incorporated policy text.</p>
			<table cellspacing="0" cellpadding="0" style="width:100%%;margin:24px 0;border-collapse:collapse">
				<tr>
					<td style="padding:14px;border:1px solid #dbe3ef;background:#f7f9fc"><strong>Signed by</strong><br>%s</td>
					<td style="padding:14px;border:1px solid #dbe3ef;background:#f7f9fc"><strong>Evidence ID</strong><br><code>%s</code></td>
				</tr>
			</table>
			<p>Please retain the attached document with your order records.</p>',
			esc_html( $signer_name ),
			esc_html( $order_number ),
			esc_html( $signer_name ),
			esc_html( $evidence_id )
		);

		$mailer = WC()->mailer();
		$message = method_exists( $mailer, 'wrap_message' )
			? $mailer->wrap_message( 'Your signed Phase One Labz agreement', $body )
			: $body;

		$content_type_filter = static function () {
			return 'text/html';
		};

		add_filter( 'wp_mail_content_type', $content_type_filter );

		try {
			$sent = wp_mail(
				$recipient,
				sprintf(
					'Your signed Phase One Labz agreement - Order #%s',
					$order_number
				),
				$message,
				array(),
				array( $temp_file )
			);
		} finally {
			remove_filter( 'wp_mail_content_type', $content_type_filter );
		}

		if ( ! $sent ) {
			throw new RuntimeException( 'WordPress mail delivery returned false.' );
		}

		$sent_at = gmdate( 'c' );
		$order->update_meta_data( '_phaseone_contract_email_status', 'sent' );
		$order->update_meta_data( '_phaseone_contract_email_sent_at', $sent_at );
		$order->delete_meta_data( '_phaseone_contract_email_last_error' );
		$order->delete_meta_data( '_phaseone_contract_missing_pdf_reported' );
		$order->add_order_note(
			sprintf(
				'Signed Purchase & Research Use Agreement emailed through WordPress. Evidence ID: %s.',
				$evidence_id
			)
		);
		$order->save();
	} catch ( Throwable $error ) {
		$order->update_meta_data( '_phaseone_contract_email_status', 'failed' );
		$order->update_meta_data(
			'_phaseone_contract_email_failed_at',
			gmdate( 'c' )
		);
		$order->update_meta_data(
			'_phaseone_contract_email_last_error',
			sanitize_text_field( $error->getMessage() )
		);
		$order->add_order_note(
			sprintf(
				'Signed agreement email failed: %s',
				sanitize_text_field( $error->getMessage() )
			)
		);
		$order->save();
	} finally {
		if ( $temp_file && file_exists( $temp_file ) ) {
			wp_delete_file( $temp_file );
		}

		unset( $orders_in_progress[ $order_id ] );
	}
}

add_action( 'woocommerce_payment_complete', 'phaseone_send_paid_order_agreement', 20 );
add_action( 'woocommerce_order_status_processing', 'phaseone_send_paid_order_agreement', 20 );
add_action( 'woocommerce_order_status_completed', 'phaseone_send_paid_order_agreement', 20 );

/**
 * Supports any paid status registered by the active WooCommerce gateway.
 *
 * @param int      $order_id Order ID.
 * @param string   $from_status Previous status.
 * @param string   $to_status New status.
 * @param WC_Order $order Order object.
 * @return void
 */
function phaseone_send_agreement_on_paid_status(
	$order_id,
	$from_status,
	$to_status,
	$order
) {
	unset( $from_status, $to_status );

	if ( $order instanceof WC_Order && $order->is_paid() ) {
		phaseone_send_paid_order_agreement( $order_id );
	}
}

add_action(
	'woocommerce_order_status_changed',
	'phaseone_send_agreement_on_paid_status',
	20,
	4
);

/**
 * Covers the rare case where the agreement metadata is attached immediately
 * after the payment provider has already marked the order as paid.
 *
 * @param int $order_id WooCommerce order ID.
 * @return void
 */
function phaseone_send_agreement_after_order_update( $order_id ) {
	$order = wc_get_order( $order_id );

	if (
		$order instanceof WC_Order &&
		$order->is_paid() &&
		$order->get_meta( '_phaseone_contract_hash', true )
	) {
		phaseone_send_paid_order_agreement( $order_id );
	}
}

add_action(
	'woocommerce_update_order',
	'phaseone_send_agreement_after_order_update',
	50
);

/**
 * Add the agreement dashboard under WooCommerce.
 *
 * @return void
 */
function phaseone_signed_agreements_admin_menu() {
	add_submenu_page(
		'woocommerce',
		'Signed Agreements',
		'Signed Agreements',
		'manage_woocommerce',
		'phaseone-signed-agreements',
		'phaseone_render_signed_agreements_page'
	);
}

add_action( 'admin_menu', 'phaseone_signed_agreements_admin_menu', 40 );

/**
 * Get agreement orders for the dashboard.
 *
 * @param int    $page Page number.
 * @param string $search Search text.
 * @return array
 */
function phaseone_get_agreement_orders_for_admin( $page, $search ) {
	$base_args = array(
		'orderby'    => 'date',
		'order'      => 'DESC',
		'meta_query' => array(
			array(
				'key'     => '_phaseone_contract_hash',
				'compare' => 'EXISTS',
			),
		),
	);

	if ( '' !== $search ) {
		$orders = wc_get_orders(
			array_merge(
				$base_args,
				array(
					'limit' => 250,
				)
			)
		);
		$needle = strtolower( $search );
		$orders = array_values(
			array_filter(
				$orders,
				static function ( $order ) use ( $needle ) {
					$record = phaseone_get_agreement_record( $order );
					$haystack = implode(
						' ',
						array(
							$order->get_id(),
							$order->get_order_number(),
							$order->get_billing_email(),
							$order->get_formatted_billing_full_name(),
							$record['signer']['fullName'] ?? '',
							$order->get_meta( '_phaseone_contract_hash', true ),
						)
					);

					return false !== strpos( strtolower( $haystack ), $needle );
				}
			)
		);

		return array(
			'orders'    => array_slice( $orders, 0, 100 ),
			'total'     => count( $orders ),
			'max_pages' => 1,
		);
	}

	$result = wc_get_orders(
		array_merge(
			$base_args,
			array(
				'limit'    => 25,
				'page'     => max( 1, absint( $page ) ),
				'paginate' => true,
			)
		)
	);

	return array(
		'orders'    => $result->orders ?? array(),
		'total'     => absint( $result->total ?? 0 ),
		'max_pages' => absint( $result->max_num_pages ?? 1 ),
	);
}

/**
 * Render a dashboard badge.
 *
 * @param string $status Status key.
 * @return string
 */
function phaseone_agreement_status_badge( $status ) {
	$labels = array(
		'sent'            => 'Emailed',
		'processing'      => 'Sending',
		'failed'          => 'Failed',
		'missing_pdf'     => 'Missing PDF',
		'pending_payment' => 'Awaiting payment',
	);
	$clean_status = sanitize_key( $status );
	$label = $labels[ $clean_status ] ?? ucwords(
		str_replace( '_', ' ', $clean_status ? $clean_status : 'pending' )
	);

	return sprintf(
		'<span class="phaseone-status phaseone-status--%1$s">%2$s</span>',
		esc_attr( $clean_status ? $clean_status : 'pending' ),
		esc_html( $label )
	);
}

/**
 * Render the agreement dashboard.
 *
 * @return void
 */
function phaseone_render_signed_agreements_page() {
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		wp_die( esc_html__( 'You do not have permission to view this page.' ) );
	}

	$page = isset( $_GET['paged'] ) ? absint( $_GET['paged'] ) : 1;
	$search = isset( $_GET['s'] )
		? sanitize_text_field( wp_unslash( $_GET['s'] ) )
		: '';
	$data = phaseone_get_agreement_orders_for_admin( $page, $search );
	$orders = $data['orders'];
	$sent_count = 0;
	$attention_count = 0;

	foreach ( $orders as $order ) {
		$email_status = (string) $order->get_meta(
			'_phaseone_contract_email_status',
			true
		);

		if ( 'sent' === $email_status ) {
			++$sent_count;
		} elseif ( in_array( $email_status, array( 'failed', 'missing_pdf' ), true ) ) {
			++$attention_count;
		}
	}

	$notice = isset( $_GET['agreement_notice'] )
		? sanitize_key( wp_unslash( $_GET['agreement_notice'] ) )
		: '';
	?>
	<div class="wrap phaseone-agreements">
		<div class="phaseone-hero">
			<div>
				<span class="phaseone-eyebrow">PHASE ONE LABZ</span>
				<h1>Signed Agreements</h1>
				<p>Executed purchase agreements, signature evidence, PDF copies, and delivery status.</p>
			</div>
			<div class="phaseone-version">Plugin v<?php echo esc_html( PHASEONE_SIGNED_AGREEMENTS_VERSION ); ?></div>
		</div>

		<?php if ( 'sent' === $notice ) : ?>
			<div class="notice notice-success is-dismissible"><p>Signed agreement email sent successfully.</p></div>
		<?php elseif ( 'failed' === $notice ) : ?>
			<div class="notice notice-error is-dismissible"><p>The agreement could not be sent. Open the order notes for the exact error.</p></div>
		<?php elseif ( 'not_paid' === $notice ) : ?>
			<div class="notice notice-warning is-dismissible"><p>The agreement was not sent because the order is not paid.</p></div>
		<?php endif; ?>

		<div class="phaseone-stats">
			<div><span>Total agreements</span><strong><?php echo esc_html( number_format_i18n( $data['total'] ) ); ?></strong></div>
			<div><span>Emailed on this page</span><strong><?php echo esc_html( number_format_i18n( $sent_count ) ); ?></strong></div>
			<div><span>Needs attention</span><strong><?php echo esc_html( number_format_i18n( $attention_count ) ); ?></strong></div>
		</div>

		<form method="get" class="phaseone-search">
			<input type="hidden" name="page" value="phaseone-signed-agreements">
			<input
				type="search"
				name="s"
				value="<?php echo esc_attr( $search ); ?>"
				placeholder="Search order, signer, email, or Evidence ID"
			>
			<button type="submit" class="button button-primary">Search</button>
			<?php if ( '' !== $search ) : ?>
				<a class="button" href="<?php echo esc_url( admin_url( 'admin.php?page=phaseone-signed-agreements' ) ); ?>">Clear</a>
			<?php endif; ?>
		</form>

		<div class="phaseone-table-wrap">
			<table class="widefat fixed striped phaseone-table">
				<thead>
					<tr>
						<th>Order</th>
						<th>Customer &amp; signature</th>
						<th>Agreement</th>
						<th>Order details</th>
						<th>Delivery</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
				<?php if ( empty( $orders ) ) : ?>
					<tr><td colspan="6" class="phaseone-empty">No signed agreements found.</td></tr>
				<?php else : ?>
					<?php foreach ( $orders as $order ) : ?>
						<?php
						$order_id = $order->get_id();
						$record = phaseone_get_agreement_record( $order );
						$signer = sanitize_text_field(
							(string) ( $record['signer']['fullName'] ?? $order->get_formatted_billing_full_name() )
						);
						$signature_method = sanitize_key(
							(string) ( $record['signer']['method'] ?? '' )
						);
						$typed_signature = sanitize_text_field(
							(string) ( $record['signer']['typedSignature'] ?? '' )
						);
						$signature_image = (string) $order->get_meta(
							'_phaseone_contract_signature',
							true
						);
						$has_drawn_signature = 1 === preg_match(
							'/^data:image\/png;base64,[a-z0-9+\/=\r\n]+$/i',
							$signature_image
						);
						$evidence_hash = sanitize_text_field(
							(string) $order->get_meta( '_phaseone_contract_hash', true )
						);
						$evidence_id = strtoupper( substr( $evidence_hash, 0, 16 ) );
						$accepted_at = (string) ( $record['acceptedAt'] ?? '' );
						$accepted_timestamp = $accepted_at ? strtotime( $accepted_at ) : false;
						$email_status = (string) $order->get_meta(
							'_phaseone_contract_email_status',
							true
						);
						$sent_at = (string) $order->get_meta(
							'_phaseone_contract_email_sent_at',
							true
						);
						$items = isset( $record['order']['items'] ) && is_array( $record['order']['items'] )
							? $record['order']['items']
							: array();
						$pdf_exists = '' !== phaseone_get_agreement_pdf_base64( $order );
						$pdf_url = wp_nonce_url(
							add_query_arg(
								array(
									'action'   => 'phaseone_contract_pdf',
									'order_id' => $order_id,
								),
								admin_url( 'admin-post.php' )
							),
							'phaseone_contract_pdf_' . $order_id
						);
						$download_url = add_query_arg( 'download', '1', $pdf_url );
						$send_url = wp_nonce_url(
							add_query_arg(
								array(
									'action'   => 'phaseone_contract_send',
									'order_id' => $order_id,
									'force'    => 'sent' === $email_status ? 1 : 0,
								),
								admin_url( 'admin-post.php' )
							),
							'phaseone_contract_send_' . $order_id
						);
						?>
						<tr>
							<td>
								<a class="phaseone-order-number" href="<?php echo esc_url( $order->get_edit_order_url() ); ?>">#<?php echo esc_html( $order->get_order_number() ); ?></a>
								<span><?php echo wp_kses_post( wc_get_order_status_name( $order->get_status() ) ); ?></span>
								<small><?php echo esc_html( $order->get_date_created() ? $order->get_date_created()->date_i18n( 'M j, Y g:i a' ) : '' ); ?></small>
							</td>
							<td>
								<strong><?php echo esc_html( $signer ); ?></strong>
								<a href="mailto:<?php echo esc_attr( $order->get_billing_email() ); ?>"><?php echo esc_html( $order->get_billing_email() ); ?></a>
								<div class="phaseone-signature">
									<?php if ( $has_drawn_signature ) : ?>
										<img loading="lazy" src="<?php echo esc_attr( $signature_image ); ?>" alt="Signature by <?php echo esc_attr( $signer ); ?>">
									<?php else : ?>
										<em><?php echo esc_html( $typed_signature ? $typed_signature : $signer ); ?></em>
									<?php endif; ?>
								</div>
								<small><?php echo esc_html( $signature_method ? ucfirst( $signature_method ) . ' signature' : 'Electronic signature' ); ?></small>
							</td>
							<td>
								<code><?php echo esc_html( $evidence_id ); ?></code>
								<span><?php echo esc_html( $accepted_timestamp ? wp_date( 'M j, Y g:i a', $accepted_timestamp ) : 'Date unavailable' ); ?></span>
								<small><?php echo esc_html( (string) ( $record['contractVersion'] ?? '' ) ); ?></small>
							</td>
							<td>
								<strong><?php echo wp_kses_post( $order->get_formatted_order_total() ); ?></strong>
								<span><?php echo esc_html( $order->get_payment_method_title() ); ?></span>
								<details>
									<summary><?php echo esc_html( count( $items ) ); ?> product(s)</summary>
									<ul>
										<?php foreach ( $items as $item ) : ?>
											<li><?php echo esc_html( (string) ( $item['name'] ?? 'Catalog item' ) ); ?> &times; <?php echo esc_html( absint( $item['quantity'] ?? 1 ) ); ?></li>
										<?php endforeach; ?>
									</ul>
								</details>
							</td>
							<td>
								<?php echo wp_kses_post( phaseone_agreement_status_badge( $email_status ) ); ?>
								<?php if ( $sent_at ) : ?>
									<small><?php echo esc_html( wp_date( 'M j, Y g:i a', strtotime( $sent_at ) ) ); ?></small>
								<?php endif; ?>
								<small><?php echo $pdf_exists ? 'PDF ready' : 'PDF unavailable'; ?></small>
							</td>
							<td>
								<div class="phaseone-actions">
									<?php if ( $pdf_exists ) : ?>
										<a class="button button-primary" target="_blank" rel="noopener noreferrer" href="<?php echo esc_url( $pdf_url ); ?>">View PDF</a>
										<a class="button" href="<?php echo esc_url( $download_url ); ?>">Download</a>
									<?php endif; ?>
									<?php if ( $order->is_paid() && $pdf_exists ) : ?>
										<a
											class="button phaseone-send"
											href="<?php echo esc_url( $send_url ); ?>"
											data-confirm="<?php echo esc_attr( 'sent' === $email_status ? 'Resend this signed agreement to the customer?' : 'Send this signed agreement to the customer now?' ); ?>"
										><?php echo 'sent' === $email_status ? 'Resend email' : 'Send email'; ?></a>
									<?php endif; ?>
								</div>
							</td>
						</tr>
					<?php endforeach; ?>
				<?php endif; ?>
				</tbody>
			</table>
		</div>

		<?php if ( $data['max_pages'] > 1 ) : ?>
			<div class="tablenav"><div class="tablenav-pages">
				<?php
				echo wp_kses_post(
					paginate_links(
						array(
							'base'    => add_query_arg( 'paged', '%#%' ),
							'format'  => '',
							'current' => max( 1, $page ),
							'total'   => $data['max_pages'],
						)
					)
				);
				?>
			</div></div>
		<?php endif; ?>
	</div>

	<style>
		.phaseone-agreements{max-width:1500px}.phaseone-hero{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;margin:22px 0 18px;padding:26px 28px;border-radius:18px;background:linear-gradient(135deg,#071426,#0b2440);color:#fff;box-shadow:0 14px 35px rgba(3,15,30,.18)}.phaseone-hero h1{margin:5px 0 8px;color:#fff;font-size:28px}.phaseone-hero p{margin:0;color:#9db3ca}.phaseone-eyebrow{color:#60a5fa;font-size:10px;font-weight:800;letter-spacing:.16em}.phaseone-version{border:1px solid rgba(147,197,253,.24);border-radius:999px;background:rgba(37,99,235,.15);padding:7px 11px;color:#bfdbfe;font-size:11px;font-weight:700}.phaseone-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:16px}.phaseone-stats>div{display:flex;align-items:center;justify-content:space-between;border:1px solid #dce4ee;border-radius:13px;background:#fff;padding:15px 17px}.phaseone-stats span{color:#66758a;font-size:12px;font-weight:600}.phaseone-stats strong{color:#0f2742;font-size:21px}.phaseone-search{display:flex;gap:8px;margin:0 0 16px}.phaseone-search input[type=search]{width:min(440px,100%);min-height:36px}.phaseone-table-wrap{overflow:auto;border:1px solid #dce4ee;border-radius:14px;background:#fff;box-shadow:0 8px 22px rgba(15,39,66,.06)}.phaseone-table{border:0;box-shadow:none}.phaseone-table th{padding:13px 12px;color:#526377;font-size:11px;text-transform:uppercase;letter-spacing:.05em}.phaseone-table td{padding:14px 12px;vertical-align:top}.phaseone-table td>*{display:block;margin-bottom:6px}.phaseone-table td>a{word-break:break-word}.phaseone-table td small{color:#748398}.phaseone-order-number{color:#1d4ed8;font-size:15px;font-weight:800}.phaseone-signature{display:flex!important;width:145px;height:50px;align-items:center;margin:9px 0!important;border:1px dashed #c9d5e3;border-radius:8px;background:#f8fafc;padding:4px 8px;overflow:hidden}.phaseone-signature img{max-width:100%;max-height:45px}.phaseone-signature em{overflow:hidden;color:#1d3557;font-family:"Brush Script MT","Segoe Script",cursive;font-size:22px;white-space:nowrap;text-overflow:ellipsis}.phaseone-table code{display:inline-block;width:max-content;border-radius:6px;background:#edf5ff;padding:4px 6px;color:#1d4ed8;font-weight:700}.phaseone-table details{margin-top:9px}.phaseone-table summary{cursor:pointer;color:#35618e;font-size:11px;font-weight:700}.phaseone-table ul{margin:8px 0 0 17px}.phaseone-status{display:inline-block!important;width:max-content;border-radius:999px;padding:5px 8px;font-size:10px;font-weight:800}.phaseone-status--sent{background:#dcfce7;color:#166534}.phaseone-status--failed,.phaseone-status--missing_pdf{background:#fee2e2;color:#991b1b}.phaseone-status--processing{background:#dbeafe;color:#1d4ed8}.phaseone-status--pending_payment,.phaseone-status--pending{background:#fef3c7;color:#92400e}.phaseone-actions{display:flex!important;min-width:120px;flex-direction:column;gap:6px}.phaseone-actions .button{margin:0;text-align:center}.phaseone-empty{padding:42px!important;color:#64748b;text-align:center}.tablenav-pages{margin-top:12px}.tablenav-pages .page-numbers{display:inline-block;margin-left:4px;border:1px solid #ccd7e3;border-radius:6px;background:#fff;padding:5px 9px;text-decoration:none}.tablenav-pages .current{background:#1d4ed8;color:#fff}@media(max-width:900px){.phaseone-stats{grid-template-columns:1fr}.phaseone-hero{flex-direction:column}.phaseone-table{min-width:1100px}}
	</style>
	<script>
		document.addEventListener("click", function (event) {
			const link = event.target.closest(".phaseone-send");
			if (link && !window.confirm(link.dataset.confirm || "Continue?")) {
				event.preventDefault();
			}
		});
	</script>
	<?php
}

/**
 * Securely display or download an agreement PDF.
 *
 * @return void
 */
function phaseone_admin_contract_pdf() {
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		wp_die(
			esc_html__( 'You do not have permission to access this PDF.' ),
			'',
			array( 'response' => 403 )
		);
	}

	$order_id = isset( $_GET['order_id'] ) ? absint( $_GET['order_id'] ) : 0;
	check_admin_referer( 'phaseone_contract_pdf_' . $order_id );
	$order = wc_get_order( $order_id );

	if ( ! $order instanceof WC_Order ) {
		wp_die( esc_html__( 'Order not found.' ), '', array( 'response' => 404 ) );
	}

	$pdf_bytes = base64_decode(
		phaseone_get_agreement_pdf_base64( $order ),
		true
	);

	if (
		false === $pdf_bytes ||
		0 !== strpos( $pdf_bytes, '%PDF-' ) ||
		strlen( $pdf_bytes ) > 2 * MB_IN_BYTES
	) {
		wp_die(
			esc_html__( 'The signed agreement PDF is unavailable.' ),
			'',
			array( 'response' => 404 )
		);
	}

	$filename = sanitize_file_name(
		(string) $order->get_meta( '_phaseone_contract_pdf_filename', true )
	);
	$filename = $filename
		? $filename
		: 'Phase-One-Labz-Signed-Agreement-' . $order_id . '.pdf';
	$disposition = ! empty( $_GET['download'] ) ? 'attachment' : 'inline';

	while ( ob_get_level() ) {
		ob_end_clean();
	}

	nocache_headers();
	header( 'Content-Type: application/pdf' );
	header( 'X-Content-Type-Options: nosniff' );
	header( 'Content-Length: ' . strlen( $pdf_bytes ) );
	header(
		sprintf(
			'Content-Disposition: %s; filename="%s"',
			$disposition,
			$filename
		)
	);
	echo $pdf_bytes; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
	exit;
}

add_action( 'admin_post_phaseone_contract_pdf', 'phaseone_admin_contract_pdf' );

/**
 * Send or explicitly resend an agreement from the dashboard.
 *
 * @return void
 */
function phaseone_admin_send_contract() {
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		wp_die(
			esc_html__( 'You do not have permission to send agreements.' ),
			'',
			array( 'response' => 403 )
		);
	}

	$order_id = isset( $_GET['order_id'] ) ? absint( $_GET['order_id'] ) : 0;
	check_admin_referer( 'phaseone_contract_send_' . $order_id );
	$order = wc_get_order( $order_id );
	$result = 'failed';

	if ( $order instanceof WC_Order && $order->is_paid() ) {
		if ( ! empty( $_GET['force'] ) ) {
			$order->delete_meta_data( '_phaseone_contract_email_sent_at' );
			$order->update_meta_data( '_phaseone_contract_email_status', 'pending_payment' );
			$order->save_meta_data();
		}

		phaseone_send_paid_order_agreement( $order_id );
		$order = wc_get_order( $order_id );
		$result = $order->get_meta( '_phaseone_contract_email_sent_at', true )
			? 'sent'
			: 'failed';
	} elseif ( $order instanceof WC_Order ) {
		$result = 'not_paid';
	}

	wp_safe_redirect(
		add_query_arg(
			'agreement_notice',
			$result,
			admin_url( 'admin.php?page=phaseone-signed-agreements' )
		)
	);
	exit;
}

add_action(
	'admin_post_phaseone_contract_send',
	'phaseone_admin_send_contract'
);
