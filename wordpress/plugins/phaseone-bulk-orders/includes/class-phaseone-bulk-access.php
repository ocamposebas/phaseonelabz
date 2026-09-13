<?php

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Bulk_Access {
	private const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
	public const META_TIER = '_phaseone_bulk_tier';
	public const META_TIER_GRANTED_AT = '_phaseone_bulk_tier_granted_at';
	public const META_TIER_GRANTED_BY = '_phaseone_bulk_tier_granted_by';
	public const META_TIER_NOTE = '_phaseone_bulk_tier_note';

	public static function mode(): string {
		return 'private';
	}

	public static function is_public(): bool {
		return false;
	}

	public static function has_special_tier( int $customer_id ): bool {
		return $customer_id > 0 && 'special' === sanitize_key( (string) get_user_meta( $customer_id, self::META_TIER, true ) );
	}

	public static function grant_special_tier( int $customer_id, string $note = '' ): bool|WP_Error {
		if ( $customer_id <= 0 || ! get_userdata( $customer_id ) ) {
			return new WP_Error( 'phaseone_bulk_customer_missing', 'Choose a valid customer.' );
		}
		if ( self::completed_orders( $customer_id ) < 1 ) {
			return new WP_Error( 'phaseone_bulk_customer_ineligible', 'This customer needs at least one completed order before Special Tier can be granted.' );
		}
		update_user_meta( $customer_id, self::META_TIER, 'special' );
		update_user_meta( $customer_id, self::META_TIER_GRANTED_AT, gmdate( DATE_ATOM ) );
		update_user_meta( $customer_id, self::META_TIER_GRANTED_BY, get_current_user_id() );
		update_user_meta( $customer_id, self::META_TIER_NOTE, sanitize_textarea_field( $note ) );
		return true;
	}

	public static function remove_special_tier( int $customer_id ): bool {
		delete_user_meta( $customer_id, self::META_TIER );
		delete_user_meta( $customer_id, self::META_TIER_GRANTED_AT );
		delete_user_meta( $customer_id, self::META_TIER_GRANTED_BY );
		delete_user_meta( $customer_id, self::META_TIER_NOTE );
		self::revoke_customer_sessions( $customer_id, 'tier' );
		return true;
	}

	public static function completed_orders( int $customer_id ): int {
		if ( $customer_id <= 0 || ! function_exists( 'wc_get_orders' ) ) {
			return 0;
		}
		$result = wc_get_orders(
			array(
				'customer_id' => $customer_id,
				'status'      => array( 'wc-completed' ),
				'limit'       => 1,
				'paginate'    => true,
				'return'      => 'ids',
			)
		);
		if ( is_object( $result ) && isset( $result->total ) ) {
			return max( 0, (int) $result->total );
		}
		return is_array( $result ) ? count( $result ) : 0;
	}

	public static function customer_status( int $customer_id ): array {
		$user = $customer_id > 0 ? get_userdata( $customer_id ) : false;
		$completed = $user ? self::completed_orders( $customer_id ) : 0;
		$temporary = $user ? self::temporary_access( $customer_id ) : null;
		return array(
			'customer_id'      => $user ? (int) $user->ID : 0,
			'name'             => $user ? (string) $user->display_name : '',
			'email'            => $user ? (string) $user->user_email : '',
			'completed_orders' => $completed,
			'eligible'         => $completed >= 1,
			'tier'             => $user && self::has_special_tier( $customer_id ) ? 'special' : 'standard',
			'temporary_access' => is_array( $temporary ),
			'temporary_expires_at' => is_array( $temporary ) ? gmdate( DATE_ATOM, strtotime( $temporary['expires_at'] . ' UTC' ) ) : null,
		);
	}

	/**
	 * Returns the single authorization context consumed by catalog, quote,
	 * checkout intent and payment flows. A valid opaque session is always
	 * required; Special Tier creates that session automatically via ensure().
	 */
	public static function context( string $token, int $customer_id = 0 ): array|WP_Error {
		return self::validate_session( $token, true, $customer_id );
	}

	public static function ensure( string $token, int $customer_id, string $ip = '', string $user_agent = '' ): array|WP_Error {
		if ( $customer_id > 0 && self::has_special_tier( $customer_id ) ) {
			$current = self::validate_session( $token, true, $customer_id );
			if ( ! is_wp_error( $current ) && 'tier' === $current['source'] ) {
				return $current;
			}
			return self::create_tier_session( $customer_id, $ip, $user_agent );
		}
		return self::validate_session( $token, true, $customer_id );
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
		return array( 'id' => (int) $wpdb->insert_id, 'code' => $code );
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
			array( 'is_active' => $active ? 1 : 0, 'updated_at' => gmdate( 'Y-m-d H:i:s' ) ),
			array( 'id' => $id ),
			array( '%d', '%s' ),
			array( '%d' )
		);
		return false !== $updated;
	}

	public static function revoke( int $id ): bool {
		global $wpdb;
		$now = gmdate( 'Y-m-d H:i:s' );
		$wpdb->query( $wpdb->prepare( 'UPDATE ' . PhaseOne_Bulk_Installer::sessions_table() . ' SET revoked_at = %s WHERE access_id = %d AND source = %s AND revoked_at IS NULL', $now, $id, 'code' ) );
		$updated = $wpdb->update(
			PhaseOne_Bulk_Installer::access_table(),
			array( 'is_active' => 0, 'revoked_at' => $now, 'updated_at' => $now ),
			array( 'id' => $id ),
			array( '%d', '%s', '%s' ),
			array( '%d' )
		);
		return false !== $updated;
	}

	public static function create_session( string $code, string $ip = '', string $user_agent = '', int $customer_id = 0 ): array|WP_Error {
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
		$expires_cap = ! empty( $row['expires_at'] ) ? (int) strtotime( $row['expires_at'] . ' UTC' ) : 0;
		return self::insert_session( 'code', (int) $row['id'], $customer_id, $ip, $user_agent, $expires_cap );
	}

	public static function create_tier_session( int $customer_id, string $ip = '', string $user_agent = '' ): array|WP_Error {
		if ( ! self::has_special_tier( $customer_id ) ) {
			return self::invalid_session();
		}
		self::revoke_customer_sessions( $customer_id, 'tier' );
		return self::insert_session( 'tier', 0, $customer_id, $ip, $user_agent );
	}

	private static function insert_session( string $source, int $access_id, int $customer_id, string $ip, string $user_agent, int $expires_cap = 0 ): array|WP_Error {
		global $wpdb;
		$token      = bin2hex( random_bytes( 32 ) );
		$settings   = PhaseOne_Bulk_Installer::settings();
		$expires_ts = time() + ( (int) $settings['session_days'] * DAY_IN_SECONDS );
		if ( $expires_cap > 0 ) {
			$expires_ts = min( $expires_ts, $expires_cap );
		}
		$now = gmdate( 'Y-m-d H:i:s' );
		$inserted = $wpdb->insert(
			PhaseOne_Bulk_Installer::sessions_table(),
			array(
				'token_lookup'    => self::keyed_hash( $token ),
				'access_id'       => $access_id,
				'customer_id'     => max( 0, $customer_id ),
				'source'          => 'tier' === $source ? 'tier' : 'code',
				'expires_at'      => gmdate( 'Y-m-d H:i:s', $expires_ts ),
				'created_at'      => $now,
				'last_seen_at'    => $now,
				'ip_hash'         => self::keyed_hash( trim( $ip ) ),
				'user_agent_hash' => self::keyed_hash( substr( trim( $user_agent ), 0, 500 ) ),
			),
			array( '%s', '%d', '%d', '%s', '%s', '%s', '%s', '%s' )
		);
		if ( false === $inserted ) {
			return new WP_Error( 'phaseone_bulk_session_failed', 'Access is temporarily unavailable.', array( 'status' => 503 ) );
		}
		return array(
			'token'       => $token,
			'id'          => (int) $wpdb->insert_id,
			'access_id'   => $access_id,
			'customer_id' => max( 0, $customer_id ),
			'source'      => 'tier' === $source ? 'tier' : 'code',
			'access_mode' => 'private',
			'expires_at'  => gmdate( 'Y-m-d H:i:s', $expires_ts ),
			'max_age'     => max( 1, $expires_ts - time() ),
		);
	}

	public static function validate_session( string $token, bool $touch = true, int $customer_id = 0 ): array|WP_Error {
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
				"SELECT s.*, a.is_active AS access_active, a.expires_at AS access_expires_at, a.revoked_at AS access_revoked_at FROM {$sessions} s LEFT JOIN {$access} a ON a.id = s.access_id WHERE s.token_lookup = %s LIMIT 1",
				self::keyed_hash( $token )
			),
			ARRAY_A
		);
		if ( ! is_array( $row ) || ! empty( $row['revoked_at'] ) || $row['expires_at'] <= $now ) {
			return self::invalid_session();
		}
		$source = 'tier' === sanitize_key( (string) ( $row['source'] ?? '' ) ) ? 'tier' : 'code';
		if ( 'tier' === $source ) {
			if ( $customer_id <= 0 || empty( $row['customer_id'] ) || (int) $row['customer_id'] !== $customer_id || ! self::has_special_tier( (int) $row['customer_id'] ) ) {
				return self::invalid_session();
			}
		} elseif ( empty( $row['access_active'] ) || ! empty( $row['access_revoked_at'] ) || ( ! empty( $row['access_expires_at'] ) && $row['access_expires_at'] <= $now ) ) {
			return self::invalid_session();
		}
		if ( $customer_id > 0 && (int) $row['customer_id'] > 0 && (int) $row['customer_id'] !== $customer_id ) {
			return new WP_Error( 'phaseone_bulk_customer_mismatch', 'This Bulk session belongs to another account.', array( 'status' => 403 ) );
		}
		if ( $touch && strtotime( $row['last_seen_at'] . ' UTC' ) < time() - 300 ) {
			$wpdb->update( $sessions, array( 'last_seen_at' => $now ), array( 'id' => (int) $row['id'] ), array( '%s' ), array( '%d' ) );
			$row['last_seen_at'] = $now;
		}
		$row['source'] = $source;
		$row['access_mode'] = 'private';
		return $row;
	}

	public static function temporary_access( int $customer_id ): ?array {
		global $wpdb;
		if ( $customer_id <= 0 ) {
			return null;
		}
		$now = gmdate( 'Y-m-d H:i:s' );
		$sessions = PhaseOne_Bulk_Installer::sessions_table();
		$access = PhaseOne_Bulk_Installer::access_table();
		$row = $wpdb->get_row(
			$wpdb->prepare(
				"SELECT s.* FROM {$sessions} s INNER JOIN {$access} a ON a.id = s.access_id WHERE s.customer_id = %d AND s.source = %s AND s.revoked_at IS NULL AND s.expires_at > %s AND a.is_active = 1 AND a.revoked_at IS NULL AND (a.expires_at IS NULL OR a.expires_at > %s) ORDER BY s.expires_at DESC LIMIT 1",
				$customer_id,
				'code',
				$now,
				$now
			),
			ARRAY_A
		);
		return is_array( $row ) ? $row : null;
	}

	public static function revoke_customer_sessions( int $customer_id, string $source = '' ): int {
		global $wpdb;
		if ( $customer_id <= 0 ) {
			return 0;
		}
		$sql = 'UPDATE ' . PhaseOne_Bulk_Installer::sessions_table() . ' SET revoked_at = %s WHERE customer_id = %d AND revoked_at IS NULL';
		$args = array( gmdate( 'Y-m-d H:i:s' ), $customer_id );
		if ( in_array( $source, array( 'code', 'tier' ), true ) ) {
			$sql .= ' AND source = %s';
			$args[] = $source;
		}
		return max( 0, (int) $wpdb->query( $wpdb->prepare( $sql, ...$args ) ) );
	}

	public static function revoke_session( string $token ): bool {
		global $wpdb;
		$token = trim( $token );
		if ( strlen( $token ) !== 64 || ! ctype_xdigit( $token ) ) {
			return false;
		}
		$updated = $wpdb->query(
			$wpdb->prepare(
				'UPDATE ' . PhaseOne_Bulk_Installer::sessions_table() . ' SET revoked_at = %s WHERE token_lookup = %s AND revoked_at IS NULL',
				gmdate( 'Y-m-d H:i:s' ),
				self::keyed_hash( $token )
			)
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
