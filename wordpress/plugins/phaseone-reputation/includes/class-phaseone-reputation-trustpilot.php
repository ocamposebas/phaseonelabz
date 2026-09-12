<?php

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Reputation_Trustpilot {
	const API_BASE = 'https://api.trustpilot.com/v1/business-units/';

	public static function fetch_summary( $settings ) {
		$trustpilot = isset( $settings['trustpilot'] ) && is_array( $settings['trustpilot'] ) ? $settings['trustpilot'] : array();
		$api_key    = PhaseOne_Reputation_Store::api_key( $settings );
		$business_id = isset( $trustpilot['business_unit_id'] ) ? trim( (string) $trustpilot['business_unit_id'] ) : '';

		if ( '' === $api_key || '' === $business_id ) {
			return new WP_Error( 'phaseone_trustpilot_not_configured', __( 'Trustpilot API credentials are incomplete.', 'phaseone-reputation' ) );
		}

		if ( ! preg_match( '/^[A-Za-z0-9_-]{6,80}$/', $business_id ) ) {
			return new WP_Error( 'phaseone_trustpilot_invalid_business_id', __( 'The Trustpilot Business Unit ID is invalid.', 'phaseone-reputation' ) );
		}

		$response = wp_safe_remote_get(
			self::API_BASE . rawurlencode( $business_id ),
			array(
				'timeout'     => 6,
				'redirection' => 0,
				'headers'     => array(
					'Accept'     => 'application/json',
					'apikey'     => $api_key,
					'User-Agent' => 'Phase One Reputation/' . PHASEONE_REPUTATION_VERSION,
				),
			)
		);

		if ( is_wp_error( $response ) ) {
			return $response;
		}

		$status = wp_remote_retrieve_response_code( $response );
		if ( 200 !== $status ) {
			return new WP_Error(
				'phaseone_trustpilot_http_error',
				sprintf( __( 'Trustpilot returned HTTP %d.', 'phaseone-reputation' ), $status )
			);
		}

		$body = json_decode( wp_remote_retrieve_body( $response ), true );
		if ( ! is_array( $body ) ) {
			return new WP_Error( 'phaseone_trustpilot_invalid_json', __( 'Trustpilot returned an invalid response.', 'phaseone-reputation' ) );
		}

		$rating = isset( $body['score']['trustScore'] ) ? (float) $body['score']['trustScore'] : null;
		$count  = isset( $body['numberOfReviews']['total'] ) ? absint( $body['numberOfReviews']['total'] ) : null;
		if ( null === $rating || null === $count || $rating < 0 || $rating > 5 ) {
			return new WP_Error( 'phaseone_trustpilot_missing_metrics', __( 'Trustpilot did not return a valid rating summary.', 'phaseone-reputation' ) );
		}

		return array(
			'rating'       => round( $rating, 1 ),
			'review_count' => $count,
			'last_updated' => gmdate( 'c' ),
			'fetched_at'   => time(),
		);
	}
}

