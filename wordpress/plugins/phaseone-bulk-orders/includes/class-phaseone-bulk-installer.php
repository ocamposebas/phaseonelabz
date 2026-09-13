<?php

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Bulk_Installer {
	private const SCHEMA_VERSION = '3';
	public const KIT_UNITS = 10;

	public static function access_table(): string {
		global $wpdb;
		return $wpdb->prefix . 'phaseone_bulk_access';
	}

	public static function sessions_table(): string {
		global $wpdb;
		return $wpdb->prefix . 'phaseone_bulk_sessions';
	}

	public static function intents_table(): string {
		global $wpdb;
		return $wpdb->prefix . 'phaseone_bulk_intents';
	}

	public static function requests_table(): string {
		global $wpdb;
		return $wpdb->prefix . 'phaseone_bulk_access_requests';
	}

	public static function defaults(): array {
		return array(
			'session_days'          => 14,
			'intent_minutes'        => 30,
			'access_mode'           => 'private',
			'catalog_mode'          => 'include_all',
			'global_discount'       => 50.0,
			'default_minimum'       => self::KIT_UNITS,
			'excluded_category_ids' => array(),
			'excluded_family_ids'   => array(),
			'public_title'          => 'Bulk Orders',
			'public_intro'          => 'Approved customers receive access to private bulk pricing.',
			'pricing_revision'      => '',
		);
	}

	public static function activate(): void {
		self::install_schema();
		if ( ! wp_next_scheduled( 'phaseone_bulk_cleanup' ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'hourly', 'phaseone_bulk_cleanup' );
		}
	}

	public static function maybe_upgrade(): void {
		if ( self::SCHEMA_VERSION !== (string) get_option( 'phaseone_bulk_schema_version', '' ) ) {
			self::install_schema();
		}
	}

	private static function install_schema(): void {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		$charset         = $wpdb->get_charset_collate();
		$access          = self::access_table();
		$sessions        = self::sessions_table();
		$intents         = self::intents_table();
		$requests        = self::requests_table();
		$previous_schema = (string) get_option( 'phaseone_bulk_schema_version', '' );

		dbDelta(
			"CREATE TABLE {$access} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				code_lookup char(64) NOT NULL,
				code_hash varchar(255) NOT NULL,
				code_suffix varchar(12) NOT NULL,
				request_key char(64) NOT NULL,
				is_active tinyint(1) unsigned NOT NULL DEFAULT 1,
				expires_at datetime NULL,
				usage_limit bigint(20) unsigned NULL,
				uses bigint(20) unsigned NOT NULL DEFAULT 0,
				notes text NULL,
				created_by bigint(20) unsigned NOT NULL DEFAULT 0,
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				last_used_at datetime NULL,
				revoked_at datetime NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY code_lookup (code_lookup),
				UNIQUE KEY request_key (request_key),
				KEY status_expiry (is_active, expires_at)
			) {$charset};"
		);

		dbDelta(
			"CREATE TABLE {$sessions} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				token_lookup char(64) NOT NULL,
				access_id bigint(20) unsigned NOT NULL DEFAULT 0,
				customer_id bigint(20) unsigned NOT NULL DEFAULT 0,
				source varchar(16) NOT NULL DEFAULT 'code',
				expires_at datetime NOT NULL,
				created_at datetime NOT NULL,
				last_seen_at datetime NOT NULL,
				revoked_at datetime NULL,
				ip_hash char(64) NOT NULL DEFAULT '',
				user_agent_hash char(64) NOT NULL DEFAULT '',
				PRIMARY KEY  (id),
				UNIQUE KEY token_lookup (token_lookup),
				KEY access_id (access_id),
				KEY customer_source (customer_id, source),
				KEY expires_at (expires_at)
			) {$charset};"
		);

		dbDelta(
			"CREATE TABLE {$intents} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				token_lookup char(64) NOT NULL,
				session_id bigint(20) unsigned NOT NULL,
				access_id bigint(20) unsigned NOT NULL DEFAULT 0,
				customer_id bigint(20) unsigned NOT NULL DEFAULT 0,
				cart_payload longtext NOT NULL,
				quote_fingerprint char(64) NOT NULL,
				status varchar(24) NOT NULL DEFAULT 'open',
				order_id bigint(20) unsigned NOT NULL DEFAULT 0,
				expires_at datetime NOT NULL,
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				UNIQUE KEY token_lookup (token_lookup),
				KEY session_id (session_id),
				KEY status_expiry (status, expires_at),
				KEY order_id (order_id)
			) {$charset};"
		);

		dbDelta(
			"CREATE TABLE {$requests} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				customer_id bigint(20) unsigned NOT NULL,
				customer_name varchar(190) NOT NULL,
				customer_email varchar(190) NOT NULL,
				completed_orders bigint(20) unsigned NOT NULL DEFAULT 0,
				eligible tinyint(1) unsigned NOT NULL DEFAULT 0,
				status varchar(20) NOT NULL DEFAULT 'pending',
				customer_note text NULL,
				internal_note text NULL,
				reviewed_by bigint(20) unsigned NOT NULL DEFAULT 0,
				reviewed_at datetime NULL,
				created_at datetime NOT NULL,
				updated_at datetime NOT NULL,
				PRIMARY KEY  (id),
				KEY customer_status (customer_id, status),
				KEY status_created (status, created_at)
			) {$charset};"
		);

		$stored = get_option( 'phaseone_bulk_settings', false );
		$catalog_migrated = false;
		if ( false === $stored || ! is_array( $stored ) ) {
			$stored = self::defaults();
		} else {
			/*
			 * Bulk v3 uses an exclusion-first catalog: every eligible WooCommerce
			 * SKU inherits global pricing unless an explicit product, variation,
			 * family or category exclusion says otherwise. Earlier upgrades were
			 * conservatively left in legacy opt-in mode, which could unlock a valid
			 * session but return an empty catalog.
			 */
			if ( ! array_key_exists( 'catalog_mode', $stored ) || ( version_compare( $previous_schema, '3', '<' ) && 'legacy_explicit' === sanitize_key( (string) $stored['catalog_mode'] ) ) ) {
				$stored['catalog_mode'] = 'include_all';
				$catalog_migrated = true;
			}
			if ( ! array_key_exists( 'session_days', $stored ) ) {
				$stored['session_days'] = 14;
			}
			$stored = array_merge( self::defaults(), $stored );
		}
		$stored = self::sanitize_settings( $stored );
		if ( '' === $stored['pricing_revision'] || $catalog_migrated ) {
			$stored['pricing_revision'] = wp_generate_uuid4();
		}
		update_option( 'phaseone_bulk_settings', $stored, false );
		update_option( 'phaseone_bulk_schema_version', self::SCHEMA_VERSION, false );
		wp_cache_delete( 'catalog', 'phaseone_bulk' );
		wp_cache_delete( 'program', 'phaseone_bulk' );
	}

	public static function deactivate(): void {
		wp_clear_scheduled_hook( 'phaseone_bulk_cleanup' );
	}

	public static function cleanup(): void {
		global $wpdb;
		$now = gmdate( 'Y-m-d H:i:s' );
		$wpdb->query( $wpdb->prepare( 'DELETE FROM ' . self::sessions_table() . ' WHERE expires_at < %s OR (revoked_at IS NOT NULL AND revoked_at < DATE_SUB(%s, INTERVAL 7 DAY))', $now, $now ) );
		$wpdb->query( $wpdb->prepare( 'DELETE FROM ' . self::intents_table() . ' WHERE expires_at < %s OR (status <> %s AND updated_at < DATE_SUB(%s, INTERVAL 7 DAY))', $now, 'open', $now ) );
	}

	public static function settings(): array {
		$stored = get_option( 'phaseone_bulk_settings', array() );
		return self::sanitize_settings( is_array( $stored ) ? array_merge( self::defaults(), $stored ) : self::defaults() );
	}

	public static function update_settings( array $values ): bool|WP_Error {
		$current = self::settings();
		if ( array_key_exists( 'global_discount', $values ) ) {
			$discount = self::validate_discount( $values['global_discount'] );
			if ( is_wp_error( $discount ) ) {
				return $discount;
			}
			$values['global_discount'] = $discount;
		}

		$next = self::sanitize_settings( array_merge( $current, $values ) );
		$pricing_keys = array( 'catalog_mode', 'global_discount', 'default_minimum', 'excluded_category_ids', 'excluded_family_ids' );
		$before = array_intersect_key( $current, array_flip( $pricing_keys ) );
		$after  = array_intersect_key( $next, array_flip( $pricing_keys ) );
		if ( wp_json_encode( $before ) !== wp_json_encode( $after ) ) {
			$next['pricing_revision'] = wp_generate_uuid4();
		}

		update_option( 'phaseone_bulk_settings', $next, false );
		wp_cache_delete( 'catalog', 'phaseone_bulk' );
		wp_cache_delete( 'program', 'phaseone_bulk' );
		return true;
	}

	public static function validate_discount( mixed $value ): float|WP_Error {
		$normalized = str_replace( ',', '.', trim( (string) $value ) );
		if ( '' === $normalized || ! is_numeric( $normalized ) ) {
			return new WP_Error( 'phaseone_bulk_invalid_discount', 'Global Bulk Discount must be a valid number.' );
		}
		$discount = round( (float) $normalized, 2 );
		if ( $discount < 0 || $discount >= 100 ) {
			return new WP_Error( 'phaseone_bulk_invalid_discount', 'Global Bulk Discount must be at least 0 and lower than 100.' );
		}
		return $discount;
	}

	private static function sanitize_settings( array $stored ): array {
		$defaults = self::defaults();
		$discount = self::validate_discount( $stored['global_discount'] ?? $defaults['global_discount'] );
		$discount = is_wp_error( $discount ) ? (float) $defaults['global_discount'] : $discount;
		$catalog_mode = sanitize_key( (string) ( $stored['catalog_mode'] ?? $defaults['catalog_mode'] ) );
		if ( ! in_array( $catalog_mode, array( 'include_all', 'legacy_explicit' ), true ) ) {
			$catalog_mode = (string) $defaults['catalog_mode'];
		}
		$minimum = max( self::KIT_UNITS, absint( $stored['default_minimum'] ?? self::KIT_UNITS ) );
		$minimum = (int) ceil( $minimum / self::KIT_UNITS ) * self::KIT_UNITS;

		return array(
			'session_days'          => max( 1, min( 3650, absint( $stored['session_days'] ?? $defaults['session_days'] ) ) ),
			'intent_minutes'        => max( 5, min( 120, absint( $stored['intent_minutes'] ?? $defaults['intent_minutes'] ) ) ),
			'access_mode'           => 'private',
			'catalog_mode'          => $catalog_mode,
			'global_discount'       => $discount,
			'default_minimum'       => $minimum,
			'excluded_category_ids' => self::id_list( $stored['excluded_category_ids'] ?? array() ),
			'excluded_family_ids'   => self::id_list( $stored['excluded_family_ids'] ?? array() ),
			'public_title'          => sanitize_text_field( (string) ( $stored['public_title'] ?? $defaults['public_title'] ) ),
			'public_intro'          => sanitize_textarea_field( (string) ( $stored['public_intro'] ?? $defaults['public_intro'] ) ),
			'pricing_revision'      => sanitize_text_field( (string) ( $stored['pricing_revision'] ?? '' ) ),
		);
	}

	private static function id_list( mixed $values ): array {
		$values = is_array( $values ) ? $values : explode( ',', (string) $values );
		$ids = array_values( array_unique( array_filter( array_map( 'absint', $values ) ) ) );
		sort( $ids, SORT_NUMERIC );
		return $ids;
	}
}
