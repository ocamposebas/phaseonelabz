<?php

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Reputation_Store {
	const SETTINGS_OPTION = 'phaseone_reputation_settings';
	const CACHE_OPTION    = 'phaseone_reputation_summary_cache';
	const REFRESH_STATE_OPTION = 'phaseone_reputation_last_refresh';
	const REFRESH_HOOK    = 'phaseone_reputation_refresh_summaries';
	const REFRESH_LOCK    = 'phaseone_reputation_refresh_lock';
	const CACHE_MAX_AGE   = DAY_IN_SECONDS;

	public static function register_hooks() {
		add_filter( 'cron_schedules', array( __CLASS__, 'cron_schedules' ) );
		add_action( self::REFRESH_HOOK, array( __CLASS__, 'refresh' ) );
	}

	public static function activate() {
		if ( false === get_option( self::SETTINGS_OPTION, false ) ) {
			add_option( self::SETTINGS_OPTION, self::defaults(), '', false );
		}

		if ( false === get_option( self::CACHE_OPTION, false ) ) {
			add_option( self::CACHE_OPTION, array(), '', false );
		}

		self::ensure_refresh_scheduled();
	}

	public static function deactivate() {
		wp_clear_scheduled_hook( self::REFRESH_HOOK );
		delete_transient( self::REFRESH_LOCK );
	}

	public static function cron_schedules( $schedules ) {
		$schedules['phaseone_six_hours'] = array(
			'interval' => 6 * HOUR_IN_SECONDS,
			'display'  => __( 'Every six hours', 'phaseone-reputation' ),
		);
		return $schedules;
	}

	public static function ensure_refresh_scheduled() {
		if ( ! wp_next_scheduled( self::REFRESH_HOOK ) ) {
			wp_schedule_event( time() + MINUTE_IN_SECONDS, 'phaseone_six_hours', self::REFRESH_HOOK );
		}
	}

	public static function defaults() {
		return array(
			'schema_version' => 1,
			'trustpilot'     => array(
				'enabled'              => false,
				'data_mode'            => 'widget',
				'public_url'           => '',
				'leave_review_url'     => '',
				'business_unit_id'     => '',
				'api_key'              => '',
				'trustbox_template_id' => '',
				'locale'               => 'en-US',
				'theme'                => 'dark',
				'height'               => '52px',
			),
			'pepreview'      => array(
				'enabled' => false,
				'status'  => 'policy_review',
			),
			'external_sources' => array(),
		);
	}

	public static function settings() {
		$stored = get_option( self::SETTINGS_OPTION, array() );
		$stored = is_array( $stored ) ? $stored : array();
		$settings = wp_parse_args( $stored, self::defaults() );
		$settings['trustpilot'] = wp_parse_args(
			isset( $stored['trustpilot'] ) && is_array( $stored['trustpilot'] ) ? $stored['trustpilot'] : array(),
			self::defaults()['trustpilot']
		);
		$settings['pepreview'] = wp_parse_args(
			isset( $stored['pepreview'] ) && is_array( $stored['pepreview'] ) ? $stored['pepreview'] : array(),
			self::defaults()['pepreview']
		);
		$settings['external_sources'] = isset( $stored['external_sources'] ) && is_array( $stored['external_sources'] )
			? array_values( $stored['external_sources'] )
			: array();
		return $settings;
	}

	public static function sanitize_url( $value ) {
		$url = esc_url_raw( trim( (string) $value ), array( 'https' ) );
		return is_string( $url ) ? $url : '';
	}

	public static function sanitize_settings( $input, $existing = null ) {
		$input    = is_array( $input ) ? $input : array();
		$existing = is_array( $existing ) ? $existing : self::settings();
		$trust    = isset( $input['trustpilot'] ) && is_array( $input['trustpilot'] ) ? $input['trustpilot'] : array();
		$old_key  = isset( $existing['trustpilot']['api_key'] ) ? (string) $existing['trustpilot']['api_key'] : '';
		$new_key  = isset( $trust['api_key'] ) ? trim( (string) $trust['api_key'] ) : '';

		if ( '' === $new_key ) {
			$new_key = $old_key;
		}

		$mode   = isset( $trust['data_mode'] ) ? sanitize_key( $trust['data_mode'] ) : 'widget';
		$locale = isset( $trust['locale'] ) ? sanitize_text_field( $trust['locale'] ) : 'en-US';
		$theme  = isset( $trust['theme'] ) && 'light' === $trust['theme'] ? 'light' : 'dark';
		$height = isset( $trust['height'] ) ? sanitize_text_field( $trust['height'] ) : '52px';
		if ( ! preg_match( '/^\d{2,4}px$/', $height ) ) {
			$height = '52px';
		}

		$settings = array(
			'schema_version' => 1,
			'trustpilot'     => array(
				'enabled'              => ! empty( $trust['enabled'] ),
				'data_mode'            => in_array( $mode, array( 'api', 'widget' ), true ) ? $mode : 'widget',
				'public_url'           => self::sanitize_url( isset( $trust['public_url'] ) ? $trust['public_url'] : '' ),
				'leave_review_url'     => self::sanitize_url( isset( $trust['leave_review_url'] ) ? $trust['leave_review_url'] : '' ),
				'business_unit_id'     => sanitize_text_field( isset( $trust['business_unit_id'] ) ? $trust['business_unit_id'] : '' ),
				'api_key'              => sanitize_text_field( $new_key ),
				'trustbox_template_id' => sanitize_text_field( isset( $trust['trustbox_template_id'] ) ? $trust['trustbox_template_id'] : '' ),
				'locale'               => preg_match( '/^[A-Za-z]{2,3}(?:-[A-Za-z]{2})?$/', $locale ) ? $locale : 'en-US',
				'theme'                => $theme,
				'height'               => $height,
			),
			// PepReview deliberately remains disabled until its policies and authorized
			// integration contract have been reviewed.
			'pepreview'      => array(
				'enabled' => false,
				'status'  => 'policy_review',
			),
			'external_sources' => array(),
		);

		$external = isset( $input['external_sources'] ) && is_array( $input['external_sources'] )
			? $input['external_sources']
			: array();

		$used_ids = array();
		foreach ( array_slice( $external, 0, 12 ) as $index => $source ) {
			if ( ! is_array( $source ) ) {
				continue;
			}

			$name       = sanitize_text_field( isset( $source['name'] ) ? $source['name'] : '' );
			$public_url = self::sanitize_url( isset( $source['public_url'] ) ? $source['public_url'] : '' );
			if ( '' === $name || '' === $public_url ) {
				continue;
			}

			$raw_id = isset( $source['id'] ) ? sanitize_key( $source['id'] ) : '';
			$id     = $raw_id ? $raw_id : sanitize_key( $name . '-' . $index );
			if ( isset( $used_ids[ $id ] ) ) {
				$id .= '-' . absint( $index );
			}
			$used_ids[ $id ] = true;
			$settings['external_sources'][] = array(
				'id'               => $id,
				'enabled'          => ! empty( $source['enabled'] ),
				'name'             => $name,
				'logo'             => self::sanitize_url( isset( $source['logo'] ) ? $source['logo'] : '' ),
				'type'             => sanitize_text_field( isset( $source['type'] ) ? $source['type'] : 'Independent source' ),
				'public_url'       => $public_url,
				'leave_review_url' => self::sanitize_url( isset( $source['leave_review_url'] ) ? $source['leave_review_url'] : '' ),
			);
		}

		return $settings;
	}

	public static function api_key( $settings = null ) {
		if ( defined( 'PHASEONE_TRUSTPILOT_API_KEY' ) && PHASEONE_TRUSTPILOT_API_KEY ) {
			return trim( (string) PHASEONE_TRUSTPILOT_API_KEY );
		}
		$settings = is_array( $settings ) ? $settings : self::settings();
		return isset( $settings['trustpilot']['api_key'] ) ? trim( (string) $settings['trustpilot']['api_key'] ) : '';
	}

	public static function cache() {
		$cache = get_option( self::CACHE_OPTION, array() );
		return is_array( $cache ) ? $cache : array();
	}

	public static function refresh( $force = false ) {
		if ( ! $force && get_transient( self::REFRESH_LOCK ) ) {
			return new WP_Error( 'phaseone_reputation_refresh_locked', __( 'A reputation refresh is already running.', 'phaseone-reputation' ) );
		}

		set_transient( self::REFRESH_LOCK, '1', 5 * MINUTE_IN_SECONDS );
		$settings = self::settings();
		$cache    = self::cache();
		$results  = array();
		$refresh_state = array(
			'finished_at' => gmdate( 'c' ),
			'providers'   => array(),
		);

		try {
			if ( ! empty( $settings['trustpilot']['enabled'] ) && 'api' === $settings['trustpilot']['data_mode'] ) {
				$result = PhaseOne_Reputation_Trustpilot::fetch_summary( $settings );
				if ( is_wp_error( $result ) ) {
					$results['trustpilot'] = $result;
					$refresh_state['providers']['trustpilot'] = array(
						'ok'      => false,
						'code'    => sanitize_key( $result->get_error_code() ),
						'message' => sanitize_text_field( $result->get_error_message() ),
					);
				} else {
					$cache['trustpilot']   = $result;
					$results['trustpilot'] = true;
					$refresh_state['providers']['trustpilot'] = array( 'ok' => true );
				}
			}

			foreach ( $settings['external_sources'] as $source ) {
				if ( empty( $source['enabled'] ) ) {
					continue;
				}

				/**
				 * Supply independently verified aggregate metrics for an external source.
				 * Return null to keep the source link-only, or an array containing rating,
				 * review_count, and optional last_updated. Review bodies are never accepted.
				 */
				$metrics = apply_filters( 'phaseone_reputation_external_provider_metrics', null, $source );
				$metrics = self::normalize_metrics( $metrics );
				if ( $metrics ) {
					$cache[ 'external:' . $source['id'] ] = $metrics;
				}
			}

			update_option( self::CACHE_OPTION, $cache, false );
			$refresh_state['finished_at'] = gmdate( 'c' );
			update_option( self::REFRESH_STATE_OPTION, $refresh_state, false );
		} finally {
			delete_transient( self::REFRESH_LOCK );
		}

		return $results;
	}

	public static function normalize_metrics( $metrics ) {
		if ( ! is_array( $metrics ) || ! isset( $metrics['rating'], $metrics['review_count'] ) ) {
			return null;
		}

		$rating = (float) $metrics['rating'];
		$count  = absint( $metrics['review_count'] );
		if ( $rating < 0 || $rating > 5 ) {
			return null;
		}

		$updated = isset( $metrics['last_updated'] ) ? strtotime( (string) $metrics['last_updated'] ) : false;
		if ( ! $updated ) {
			$updated = time();
		}

		return array(
			'rating'       => round( $rating, 1 ),
			'review_count' => $count,
			'last_updated' => gmdate( 'c', $updated ),
			'fetched_at'   => time(),
		);
	}

	public static function public_payload() {
		self::ensure_refresh_scheduled();
		$settings = self::settings();
		$cache    = self::cache();
		$sources  = array();

		if ( ! empty( $settings['trustpilot']['enabled'] ) && $settings['trustpilot']['public_url'] ) {
			$sources[] = self::trustpilot_payload( $settings['trustpilot'], isset( $cache['trustpilot'] ) ? $cache['trustpilot'] : null );
		}

		foreach ( $settings['external_sources'] as $source ) {
			if ( empty( $source['enabled'] ) || empty( $source['public_url'] ) ) {
				continue;
			}
			$key       = 'external:' . $source['id'];
			$sources[] = self::external_payload( $source, isset( $cache[ $key ] ) ? $cache[ $key ] : null );
		}

		return array(
			'schema_version' => 1,
			'generated_at'   => gmdate( 'c' ),
			'sources'        => array_values( array_filter( $sources ) ),
			'disclosure'     => __( 'Each rating belongs to its named source. Phase One does not combine scores across platforms.', 'phaseone-reputation' ),
		);
	}

	private static function freshness( $metrics ) {
		if ( ! is_array( $metrics ) || empty( $metrics['fetched_at'] ) ) {
			return 'missing';
		}
		return ( time() - absint( $metrics['fetched_at'] ) ) <= self::CACHE_MAX_AGE ? 'fresh' : 'stale';
	}

	private static function trustpilot_payload( $settings, $metrics ) {
		$freshness  = self::freshness( $metrics );
		$has_widget = ! empty( $settings['business_unit_id'] ) && ! empty( $settings['trustbox_template_id'] );
		$status     = 'link_only';

		if ( 'fresh' === $freshness ) {
			$status = 'active';
		} elseif ( $has_widget ) {
			// When API metrics cannot be presented as current, the official widget is
			// the only allowed live fallback. Stale local figures remain hidden.
			$status = 'widget';
		} elseif ( 'stale' === $freshness ) {
			$status = 'stale';
		} elseif ( 'api' === $settings['data_mode'] ) {
			$status = 'unavailable';
		}

		$payload = array(
			'provider'         => 'trustpilot',
			'name'             => 'Trustpilot',
			'type'             => 'Independent review platform',
			'logo'             => '',
			'rating'           => 'fresh' === $freshness ? (float) $metrics['rating'] : null,
			'review_count'     => 'fresh' === $freshness ? absint( $metrics['review_count'] ) : null,
			'public_url'       => self::sanitize_url( $settings['public_url'] ),
			'leave_review_url' => self::sanitize_url( $settings['leave_review_url'] ),
			'last_updated'     => is_array( $metrics ) && ! empty( $metrics['last_updated'] ) ? $metrics['last_updated'] : null,
			'status'           => $status,
		);

		if ( $has_widget ) {
			$payload['widget'] = array(
				'provider'         => 'trustpilot',
				'business_unit_id' => sanitize_text_field( $settings['business_unit_id'] ),
				'template_id'      => sanitize_text_field( $settings['trustbox_template_id'] ),
				'locale'           => sanitize_text_field( $settings['locale'] ),
				'theme'            => 'light' === $settings['theme'] ? 'light' : 'dark',
				'height'           => sanitize_text_field( $settings['height'] ),
			);
		}

		return $payload;
	}

	private static function external_payload( $source, $metrics ) {
		$freshness = self::freshness( $metrics );
		return array(
			'provider'         => sanitize_key( $source['id'] ),
			'name'             => sanitize_text_field( $source['name'] ),
			'type'             => sanitize_text_field( $source['type'] ),
			'logo'             => self::sanitize_url( $source['logo'] ),
			'rating'           => 'fresh' === $freshness ? (float) $metrics['rating'] : null,
			'review_count'     => 'fresh' === $freshness ? absint( $metrics['review_count'] ) : null,
			'public_url'       => self::sanitize_url( $source['public_url'] ),
			'leave_review_url' => self::sanitize_url( $source['leave_review_url'] ),
			'last_updated'     => is_array( $metrics ) && ! empty( $metrics['last_updated'] ) ? $metrics['last_updated'] : null,
			'status'           => 'fresh' === $freshness ? 'active' : ( 'stale' === $freshness ? 'stale' : 'link_only' ),
		);
	}
}
