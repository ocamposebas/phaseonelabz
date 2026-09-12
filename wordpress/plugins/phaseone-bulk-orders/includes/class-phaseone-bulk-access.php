<?php

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Bulk_Access {
	private const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

	public static function mode(): string {
		$settings = PhaseOne_Bulk_Installer::settings();
		return 'public' === $settings['access_mode'] ? 'public' : 'private';
	}

	public static function is_public(): bool {
		return 'public' === self::mode();
	}

	/**
	 * Returns the single authorization context used by catalog, quote, intent,
	 * and payment flows. Public mode bypasses only the customer access code;
	 * server authentication and checkout login remain mandatory.
	 */
	public static function context( string $token ): array|WP_Error {
		$token = trim( $token );
		if ( '' !== $token ) {
			$session = self::validate_session( $token );
			if ( ! is_wp_error( $session ) ) {
				$session['access_mode'] = 'private';
				return $session;
			}
		}
		if ( ! self::is_public() ) {
			return self::invalid_session();
		}

		$settings = PhaseOne_Bulk_Installer::settings();
		return array(
			'id'          => 0,
			'access_id'   => 0,
			'access_mode' => 'public',
			'expires_at'  => gmdate( 'Y-m-d H:i:s', time() + ( (int) $settings['intent_minutes'] * MINUTE_IN_SECONDS ) ),
		);
	}

	private static function keyed_hash( string $value ): string {
		return hash_hmac( 'sha256', $value, wp_salt( 'auth' ) );
	}

	public static function normalize_code( string $code ): string {
		$code = strtoupper( trim( $code ) );
		return preg_replace( '/[^A-Z0-9]/', '', $code ) ?: '';
	}

	private static function random_code(): string {
		$raw = '';
		$max = strlen( self::CODE_ALPHABET ) - 1;
		for ( $i = 0; $i < 24; $i++ ) {
			$raw .= self::CODE_ALPHABET[ random_int( 0, $max ) ];
		}
		return 'P1B-' . implode( '-', str_split( $raw, 6 ) );
	}

	public static function create( array $values, string $request_id ): array|WP_Error {
		global $wpdb;
		$table       = PhaseOne_Bulk_Installer::access_table();
		$request_key = self::keyed_hash( sanitize_text_field( $request_id ) );
		$existing    = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$table} WHERE request_key = %s", $request_key ) );
		if ( $existing ) {
			return new WP_Error( 'phaseone_bulk_duplicate_request', 'This access-code request was already processed.' );
		}

		$code       = self::random_code();
		$normalized = self::normalize_code( $code );
		$expires_at = self::normalize_expiration( (string) ( $values['expires_at'] ?? '' ) );
		$limit_raw  = absint( $values['usage_limit'] ?? 0 );
		$now        = gmdate( 'Y-m-d H:i:s' );
		$inserted   = $wpdb->insert(
			$table,
			array(
				'code_lookup' => self::keyed_hash( $normalized ),
				'code_hash'   => wp_hash_password( $normalized ),
				'code_suffix' => substr( $normalized, -6 ),
				'request_key' => $request_key,
				'is_active'   => ! empty( $values['is_active'] ) ? 1 : 0,
				'expires_at'  => $expires_at,
				'usage_limit' => $limit_raw > 0 ? $limit_raw : null,
				'uses'        => 0,
				'notes'       => sanitize_textarea_field( $values['notes'] ?? '' ),
				'created_by'  => get_current_user_id(),
				'created_at'  => $now,
				'updated_at'  => $now,
			),
			array( '%s', '%s', '%s', '%s', '%d', '%s', '%d', '%d', '%s', '%d', '%s', '%s' )
		);

		if ( false === $inserted ) {
			return new WP_Error( 'phaseone_bulk_access_create_failed', 'The access code could not be created.' );
		}

		return array(
			'id'   => (int) $wpdb->insert_id,
			'code' => $code,
		);
	}

	private static function normalize_expiration( string $value ): ?string {
		$value = trim( $value );
		if ( '' === $value ) {
			return null;
		}
		try {
			$local = new DateTimeImmutable( $value, wp_timezone() );
			return $local->setTimezone( new DateTimeZone( 'UTC' ) )->format( 'Y-m-d H:i:s' );
		} catch ( Throwable $exception ) {
			return null;
		}
	}

	public static function list_all(): array {
		global $wpdb;
		$table = PhaseOne_Bulk_Installer::access_table();
		$rows  = $wpdb->get_results( "SELECT * FROM {$table} ORDER BY created_at DESC LIMIT 250", ARRAY_A );
		return is_array( $rows ) ? $rows : array();
	}

	public static function set_active( int $id, bool $active ): bool {
		global $wpdb;
		$updated = $wpdb->update(
			PhaseOne_Bulk_Installer::access_table(),
			array(
				'is_active' => $active ? 1 : 0,
				'updated_at' => gmdate( 'Y-m-d H:i:s' ),
			),
			array( 'id' => $id ),
			array( '%d', '%s' ),
			array( '%d' )
		);
		return false !== $updated;
	}

	public static function revoke( int $id ): bool {
		global $wpdb;
		$now = gmdate( 'Y-m-d H:i:s' );
		$wpdb->query( $wpdb->prepare( 'UPDATE ' . PhaseOne_Bulk_Installer::sessions_table() . ' SET revoked_at = %s WHERE access_id = %d AND revoked_at IS NULL', $now, $id ) );
		$updated = $wpdb->update(
			PhaseOne_Bulk_Installer::access_table(),
			array(
				'is_active' => 0,
				'revoked_at' => $now,
				'updated_at' => $now,
			),
			array( 'id' => $id ),
			array( '%d', '%s', '%s' ),
			array( '%d' )
		);
		return false !== $updated;
	}

	public static function create_session( string $code, string $ip = '', string $user_agent = '' ): array|WP_Error {
		global $wpdb;
		$normalized = self::normalize_code( $code );
		if ( strlen( $normalized ) < 20 ) {
			return self::invalid_code();
		}

		$table = PhaseOne_Bulk_Installer::access_table();
		$row   = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE code_lookup = %s LIMIT 1", self::keyed_hash( $normalized ) ), ARRAY_A );
		if ( ! is_array( $row ) || ! wp_check_password( $normalized, (string) $row['code_hash'] ) ) {
			return self::invalid_code();
		}

		$now = gmdate( 'Y-m-d H:i:s' );
		if ( empty( $row['is_active'] ) || ! empty( $row['revoked_at'] ) || ( ! empty( $row['expires_at'] ) && $row['expires_at'] <= $now ) ) {
			return self::invalid_code();
		}

		$changed = $wpdb->query(
			$wpdb->prepare(
				"UPDATE {$table} SET uses = uses + 1, last_used_at = %s, updated_at = %s WHERE id = %d AND is_active = 1 AND revoked_at IS NULL AND (expires_at IS NULL OR expires_at > %s) AND (usage_limit IS NULL OR uses < usage_limit)",
				$now,
				$now,
				(int) $row['id'],
				$now
			)
		);
		if ( 1 !== $changed ) {
			return self::invalid_code();
		}

		$token      = bin2hex( random_bytes( 32 ) );
		$settings   = PhaseOne_Bulk_Installer::settings();
		$expires_ts = time() + ( (int) $settings['session_hours'] * HOUR_IN_SECONDS );
		if ( ! empty( $row['expires_at'] ) ) {
			$expires_ts = min( $expires_ts, (int) strtotime( $row['expires_at'] . ' UTC' ) );
		}
		$expires_at = gmdate( 'Y-m-d H:i:s', $expires_ts );
		$inserted   = $wpdb->insert(
			PhaseOne_Bulk_Installer::sessions_table(),
			array(
				'token_lookup'   => self::keyed_hash( $token ),
				'access_id'      => (int) $row['id'],
				'expires_at'     => $expires_at,
				'created_at'     => $now,
				'last_seen_at'   => $now,
				'ip_hash'        => self::keyed_hash( trim( $ip ) ),
				'user_agent_hash' => self::keyed_hash( substr( trim( $user_agent ), 0, 500 ) ),
			),
			array( '%s', '%d', '%s', '%s', '%s', '%s', '%s' )
		);
		if ( false === $inserted ) {
			return new WP_Error( 'phaseone_bulk_session_failed', 'Access is temporarily unavailable.', array( 'status' => 503 ) );
		}

		return array(
			'token'      => $token,
			'access_id'  => (int) $row['id'],
			'session_id' => (int) $wpdb->insert_id,
			'expires_at' => gmdate( DATE_ATOM, $expires_ts ),
			'max_age'    => max( 1, $expires_ts - time() ),
		);
	}

	public static function validate_session( string $token, bool $touch = true ): array|WP_Error {
		global $wpdb;
		$token = trim( $token );
		if ( strlen( $token ) !== 64 || ! ctype_xdigit( $token ) ) {
			return self::invalid_session();
		}

		$sessions = PhaseOne_Bulk_Installer::sessions_table();
		$access   = PhaseOne_Bulk_Installer::access_table();
		$now      = gmdate( 'Y-m-d H:i:s' );
		$row      = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT s.*, a.is_active AS access_active, a.expires_at AS access_expires_at, a.revoked_at AS access_revoked_at FROM {$sessions} s INNER JOIN {$access} a ON a.id = s.access_id WHERE s.token_lookup = %s LIMIT 1",
				self::keyed_hash( $token )
			),
			ARRAY_A
		);

		if ( ! is_array( $row ) || ! empty( $row['revoked_at'] ) || empty( $row['access_active'] ) || ! empty( $row['access_revoked_at'] ) || $row['expires_at'] <= $now || ( ! empty( $row['access_expires_at'] ) && $row['access_expires_at'] <= $now ) ) {
			return self::invalid_session();
		}

		if ( $touch && strtotime( $row['last_seen_at'] . ' UTC' ) < time() - 300 ) {
			$wpdb->update( $sessions, array( 'last_seen_at' => $now ), array( 'id' => (int) $row['id'] ), array( '%s' ), array( '%d' ) );
			$row['last_seen_at'] = $now;
		}

		return $row;
	}

	public static function revoke_session( string $token ): bool {
		global $wpdb;
		$token = trim( $token );
		if ( strlen( $token ) !== 64 || ! ctype_xdigit( $token ) ) {
			return false;
		}
		$updated = $wpdb->update(
			PhaseOne_Bulk_Installer::sessions_table(),
			array( 'revoked_at' => gmdate( 'Y-m-d H:i:s' ) ),
			array( 'token_lookup' => self::keyed_hash( $token ), 'revoked_at' => null ),
			array( '%s' ),
			array( '%s', '%s' )
		);
		return false !== $updated;
	}

	private static function invalid_code(): WP_Error {
		return new WP_Error( 'phaseone_bulk_access_denied', 'This access code is invalid or no longer available.', array( 'status' => 403 ) );
	}

	private static function invalid_session(): WP_Error {
		return new WP_Error( 'phaseone_bulk_session_invalid', 'Your Bulk access session has expired.', array( 'status' => 401 ) );
	}
}
