<?php

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Bulk_REST {
	private const NAMESPACE = 'phaseone/v1';
	private const MAX_BODY_BYTES = 65536;

	public static function boot(): void {
		add_action( 'rest_api_init', array( __CLASS__, 'routes' ) );
	}

	public static function routes(): void {
		$permission = array( __CLASS__, 'authorize_server' );
		register_rest_route( self::NAMESPACE, '/bulk/access', array( 'methods' => WP_REST_Server::CREATABLE, 'callback' => array( __CLASS__, 'access' ), 'permission_callback' => $permission ) );
		register_rest_route(
			self::NAMESPACE,
			'/bulk/session',
			array(
				array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( __CLASS__, 'session' ), 'permission_callback' => $permission ),
				array( 'methods' => WP_REST_Server::DELETABLE, 'callback' => array( __CLASS__, 'logout' ), 'permission_callback' => $permission ),
			)
		);
		register_rest_route( self::NAMESPACE, '/bulk/catalog', array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( __CLASS__, 'catalog' ), 'permission_callback' => $permission ) );
		register_rest_route( self::NAMESPACE, '/bulk/quote', array( 'methods' => WP_REST_Server::CREATABLE, 'callback' => array( __CLASS__, 'quote' ), 'permission_callback' => $permission ) );
		register_rest_route(
			self::NAMESPACE,
			'/bulk/checkout-intent',
			array(
				array( 'methods' => WP_REST_Server::CREATABLE, 'callback' => array( __CLASS__, 'create_intent' ), 'permission_callback' => $permission ),
				array( 'methods' => WP_REST_Server::READABLE, 'callback' => array( __CLASS__, 'resolve_intent' ), 'permission_callback' => $permission ),
			)
		);
	}

	public static function authorize_server( WP_REST_Request $request ): true|WP_Error {
		$content_length = absint( $request->get_header( 'content-length' ) );
		if ( $content_length > self::MAX_BODY_BYTES ) {
			return new WP_Error( 'phaseone_bulk_payload_too_large', 'Request payload is too large.', array( 'status' => 413 ) );
		}
		$provided = trim( (string) $request->get_header( 'x-phaseone-checkout-secret' ) );
		if ( '' === $provided || ! self::secret_matches( $provided ) ) {
			return new WP_Error( 'phaseone_bulk_unauthorized', 'Unauthorized request.', array( 'status' => 403 ) );
		}
		return true;
	}

	public static function access( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$ip = sanitize_text_field( (string) $request->get_header( 'x-phaseone-client-ip' ) );
		if ( self::rate_limited( $ip ) ) {
			return new WP_Error( 'phaseone_bulk_rate_limited', 'Too many access attempts. Try again later.', array( 'status' => 429 ) );
		}
		$params = $request->get_json_params();
		$code   = is_array( $params ) ? (string) ( $params['code'] ?? '' ) : '';
		$result = PhaseOne_Bulk_Access::create_session( $code, $ip, (string) $request->get_header( 'user-agent' ) );
		return is_wp_error( $result ) ? $result : self::response( array( 'success' => true ) + $result );
	}

	public static function session( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$session = self::access_context( $request );
		if ( is_wp_error( $session ) ) {
			return $session;
		}
		return self::response(
			array(
				'success'    => true,
				'authorized' => true,
				'access_mode' => (string) $session['access_mode'],
				'access_id'  => (int) $session['access_id'],
				'expires_at' => gmdate( DATE_ATOM, strtotime( $session['expires_at'] . ' UTC' ) ),
			)
		);
	}

	public static function logout( WP_REST_Request $request ): WP_REST_Response {
		$token = self::session_token( $request );
		if ( '' !== $token ) {
			PhaseOne_Bulk_Access::revoke_session( $token );
		}
		return self::response( array( 'success' => true ) );
	}

	public static function catalog( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$session = self::access_context( $request );
		if ( is_wp_error( $session ) ) {
			return $session;
		}
		$catalog = wp_cache_get( 'catalog', 'phaseone_bulk' );
		if ( ! is_array( $catalog ) ) {
			$catalog = PhaseOne_Bulk_Pricing_Engine::catalog();
			wp_cache_set( 'catalog', $catalog, 'phaseone_bulk', 30 );
		}
		return self::response( array( 'success' => true, 'access_mode' => (string) $session['access_mode'] ) + $catalog );
	}

	public static function quote( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$session = self::access_context( $request );
		if ( is_wp_error( $session ) ) {
			return $session;
		}
		$params = $request->get_json_params();
		$quote  = PhaseOne_Bulk_Pricing_Engine::quote( is_array( $params['items'] ?? null ) ? $params['items'] : array() );
		return is_wp_error( $quote ) ? $quote : self::response( array( 'success' => true ) + $quote );
	}

	public static function create_intent( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$session = self::access_context( $request );
		if ( is_wp_error( $session ) ) {
			return $session;
		}
		$params = $request->get_json_params();
		$quote  = PhaseOne_Bulk_Pricing_Engine::quote( is_array( $params['items'] ?? null ) ? $params['items'] : array() );
		if ( is_wp_error( $quote ) ) {
			return $quote;
		}
		$intent = PhaseOne_Bulk_Intents::create( $session, $quote );
		return is_wp_error( $intent ) ? $intent : self::response( array( 'success' => true, 'quote' => $quote ) + $intent );
	}

	public static function resolve_intent( WP_REST_Request $request ): WP_REST_Response|WP_Error {
		$session = self::access_context( $request );
		if ( is_wp_error( $session ) ) {
			return $session;
		}
		$token  = trim( (string) $request->get_header( 'x-phaseone-bulk-intent' ) );
		$intent = PhaseOne_Bulk_Intents::resolve( $token, $session );
		if ( is_wp_error( $intent ) ) {
			return $intent;
		}
		$quote = PhaseOne_Bulk_Pricing_Engine::quote( $intent['items'] );
		if ( is_wp_error( $quote ) ) {
			return $quote;
		}
		return self::response(
			array(
				'success'    => true,
				'intent_id'  => (int) $intent['id'],
				'access_id'  => (int) $intent['access_id'],
				'customer_id' => (int) $intent['customer_id'],
				'expires_at' => gmdate( DATE_ATOM, strtotime( $intent['expires_at'] . ' UTC' ) ),
				'quote'      => $quote,
			)
		);
	}

	public static function access_context( WP_REST_Request $request ): array|WP_Error {
		return PhaseOne_Bulk_Access::context( self::session_token( $request ) );
	}

	private static function session_token( WP_REST_Request $request ): string {
		return trim( (string) $request->get_header( 'x-phaseone-bulk-session' ) );
	}

	private static function response( array $data, int $status = 200 ): WP_REST_Response {
		$response = new WP_REST_Response( $data, $status );
		$response->header( 'Cache-Control', 'private, no-store, max-age=0, must-revalidate' );
		$response->header( 'X-Content-Type-Options', 'nosniff' );
		return $response;
	}

	private static function secret_matches( string $provided ): bool {
		$runtime = '';
		if ( defined( 'PHASEONE_PRISM_BRIDGE_SECRET' ) ) {
			$runtime = trim( (string) PHASEONE_PRISM_BRIDGE_SECRET );
		} else {
			$environment = getenv( 'PHASEONE_PRISM_BRIDGE_SECRET' );
			$runtime = false === $environment ? '' : trim( (string) $environment );
		}
		if ( '' !== $runtime ) {
			return hash_equals( $runtime, $provided );
		}
		$stored = trim( (string) get_option( 'phaseone_prism_bridge_secret_hash', '' ) );
		return '' !== $stored && hash_equals( $stored, hash( 'sha256', $provided ) );
	}

	private static function rate_limited( string $ip ): bool {
		$key   = 'phaseone_bulk_access_' . substr( hash_hmac( 'sha256', $ip ?: 'unknown', wp_salt( 'nonce' ) ), 0, 32 );
		$count = absint( get_transient( $key ) );
		if ( $count >= 10 ) {
			return true;
		}
		set_transient( $key, $count + 1, 15 * MINUTE_IN_SECONDS );
		return false;
	}
}
