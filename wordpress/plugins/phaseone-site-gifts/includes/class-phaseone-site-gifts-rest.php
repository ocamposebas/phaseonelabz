<?php

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Site_Gifts_REST {
	private const NAMESPACE = 'phaseone/v1';
	private const WC_NAMESPACE = 'wc-phaseone/v1';

	public static function boot(): void {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	public static function register_routes(): void {
		register_rest_route(
			self::NAMESPACE,
			'/site-gifts/evaluate',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'permission_callback' => array( __CLASS__, 'authorize' ),
				'callback'            => array( __CLASS__, 'evaluate' ),
				'args'                => array(
					'items' => array( 'required' => true, 'type' => 'array' ),
				),
			)
		);

		// The wc- namespace deliberately opts into WooCommerce REST consumer-key
		// authentication. GET keeps read-only API keys read-only; the encoded
		// payload is still validated and recalculated by WooCommerce.
		register_rest_route(
			self::WC_NAMESPACE,
			'/site-gifts/evaluate',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => array( __CLASS__, 'authorize' ),
				'callback'            => array( __CLASS__, 'evaluate_readable' ),
				'args'                => array(
					'payload' => array( 'required' => true, 'type' => 'string' ),
				),
			)
		);
	}

	public static function authorize( WP_REST_Request $request ) {
		// WooCommerce REST consumer credentials are already used by the Astro
		// server for catalog data. WC authenticates those credentials before the
		// permission callback, allowing local/staging quotes without coupling this
		// read-only endpoint to PRISM configuration.
		if ( get_current_user_id() > 0 && current_user_can( 'manage_woocommerce' ) ) {
			return true;
		}

		$provided = trim( (string) $request->get_header( 'x-phaseone-checkout-secret' ) );
		if ( '' === $provided ) {
			return new WP_Error( 'phaseone_site_gifts_forbidden', 'A valid checkout secret is required.', array( 'status' => 403 ) );
		}

		$runtime = self::runtime_secret();
		if ( '' !== $runtime && hash_equals( $runtime, $provided ) ) {
			return true;
		}

		$stored_hash = trim( (string) get_option( 'phaseone_prism_bridge_secret_hash', '' ) );
		if ( '' !== $stored_hash && hash_equals( $stored_hash, hash( 'sha256', $provided ) ) ) {
			return true;
		}

		return new WP_Error( 'phaseone_site_gifts_forbidden', 'A valid checkout secret is required.', array( 'status' => 403 ) );
	}

	public static function evaluate( WP_REST_Request $request ) {
		try {
			$items = $request->get_param( 'items' );
			$coupons = $request->get_param( 'coupon_codes' );
			if ( ! is_array( $coupons ) ) {
				$coupons = $request->get_param( 'couponCodes' );
			}

			$quote = PhaseOne_Site_Gifts_Pricing::quote(
				is_array( $items ) ? $items : array(),
				is_array( $coupons ) ? $coupons : array()
			);
			$evaluation = PhaseOne_Site_Gifts_Engine::evaluate_total( (float) $quote['eligible_total'] );
			$evaluation['pricing'] = $quote['pricing'] ?? array();
			$evaluation['coupons'] = $quote['coupons'] ?? array();

			$response = rest_ensure_response( $evaluation );
			$response->header( 'Cache-Control', 'no-store, max-age=0, must-revalidate' );
			return $response;
		} catch ( Throwable $exception ) {
			return new WP_Error(
				'phaseone_site_gifts_quote_failed',
				$exception->getMessage(),
				array( 'status' => 400 )
			);
		}
	}

	public static function evaluate_readable( WP_REST_Request $request ) {
		$encoded = (string) $request->get_param( 'payload' );
		if ( '' === $encoded || strlen( $encoded ) > 32768 ) {
			return new WP_Error( 'phaseone_site_gifts_invalid_quote', 'The quote payload is invalid.', array( 'status' => 400 ) );
		}

		$payload = json_decode( $encoded, true );
		if ( ! is_array( $payload ) || ! isset( $payload['items'] ) || ! is_array( $payload['items'] ) ) {
			return new WP_Error( 'phaseone_site_gifts_invalid_quote', 'The quote payload is invalid.', array( 'status' => 400 ) );
		}

		$request->set_param( 'items', $payload['items'] );
		$request->set_param( 'coupon_codes', isset( $payload['coupon_codes'] ) && is_array( $payload['coupon_codes'] ) ? $payload['coupon_codes'] : array() );

		return self::evaluate( $request );
	}

	private static function runtime_secret(): string {
		if ( defined( 'PHASEONE_PRISM_BRIDGE_SECRET' ) ) {
			return trim( (string) PHASEONE_PRISM_BRIDGE_SECRET );
		}

		$value = getenv( 'PHASEONE_PRISM_BRIDGE_SECRET' );
		if ( false !== $value && '' !== trim( (string) $value ) ) {
			return trim( (string) $value );
		}

		foreach ( array( $_ENV, $_SERVER ) as $source ) {
			if ( isset( $source['PHASEONE_PRISM_BRIDGE_SECRET'] ) && '' !== trim( (string) $source['PHASEONE_PRISM_BRIDGE_SECRET'] ) ) {
				return trim( (string) $source['PHASEONE_PRISM_BRIDGE_SECRET'] );
			}
		}

		return '';
	}
}
