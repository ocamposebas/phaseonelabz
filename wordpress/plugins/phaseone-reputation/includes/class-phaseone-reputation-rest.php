<?php

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Reputation_REST {
	public static function register_hooks() {
		add_action( 'rest_api_init', array( __CLASS__, 'register_routes' ) );
	}

	public static function register_routes() {
		register_rest_route(
			'phaseone/v1',
			'/reputation',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => '__return_true',
				'callback'            => array( __CLASS__, 'get_reputation' ),
			)
		);
	}

	public static function get_reputation() {
		$payload = PhaseOne_Reputation_Store::public_payload();
		$response = rest_ensure_response( $payload );
		$response->header( 'Cache-Control', 'public, max-age=300, stale-while-revalidate=3600, stale-if-error=86400' );
		return $response;
	}
}

