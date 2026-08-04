<?php
/**
 * Plugin Name: Phase One Labz - Order Evidence
 * Description: Private, encrypted packaging photos for WooCommerce orders with a mobile capture console and customer account gallery.
 * Version: 1.0.0
 * Author: Phase One Labz
 * Requires Plugins: woocommerce
 * Requires PHP: 7.4
 */

defined( 'ABSPATH' ) || exit;

define( 'PHASEONE_ORDER_EVIDENCE_VERSION', '1.0.0' );
define( 'PHASEONE_ORDER_EVIDENCE_META_KEY', '_phaseone_order_evidence' );
define( 'PHASEONE_ORDER_EVIDENCE_MAX_UPLOAD', 12 * MB_IN_BYTES );

add_action(
	'before_woocommerce_init',
	static function () {
		$features_class = '\\Automattic\\WooCommerce\\Utilities\\FeaturesUtil';
		if ( class_exists( $features_class ) ) {
			$features_class::declare_compatibility( 'custom_order_tables', __FILE__, true );
		}
	}
);

/**
 * Return the encrypted evidence storage directory.
 *
 * Files contain ciphertext only. The deny files are an additional defense for
 * Apache/IIS installations; authenticated PHP streaming is the only supported
 * way to read an image.
 *
 * @return string
 */
function phaseone_order_evidence_storage_dir() {
	$uploads = wp_upload_dir();
	return trailingslashit( $uploads['basedir'] ) . 'phaseone-private-order-evidence';
}

/**
 * Prepare private storage.
 *
 * @return bool
 */
function phaseone_order_evidence_prepare_storage() {
	$directory = phaseone_order_evidence_storage_dir();
	if ( ! wp_mkdir_p( $directory ) ) {
		return false;
	}

	$guards = array(
		'index.php'   => "<?php\n// Silence is golden.\n",
		'.htaccess'   => "Require all denied\nDeny from all\n",
		'web.config'  => "<?xml version=\"1.0\" encoding=\"UTF-8\"?><configuration><system.webServer><security><authorization><remove users=\"*\" roles=\"\" verbs=\"\"/><add accessType=\"Deny\" users=\"*\"/></authorization></security></system.webServer></configuration>",
	);

	foreach ( $guards as $name => $contents ) {
		$path = trailingslashit( $directory ) . $name;
		if ( ! file_exists( $path ) ) {
			file_put_contents( $path, $contents ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
		}
	}

	return true;
}

function phaseone_order_evidence_activate() {
	phaseone_order_evidence_prepare_storage();
	set_transient( 'phaseone_order_evidence_activated', 'yes', 5 * MINUTE_IN_SECONDS );
}
register_activation_hook( __FILE__, 'phaseone_order_evidence_activate' );

add_action(
	'admin_notices',
	static function () {
		if ( 'yes' !== get_transient( 'phaseone_order_evidence_activated' ) ) {
			return;
		}
		delete_transient( 'phaseone_order_evidence_activated' );
		echo '<div class="notice notice-success is-dismissible"><p><strong>Phase One Order Evidence is active.</strong> Open WooCommerce &rarr; Order Evidence from a phone to capture packaging photos.</p></div>';
	}
);

/**
 * Stable 256-bit key derived from the private WordPress installation keys.
 *
 * @return string Raw key bytes.
 */
function phaseone_order_evidence_key() {
	$material = wp_salt( 'auth' ) . '|' . wp_salt( 'secure_auth' );
	return hash_hmac( 'sha256', 'phaseone-order-evidence-v1', $material, true );
}

/**
 * Encrypt image bytes using Sodium when available and AES-256-GCM otherwise.
 *
 * @param string $plaintext Image bytes.
 * @return string|WP_Error
 */
function phaseone_order_evidence_encrypt( $plaintext ) {
	$key = phaseone_order_evidence_key();
	if ( function_exists( 'sodium_crypto_secretbox' ) ) {
		$nonce = random_bytes( SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
		return 'POE1S' . $nonce . sodium_crypto_secretbox( $plaintext, $nonce, $key );
	}

	if ( function_exists( 'openssl_encrypt' ) ) {
		$nonce = random_bytes( 12 );
		$tag   = '';
		$data  = openssl_encrypt( $plaintext, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $nonce, $tag );
		if ( false !== $data ) {
			return 'POE1G' . $nonce . $tag . $data;
		}
	}

	return new WP_Error( 'encryption_unavailable', 'The server does not provide a supported encryption engine.' );
}

/**
 * Decrypt stored evidence.
 *
 * @param string $payload Encrypted bytes.
 * @return string|WP_Error
 */
function phaseone_order_evidence_decrypt( $payload ) {
	$header = substr( $payload, 0, 5 );
	$key    = phaseone_order_evidence_key();

	if ( 'POE1S' === $header && function_exists( 'sodium_crypto_secretbox_open' ) ) {
		$nonce = substr( $payload, 5, SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
		$data  = substr( $payload, 5 + SODIUM_CRYPTO_SECRETBOX_NONCEBYTES );
		$plain = sodium_crypto_secretbox_open( $data, $nonce, $key );
		return false === $plain ? new WP_Error( 'invalid_evidence', 'The evidence file could not be decrypted.' ) : $plain;
	}

	if ( 'POE1G' === $header && function_exists( 'openssl_decrypt' ) ) {
		$nonce = substr( $payload, 5, 12 );
		$tag   = substr( $payload, 17, 16 );
		$data  = substr( $payload, 33 );
		$plain = openssl_decrypt( $data, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $nonce, $tag );
		return false === $plain ? new WP_Error( 'invalid_evidence', 'The evidence file could not be decrypted.' ) : $plain;
	}

	return new WP_Error( 'invalid_evidence', 'The evidence file has an unsupported format.' );
}

/**
 * Read evidence records from an HPOS-compatible WooCommerce order.
 *
 * @param WC_Order $order Order.
 * @return array
 */
function phaseone_order_evidence_records( $order ) {
	if ( ! $order instanceof WC_Order ) {
		return array();
	}
	$records = $order->get_meta( PHASEONE_ORDER_EVIDENCE_META_KEY, true );
	return is_array( $records ) ? array_values( array_filter( $records, 'is_array' ) ) : array();
}

/**
 * Locate one record by UUID.
 *
 * @param WC_Order $order Order.
 * @param string   $evidence_id Evidence UUID.
 * @return array
 */
function phaseone_order_evidence_find( $order, $evidence_id ) {
	foreach ( phaseone_order_evidence_records( $order ) as $record ) {
		if ( isset( $record['id'] ) && hash_equals( (string) $record['id'], (string) $evidence_id ) ) {
			return $record;
		}
	}
	return array();
}

/**
 * Validate and normalize a camera image.
 *
 * @param array $file REST upload entry.
 * @return array|WP_Error
 */
function phaseone_order_evidence_prepare_image( $file ) {
	if ( empty( $file['tmp_name'] ) || ! is_uploaded_file( $file['tmp_name'] ) ) {
		return new WP_Error( 'invalid_upload', 'No valid camera image was received.' );
	}
	if ( ! empty( $file['error'] ) ) {
		return new WP_Error( 'upload_failed', 'The image upload did not complete.' );
	}
	if ( empty( $file['size'] ) || (int) $file['size'] > PHASEONE_ORDER_EVIDENCE_MAX_UPLOAD ) {
		return new WP_Error( 'upload_too_large', 'Each image must be 12 MB or smaller.' );
	}

	$image_info = @getimagesize( $file['tmp_name'] ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
	$allowed    = array( 'image/jpeg', 'image/png', 'image/webp' );
	if ( ! is_array( $image_info ) || ! in_array( $image_info['mime'], $allowed, true ) ) {
		return new WP_Error( 'unsupported_image', 'Use a JPEG, PNG, or WebP image.' );
	}

	require_once ABSPATH . 'wp-admin/includes/image.php';
	$editor = wp_get_image_editor( $file['tmp_name'] );
	if ( ! is_wp_error( $editor ) ) {
		if ( is_callable( array( $editor, 'maybe_exif_rotate' ) ) ) {
			$editor->maybe_exif_rotate();
		}
		$size = $editor->get_size();
		if ( max( (int) $size['width'], (int) $size['height'] ) > 2200 ) {
			$editor->resize( 2200, 2200, false );
		}
		$editor->set_quality( 86 );
		$temp = wp_tempnam( 'phaseone-order-evidence.jpg' );
		if ( $temp ) {
			$saved = $editor->save( $temp, 'image/jpeg' );
			if ( ! is_wp_error( $saved ) && file_exists( $saved['path'] ) ) {
				$bytes = file_get_contents( $saved['path'] ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
				@unlink( $saved['path'] ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged,WordPress.WP.AlternativeFunctions.unlink_unlink
				if ( false !== $bytes ) {
					return array(
						'bytes'  => $bytes,
						'mime'   => 'image/jpeg',
						'width'  => (int) $saved['width'],
						'height' => (int) $saved['height'],
					);
				}
			}
			@unlink( $temp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged,WordPress.WP.AlternativeFunctions.unlink_unlink
		}
	}

	$bytes = file_get_contents( $file['tmp_name'] ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	if ( false === $bytes ) {
		return new WP_Error( 'image_read_failed', 'The camera image could not be read.' );
	}
	return array(
		'bytes'  => $bytes,
		'mime'   => $image_info['mime'],
		'width'  => (int) $image_info[0],
		'height' => (int) $image_info[1],
	);
}

/**
 * Public-safe metadata returned to a customer or operator.
 *
 * @param array $record Stored record.
 * @return array
 */
function phaseone_order_evidence_public_record( $record ) {
	return array(
		'id'               => sanitize_text_field( isset( $record['id'] ) ? $record['id'] : '' ),
		'label'            => sanitize_text_field( isset( $record['label'] ) ? $record['label'] : 'Package evidence' ),
		'captured_at'      => sanitize_text_field( isset( $record['captured_at'] ) ? $record['captured_at'] : '' ),
		'width'            => absint( isset( $record['width'] ) ? $record['width'] : 0 ),
		'height'           => absint( isset( $record['height'] ) ? $record['height'] : 0 ),
		'customer_visible' => ! empty( $record['customer_visible'] ),
	);
}

/**
 * Compact staff-facing order data.
 *
 * @param WC_Order $order Order.
 * @return array
 */
function phaseone_order_evidence_order_payload( $order ) {
	$items = array();
	foreach ( $order->get_items() as $item ) {
		$items[] = array(
			'name'     => $item->get_name(),
			'quantity' => $item->get_quantity(),
		);
	}

	return array(
		'id'         => $order->get_id(),
		'number'     => $order->get_order_number(),
		'status'     => $order->get_status(),
		'date'       => $order->get_date_created() ? $order->get_date_created()->date( 'c' ) : '',
		'customer'   => trim( $order->get_formatted_billing_full_name() ),
		'email'      => $order->get_billing_email(),
		'items'      => $items,
		'evidence'   => array_map( 'phaseone_order_evidence_public_record', phaseone_order_evidence_records( $order ) ),
	);
}

function phaseone_order_evidence_staff_permission() {
	return current_user_can( 'manage_woocommerce' );
}

/**
 * Search by order ID/number or exact billing email.
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response|WP_Error
 */
function phaseone_order_evidence_search_orders( $request ) {
	$search = trim( sanitize_text_field( (string) $request->get_param( 'search' ) ) );
	if ( '' === $search ) {
		return new WP_Error( 'search_required', 'Enter an order number or customer email.', array( 'status' => 400 ) );
	}

	$orders = array();
	if ( ctype_digit( ltrim( $search, '#' ) ) ) {
		$order = wc_get_order( absint( ltrim( $search, '#' ) ) );
		if ( $order instanceof WC_Order ) {
			$orders[] = $order;
		}
	} elseif ( is_email( $search ) ) {
		$orders = wc_get_orders(
			array(
				'billing_email' => sanitize_email( $search ),
				'limit'         => 12,
				'orderby'       => 'date',
				'order'         => 'DESC',
			)
		);
	}

	return rest_ensure_response( array_map( 'phaseone_order_evidence_order_payload', $orders ) );
}

function phaseone_order_evidence_get_order( $request ) {
	$order = wc_get_order( absint( $request['id'] ) );
	return $order instanceof WC_Order
		? rest_ensure_response( phaseone_order_evidence_order_payload( $order ) )
		: new WP_Error( 'order_not_found', 'Order not found.', array( 'status' => 404 ) );
}

/**
 * Upload one encrypted photo.
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response|WP_Error
 */
function phaseone_order_evidence_upload( $request ) {
	$order = wc_get_order( absint( $request['id'] ) );
	if ( ! $order instanceof WC_Order ) {
		return new WP_Error( 'order_not_found', 'Order not found.', array( 'status' => 404 ) );
	}

	$files = $request->get_file_params();
	if ( empty( $files['photo'] ) ) {
		return new WP_Error( 'photo_required', 'Choose or capture a photo first.', array( 'status' => 400 ) );
	}

	$image = phaseone_order_evidence_prepare_image( $files['photo'] );
	if ( is_wp_error( $image ) ) {
		$image->add_data( array( 'status' => 400 ) );
		return $image;
	}

	$encrypted = phaseone_order_evidence_encrypt( $image['bytes'] );
	if ( is_wp_error( $encrypted ) ) {
		$encrypted->add_data( array( 'status' => 500 ) );
		return $encrypted;
	}
	if ( ! phaseone_order_evidence_prepare_storage() ) {
		return new WP_Error( 'storage_unavailable', 'Private evidence storage is not writable.', array( 'status' => 500 ) );
	}

	$id       = wp_generate_uuid4();
	$relative = gmdate( 'Y/m' ) . '/' . $id . '.poe';
	$path     = trailingslashit( phaseone_order_evidence_storage_dir() ) . $relative;
	if ( ! wp_mkdir_p( dirname( $path ) ) || false === file_put_contents( $path, $encrypted, LOCK_EX ) ) { // phpcs:ignore WordPress.WP.AlternativeFunctions.file_system_operations_file_put_contents
		return new WP_Error( 'storage_failed', 'The encrypted image could not be stored.', array( 'status' => 500 ) );
	}

	$label   = sanitize_text_field( (string) $request->get_param( 'label' ) );
	$records = phaseone_order_evidence_records( $order );
	$record  = array(
		'id'               => $id,
		'label'            => $label ? $label : 'Package overview',
		'captured_at'      => gmdate( 'c' ),
		'captured_by'      => get_current_user_id(),
		'customer_visible' => filter_var( $request->get_param( 'customer_visible' ), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE ) !== false,
		'mime'             => $image['mime'],
		'width'            => $image['width'],
		'height'           => $image['height'],
		'bytes'            => strlen( $image['bytes'] ),
		'sha256'           => hash( 'sha256', $image['bytes'] ),
		'path'             => $relative,
	);
	$records[] = $record;
	$order->update_meta_data( PHASEONE_ORDER_EVIDENCE_META_KEY, $records );
	$order->add_order_note( sprintf( 'Packaging evidence added: %s (private encrypted image).', $record['label'] ) );
	$order->save();

	return new WP_REST_Response( phaseone_order_evidence_order_payload( $order ), 201 );
}

/**
 * Delete one evidence image and its record.
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response|WP_Error
 */
function phaseone_order_evidence_delete( $request ) {
	$order = wc_get_order( absint( $request['id'] ) );
	if ( ! $order instanceof WC_Order ) {
		return new WP_Error( 'order_not_found', 'Order not found.', array( 'status' => 404 ) );
	}

	$target    = sanitize_text_field( (string) $request['evidence'] );
	$remaining = array();
	$deleted   = array();
	foreach ( phaseone_order_evidence_records( $order ) as $record ) {
		if ( isset( $record['id'] ) && hash_equals( (string) $record['id'], $target ) ) {
			$deleted = $record;
			continue;
		}
		$remaining[] = $record;
	}
	if ( empty( $deleted ) ) {
		return new WP_Error( 'evidence_not_found', 'Evidence image not found.', array( 'status' => 404 ) );
	}

	$relative = isset( $deleted['path'] ) ? ltrim( str_replace( '\\', '/', $deleted['path'] ), '/' ) : '';
	if ( $relative && false === strpos( $relative, '..' ) ) {
		$path = trailingslashit( phaseone_order_evidence_storage_dir() ) . $relative;
		if ( file_exists( $path ) ) {
			@unlink( $path ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged,WordPress.WP.AlternativeFunctions.unlink_unlink
		}
	}

	$order->update_meta_data( PHASEONE_ORDER_EVIDENCE_META_KEY, $remaining );
	$order->add_order_note( sprintf( 'Packaging evidence removed: %s.', isset( $deleted['label'] ) ? $deleted['label'] : $target ) );
	$order->save();
	return rest_ensure_response( phaseone_order_evidence_order_payload( $order ) );
}

/**
 * Recursively locate account identity fields returned by the existing lab API.
 *
 * @param mixed $node Account response.
 * @param int   $depth Current depth.
 * @return array
 */
function phaseone_order_evidence_extract_identity( $node, $depth = 0 ) {
	if ( ! is_array( $node ) || $depth > 5 ) {
		return array();
	}
	$id    = 0;
	$email = '';
	foreach ( array( 'id', 'user_id', 'customer_id' ) as $key ) {
		if ( ! empty( $node[ $key ] ) && is_numeric( $node[ $key ] ) ) {
			$id = absint( $node[ $key ] );
			break;
		}
	}
	foreach ( array( 'email', 'user_email', 'billing_email' ) as $key ) {
		if ( ! empty( $node[ $key ] ) && is_email( $node[ $key ] ) ) {
			$email = sanitize_email( $node[ $key ] );
			break;
		}
	}
	$is_user_record = $email || isset( $node['first_name'] ) || isset( $node['last_name'] ) || isset( $node['display_name'] ) || isset( $node['username'] );
	if ( $is_user_record && ( $id || $email ) ) {
		return array( 'id' => $id, 'email' => $email );
	}

	foreach ( array( 'user', 'account', 'customer', 'profile', 'data' ) as $preferred_key ) {
		if ( isset( $node[ $preferred_key ] ) ) {
			$identity = phaseone_order_evidence_extract_identity( $node[ $preferred_key ], $depth + 1 );
			if ( ! empty( $identity ) ) {
				return $identity;
			}
		}
	}

	foreach ( $node as $key => $child ) {
		if ( in_array( $key, array( 'recent_orders', 'orders', 'tracking', 'items' ), true ) ) {
			continue;
		}
		$identity = phaseone_order_evidence_extract_identity( $child, $depth + 1 );
		if ( ! empty( $identity ) ) {
			return $identity;
		}
	}
	return array();
}

/**
 * Reuse the site's existing Bearer-token account endpoint as the authority.
 *
 * @param WP_REST_Request $request Evidence request.
 * @return array
 */
function phaseone_order_evidence_token_identity( $request ) {
	static $cache = array();
	$authorization = (string) $request->get_header( 'authorization' );
	if ( ! preg_match( '/^Bearer\s+\S+$/i', $authorization ) ) {
		return array();
	}
	$key = hash( 'sha256', $authorization );
	if ( isset( $cache[ $key ] ) ) {
		return $cache[ $key ];
	}

	$account_request = new WP_REST_Request( 'GET', '/lab/v1/account-token' );
	$account_request->set_header( 'authorization', $authorization );
	$response = rest_do_request( $account_request );
	if ( is_wp_error( $response ) || $response->get_status() >= 400 ) {
		$cache[ $key ] = array();
		return array();
	}
	$cache[ $key ] = phaseone_order_evidence_extract_identity( $response->get_data() );
	return $cache[ $key ];
}

/**
 * Only staff or the owning authenticated customer may read an image.
 *
 * @param WP_REST_Request $request Request.
 * @return bool|WP_Error
 */
function phaseone_order_evidence_view_permission( $request ) {
	if ( current_user_can( 'manage_woocommerce' ) ) {
		return true;
	}
	$order = wc_get_order( absint( $request['order'] ) );
	if ( ! $order instanceof WC_Order ) {
		return new WP_Error( 'order_not_found', 'Order not found.', array( 'status' => 404 ) );
	}
	$identity = phaseone_order_evidence_token_identity( $request );
	$owns_by_id = ! empty( $identity['id'] ) && (int) $order->get_customer_id() === (int) $identity['id'];
	$owns_by_email = ! empty( $identity['email'] ) && hash_equals( strtolower( $order->get_billing_email() ), strtolower( $identity['email'] ) );
	return ( $owns_by_id || $owns_by_email )
		? true
		: new WP_Error( 'evidence_forbidden', 'You cannot view evidence for this order.', array( 'status' => 403 ) );
}

/**
 * Return a response that rest_pre_serve_request will stream as binary.
 *
 * @param WP_REST_Request $request Request.
 * @return WP_REST_Response|WP_Error
 */
function phaseone_order_evidence_stream( $request ) {
	$order  = wc_get_order( absint( $request['order'] ) );
	$record = $order instanceof WC_Order ? phaseone_order_evidence_find( $order, sanitize_text_field( (string) $request['evidence'] ) ) : array();
	if ( empty( $record ) || ( ! current_user_can( 'manage_woocommerce' ) && empty( $record['customer_visible'] ) ) ) {
		return new WP_Error( 'evidence_not_found', 'Evidence image not found.', array( 'status' => 404 ) );
	}

	$relative = isset( $record['path'] ) ? ltrim( str_replace( '\\', '/', $record['path'] ), '/' ) : '';
	if ( ! $relative || false !== strpos( $relative, '..' ) ) {
		return new WP_Error( 'invalid_evidence_path', 'Evidence storage record is invalid.', array( 'status' => 500 ) );
	}
	$path = trailingslashit( phaseone_order_evidence_storage_dir() ) . $relative;
	if ( ! file_exists( $path ) ) {
		return new WP_Error( 'evidence_missing', 'Evidence file is missing.', array( 'status' => 404 ) );
	}
	$payload = file_get_contents( $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	$bytes   = false === $payload ? new WP_Error( 'evidence_read_failed', 'Evidence could not be read.' ) : phaseone_order_evidence_decrypt( $payload );
	if ( is_wp_error( $bytes ) ) {
		return $bytes;
	}

	$response = new WP_REST_Response( array( '_phaseone_binary' => $bytes ), 200 );
	$response->header( 'Content-Type', isset( $record['mime'] ) ? $record['mime'] : 'image/jpeg' );
	$response->header( 'Content-Length', strlen( $bytes ) );
	$response->header( 'Content-Disposition', 'inline; filename="order-evidence-' . sanitize_file_name( $record['id'] ) . '.jpg"' );
	$response->header( 'Cache-Control', 'private, no-store, max-age=0' );
	$response->header( 'X-Content-Type-Options', 'nosniff' );
	return $response;
}

add_filter(
	'rest_pre_serve_request',
	static function ( $served, $result, $request ) {
		if ( 0 !== strpos( $request->get_route(), '/phaseone/v1/order-evidence/' ) || ! $result instanceof WP_REST_Response ) {
			return $served;
		}
		$data = $result->get_data();
		if ( is_array( $data ) && array_key_exists( '_phaseone_binary', $data ) ) {
			echo $data['_phaseone_binary']; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
			return true;
		}
		return $served;
	},
	10,
	3
);

/**
 * Add customer-visible evidence metadata to all recent_orders arrays returned
 * by the existing account-token endpoint. No bytes or storage paths are exposed.
 *
 * @param mixed $node Response node, by reference.
 * @param int   $depth Traversal depth.
 * @return void
 */
function phaseone_order_evidence_enrich_recent_orders( &$node, $depth = 0 ) {
	if ( ! is_array( $node ) || $depth > 6 ) {
		return;
	}
	foreach ( $node as $key => &$value ) {
		if ( 'recent_orders' === $key && is_array( $value ) ) {
			foreach ( $value as &$order_data ) {
				if ( ! is_array( $order_data ) ) {
					continue;
				}
				$order_id = absint( isset( $order_data['id'] ) ? $order_data['id'] : ( isset( $order_data['order_id'] ) ? $order_data['order_id'] : 0 ) );
				$order    = $order_id ? wc_get_order( $order_id ) : false;
				$visible  = array();
				if ( $order instanceof WC_Order ) {
					foreach ( phaseone_order_evidence_records( $order ) as $record ) {
						if ( ! empty( $record['customer_visible'] ) ) {
							$visible[] = phaseone_order_evidence_public_record( $record );
						}
					}
				}
				$order_data['packaging_evidence']       = $visible;
				$order_data['packaging_evidence_ready'] = ! empty( $visible );
			}
			unset( $order_data );
		} else {
			phaseone_order_evidence_enrich_recent_orders( $value, $depth + 1 );
		}
	}
	unset( $value );
}

add_filter(
	'rest_post_dispatch',
	static function ( $response, $server, $request ) {
		if ( '/lab/v1/account-token' !== $request->get_route() || ! $response instanceof WP_REST_Response || $response->get_status() >= 400 ) {
			return $response;
		}
		$data = $response->get_data();
		phaseone_order_evidence_enrich_recent_orders( $data );
		$response->set_data( $data );
		return $response;
	},
	20,
	3
);

add_action(
	'rest_api_init',
	static function () {
		register_rest_route(
			'phaseone/v1',
			'/order-evidence/orders',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => 'phaseone_order_evidence_staff_permission',
				'callback'            => 'phaseone_order_evidence_search_orders',
			)
		);
		register_rest_route(
			'phaseone/v1',
			'/order-evidence/orders/(?P<id>\d+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => 'phaseone_order_evidence_staff_permission',
				'callback'            => 'phaseone_order_evidence_get_order',
			)
		);
		register_rest_route(
			'phaseone/v1',
			'/order-evidence/orders/(?P<id>\d+)/upload',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'permission_callback' => 'phaseone_order_evidence_staff_permission',
				'callback'            => 'phaseone_order_evidence_upload',
			)
		);
		register_rest_route(
			'phaseone/v1',
			'/order-evidence/orders/(?P<id>\d+)/(?P<evidence>[a-f0-9-]+)',
			array(
				'methods'             => WP_REST_Server::DELETABLE,
				'permission_callback' => 'phaseone_order_evidence_staff_permission',
				'callback'            => 'phaseone_order_evidence_delete',
			)
		);
		register_rest_route(
			'phaseone/v1',
			'/order-evidence/(?P<order>\d+)/(?P<evidence>[a-f0-9-]+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => 'phaseone_order_evidence_view_permission',
				'callback'            => 'phaseone_order_evidence_stream',
			)
		);
	}
);

/** Admin capture console. */
add_action(
	'admin_menu',
	static function () {
		add_submenu_page(
			'woocommerce',
			'Order Evidence',
			'Order Evidence',
			'manage_woocommerce',
			'phaseone-order-evidence',
			'phaseone_order_evidence_render_admin'
		);
	}
);

add_action(
	'admin_enqueue_scripts',
	static function ( $hook ) {
		if ( 'woocommerce_page_phaseone-order-evidence' !== $hook ) {
			return;
		}
		wp_enqueue_style( 'phaseone-order-evidence', plugin_dir_url( __FILE__ ) . 'assets/admin.css', array(), PHASEONE_ORDER_EVIDENCE_VERSION );
		wp_enqueue_script( 'phaseone-order-evidence', plugin_dir_url( __FILE__ ) . 'assets/admin.js', array(), PHASEONE_ORDER_EVIDENCE_VERSION, true );
		wp_localize_script(
			'phaseone-order-evidence',
			'PhaseOneEvidence',
			array(
				'restRoot' => esc_url_raw( rest_url( 'phaseone/v1/order-evidence' ) ),
				'nonce'    => wp_create_nonce( 'wp_rest' ),
			)
		);
	}
);

function phaseone_order_evidence_render_admin() {
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		return;
	}
	?>
	<div class="wrap poe-shell">
		<header class="poe-hero">
			<div>
				<span class="poe-kicker">PHASE ONE FULFILLMENT</span>
				<h1>Packaging evidence</h1>
				<p>Capture a private visual record before the package leaves your hands.</p>
			</div>
			<div class="poe-secure"><span></span> Encrypted &amp; private</div>
		</header>

		<main class="poe-grid">
			<section class="poe-panel poe-search-panel">
				<div class="poe-step">01</div>
				<h2>Find the order</h2>
				<form id="poe-search-form" class="poe-search">
					<input id="poe-search" type="search" inputmode="search" autocomplete="off" placeholder="Order # or customer email" aria-label="Order number or customer email" required>
					<button type="submit">Find order</button>
				</form>
				<div id="poe-search-status" class="poe-status" aria-live="polite"></div>
				<div id="poe-results" class="poe-results"></div>
			</section>

			<section id="poe-workspace" class="poe-panel poe-workspace" hidden>
				<div class="poe-step">02</div>
				<div id="poe-order-summary"></div>
				<div class="poe-capture-box">
					<label for="poe-label">Photo type</label>
					<select id="poe-label">
						<option>Package overview</option>
						<option>Products &amp; protective packing</option>
						<option>Tamper seal</option>
						<option>Shipping label</option>
						<option>Other evidence</option>
					</select>
					<label class="poe-camera-button" for="poe-camera-input">
						<span class="poe-camera-icon">●</span>
						<span><strong>Open camera</strong><small>Rear camera on supported phones</small></span>
					</label>
					<input id="poe-camera-input" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" multiple hidden>
					<label class="poe-visible-toggle"><input id="poe-customer-visible" type="checkbox" checked> Show these photos to the customer</label>
					<div id="poe-preview" class="poe-preview"></div>
					<button id="poe-upload" class="poe-upload" type="button" disabled>Securely upload evidence</button>
					<div id="poe-upload-status" class="poe-status" aria-live="polite"></div>
				</div>
				<div class="poe-divider"></div>
				<div class="poe-gallery-heading"><h3>Evidence on this order</h3><span id="poe-evidence-count">0 photos</span></div>
				<div id="poe-gallery" class="poe-gallery"></div>
			</section>
		</main>
	</div>
	<?php
}
