<?php
/**
 * Plugin Name: Phase One TikTok Attribution
 * Description: Persists TikTok click attribution on WooCommerce orders and sends paid purchases to TikTok Events API.
 * Version: 1.0.0
 * Author: Phase One Labz
 * Requires PHP: 8.1
 */

defined( 'ABSPATH' ) || exit;

define( 'PHASEONE_TIKTOK_ATTRIBUTION_VERSION', '1.0.0' );
define( 'PHASEONE_TIKTOK_PIXEL_ID', 'D9UBLSRC77UDKVSV1D90' );
define( 'PHASEONE_TIKTOK_EVENTS_ENDPOINT', 'https://business-api.tiktok.com/open_api/v1.3/event/track/' );

/**
 * Read a secret from wp-config.php or the server environment.
 */
function phaseone_tiktok_get_capi_token() {
	if ( defined( 'TIKTOK_CAPI_TOKEN' ) ) {
		return trim( (string) TIKTOK_CAPI_TOKEN );
	}

	$value = getenv( 'TIKTOK_CAPI_TOKEN' );
	if ( false !== $value && '' !== trim( (string) $value ) ) {
		return trim( (string) $value );
	}

	foreach ( array( $_ENV, $_SERVER ) as $source ) {
		if ( isset( $source['TIKTOK_CAPI_TOKEN'] ) ) {
			$value = trim( (string) $source['TIKTOK_CAPI_TOKEN'] );
			if ( '' !== $value ) {
				return $value;
			}
		}
	}

	return '';
}

/**
 * Return the current JSON body without trusting arbitrary nested fields.
 */
function phaseone_tiktok_request_tracking() {
	static $tracking = null;

	if ( null !== $tracking ) {
		return $tracking;
	}

	$tracking = array();
	$raw      = file_get_contents( 'php://input' );
	$payload  = is_string( $raw ) && '' !== $raw ? json_decode( $raw, true ) : null;

	if ( is_array( $payload ) && isset( $payload['tracking'] ) && is_array( $payload['tracking'] ) ) {
		$tracking = $payload['tracking'];
	}

	return $tracking;
}

function phaseone_tiktok_clean_value( $value, $max_length = 500 ) {
	$value = sanitize_text_field( (string) $value );
	return function_exists( 'mb_substr' )
		? mb_substr( $value, 0, $max_length )
		: substr( $value, 0, $max_length );
}

function phaseone_tiktok_client_ip() {
	if ( class_exists( 'WC_Geolocation' ) ) {
		return phaseone_tiktok_clean_value( WC_Geolocation::get_ip_address(), 100 );
	}

	return phaseone_tiktok_clean_value( wp_unslash( $_SERVER['REMOTE_ADDR'] ?? '' ), 100 );
}

/**
 * Save first-touch fields on every WooCommerce order created by the custom APIs.
 */
function phaseone_tiktok_capture_order_attribution( $order_id, $order = null ) {
	$order = $order instanceof WC_Order ? $order : wc_get_order( $order_id );
	if ( ! $order instanceof WC_Order ) {
		return;
	}

	$tracking = phaseone_tiktok_request_tracking();
	$ttclid   = phaseone_tiktok_clean_value( $tracking['ttclid'] ?? wp_unslash( $_COOKIE['ttclid'] ?? '' ) );

	if ( '' === $ttclid ) {
		return;
	}

	$fields = array(
		'_phaseone_tiktok_ttclid'       => $ttclid,
		'_phaseone_tiktok_ttp'          => phaseone_tiktok_clean_value( $tracking['ttp'] ?? wp_unslash( $_COOKIE['_ttp'] ?? '' ) ),
		'_phaseone_tiktok_click_ts'     => phaseone_tiktok_clean_value( $tracking['click_ts'] ?? '', 30 ),
		'_phaseone_tiktok_landing_url'  => esc_url_raw( (string) ( $tracking['landing_url'] ?? '' ) ),
		'_phaseone_tiktok_utm_source'   => phaseone_tiktok_clean_value( $tracking['utm_source'] ?? '' ),
		'_phaseone_tiktok_utm_medium'   => phaseone_tiktok_clean_value( $tracking['utm_medium'] ?? '' ),
		'_phaseone_tiktok_utm_campaign' => phaseone_tiktok_clean_value( $tracking['utm_campaign'] ?? '' ),
		'_phaseone_tiktok_utm_content'  => phaseone_tiktok_clean_value( $tracking['utm_content'] ?? '' ),
		'_phaseone_tiktok_utm_term'     => phaseone_tiktok_clean_value( $tracking['utm_term'] ?? '' ),
		'_phaseone_tiktok_client_ip'    => phaseone_tiktok_clean_value( $tracking['ip'] ?? phaseone_tiktok_client_ip(), 100 ),
		'_phaseone_tiktok_user_agent'   => phaseone_tiktok_clean_value( $tracking['user_agent'] ?? wp_unslash( $_SERVER['HTTP_USER_AGENT'] ?? '' ), 1000 ),
	);

	foreach ( $fields as $meta_key => $value ) {
		if ( '' !== $value ) {
			$order->update_meta_data( $meta_key, $value );
		}
	}

	$order->update_meta_data( '_phaseone_tiktok_event_id', 'po_' . $order->get_id() );
	$order->save_meta_data();
}
add_action( 'woocommerce_new_order', 'phaseone_tiktok_capture_order_attribution', 20, 2 );

function phaseone_tiktok_order_contents( WC_Order $order ) {
	$contents = array();

	foreach ( $order->get_items( 'line_item' ) as $item ) {
		if ( ! $item instanceof WC_Order_Item_Product ) {
			continue;
		}

		$product  = $item->get_product();
		$quantity = max( 1, (int) $item->get_quantity() );
		$line     = (float) $item->get_total();
		$sku      = $product instanceof WC_Product ? trim( (string) $product->get_sku() ) : '';
		$id       = '' !== $sku ? $sku : (string) ( $item->get_variation_id() ?: $item->get_product_id() );

		$contents[] = array(
			'content_id'   => $id,
			'content_name' => $item->get_name(),
			'quantity'     => $quantity,
			'price'        => round( $line / $quantity, 2 ),
		);
	}

	return $contents;
}

/**
 * Send once, and only after WooCommerce confirms that the order is paid.
 */
function phaseone_tiktok_send_paid_order( $order_id ) {
	$order = wc_get_order( $order_id );
	if ( ! $order instanceof WC_Order || ! $order->is_paid() ) {
		return;
	}

	if ( 'yes' === $order->get_meta( '_phaseone_tiktok_capi_sent', true ) ) {
		return;
	}

	$processing_at = absint( $order->get_meta( '_phaseone_tiktok_capi_processing_at', true ) );
	if ( $processing_at && ( time() - $processing_at ) < 300 ) {
		return;
	}

	$ttclid = trim( (string) $order->get_meta( '_phaseone_tiktok_ttclid', true ) );
	$token  = phaseone_tiktok_get_capi_token();

	// Organic orders do not need click attribution, and a missing secret must never leak client-side.
	if ( '' === $ttclid || '' === $token ) {
		return;
	}

	$event_id = trim( (string) $order->get_meta( '_phaseone_tiktok_event_id', true ) );
	if ( '' === $event_id ) {
		$event_id = 'po_' . $order->get_id();
	}

	$user = array(
		'ttclid' => $ttclid,
	);
	$email = strtolower( trim( (string) $order->get_billing_email() ) );
	if ( '' !== $email ) {
		$user['email'] = hash( 'sha256', $email );
	}

	$ip = trim( (string) $order->get_meta( '_phaseone_tiktok_client_ip', true ) );
	$ua = trim( (string) $order->get_meta( '_phaseone_tiktok_user_agent', true ) );
	$ttp = trim( (string) $order->get_meta( '_phaseone_tiktok_ttp', true ) );
	if ( '' !== $ip ) {
		$user['ip'] = $ip;
	}
	if ( '' !== $ua ) {
		$user['user_agent'] = $ua;
	}
	if ( '' !== $ttp ) {
		$user['ttp'] = $ttp;
	}

	$payload = array(
		'event_source'    => 'web',
		'event_source_id' => PHASEONE_TIKTOK_PIXEL_ID,
		'data'            => array(
			array(
				'event'      => 'CompletePayment',
				'event_time' => time(),
				'event_id'   => $event_id,
				'user'       => $user,
				'properties' => array(
					'value'        => (float) $order->get_total(),
					'currency'     => strtoupper( (string) $order->get_currency() ),
					'content_type' => 'product',
					'order_id'     => (string) $order->get_order_number(),
					'contents'     => phaseone_tiktok_order_contents( $order ),
				),
			),
		),
	);

	$order->update_meta_data( '_phaseone_tiktok_capi_processing_at', time() );
	$order->save_meta_data();

	$response = wp_remote_post(
		PHASEONE_TIKTOK_EVENTS_ENDPOINT,
		array(
			'timeout' => 10,
			'headers' => array(
				'Content-Type' => 'application/json',
				'Access-Token' => $token,
			),
			'body'    => wp_json_encode( $payload ),
		)
	);

	$order->delete_meta_data( '_phaseone_tiktok_capi_processing_at' );

	if ( is_wp_error( $response ) ) {
		$order->update_meta_data( '_phaseone_tiktok_capi_status', 'failed' );
		$order->update_meta_data( '_phaseone_tiktok_capi_error', phaseone_tiktok_clean_value( $response->get_error_message(), 500 ) );
		$order->save_meta_data();
		return;
	}

	$status_code = (int) wp_remote_retrieve_response_code( $response );
	$response_data = json_decode( (string) wp_remote_retrieve_body( $response ), true );
	$api_code = is_array( $response_data ) && isset( $response_data['code'] )
		? (int) $response_data['code']
		: -1;

	if ( $status_code >= 200 && $status_code < 300 && 0 === $api_code ) {
		$order->update_meta_data( '_phaseone_tiktok_capi_sent', 'yes' );
		$order->update_meta_data( '_phaseone_tiktok_capi_status', 'sent' );
		$order->update_meta_data( '_phaseone_tiktok_capi_sent_at', gmdate( 'c' ) );
		$order->delete_meta_data( '_phaseone_tiktok_capi_error' );
		$order->add_order_note( 'TikTok Events API purchase sent. Event ID: ' . $event_id );
	} else {
		$message = is_array( $response_data )
			? (string) ( $response_data['message'] ?? 'TikTok rejected the event.' )
			: 'TikTok returned an invalid response.';
		$order->update_meta_data( '_phaseone_tiktok_capi_status', 'failed' );
		$order->update_meta_data( '_phaseone_tiktok_capi_error', phaseone_tiktok_clean_value( $message, 500 ) );
	}

	$order->save_meta_data();
}
add_action( 'woocommerce_payment_complete', 'phaseone_tiktok_send_paid_order', 30 );
add_action( 'woocommerce_order_status_processing', 'phaseone_tiktok_send_paid_order', 30 );
add_action( 'woocommerce_order_status_completed', 'phaseone_tiktok_send_paid_order', 30 );

function phaseone_tiktok_send_on_paid_status( $order_id, $from_status, $to_status, $order ) {
	if ( $order instanceof WC_Order && $order->is_paid() ) {
		phaseone_tiktok_send_paid_order( $order_id );
	}
}
add_action( 'woocommerce_order_status_changed', 'phaseone_tiktok_send_on_paid_status', 30, 4 );

/**
 * Safe deployment check: reports configuration state, never the access token.
 */
function phaseone_tiktok_register_status_route() {
	register_rest_route(
		'phaseone/v1',
		'/tiktok-attribution/status',
		array(
			'methods'             => WP_REST_Server::READABLE,
			'permission_callback' => '__return_true',
			'callback'            => static function () {
				return rest_ensure_response(
					array(
						'active'          => true,
						'version'         => PHASEONE_TIKTOK_ATTRIBUTION_VERSION,
						'pixel_id'        => PHASEONE_TIKTOK_PIXEL_ID,
						'capi_configured' => '' !== phaseone_tiktok_get_capi_token(),
						'event'           => 'CompletePayment',
					)
				);
			},
		)
	);
}
add_action( 'rest_api_init', 'phaseone_tiktok_register_status_route' );
