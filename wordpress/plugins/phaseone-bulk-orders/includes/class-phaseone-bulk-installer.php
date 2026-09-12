<?php

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Bulk_Installer {
	private const SCHEMA_VERSION = '1';

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

	public static function activate(): void {
		global $wpdb;

		require_once ABSPATH . 'wp-admin/includes/upgrade.php';
		$charset = $wpdb->get_charset_collate();
		$access  = self::access_table();
		$sessions = self::sessions_table();
		$intents = self::intents_table();

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
				access_id bigint(20) unsigned NOT NULL,
				expires_at datetime NOT NULL,
				created_at datetime NOT NULL,
				last_seen_at datetime NOT NULL,
				revoked_at datetime NULL,
				ip_hash char(64) NOT NULL DEFAULT '',
				user_agent_hash char(64) NOT NULL DEFAULT '',
				PRIMARY KEY  (id),
				UNIQUE KEY token_lookup (token_lookup),
				KEY access_id (access_id),
				KEY expires_at (expires_at)
			) {$charset};"
		);

		dbDelta(
			"CREATE TABLE {$intents} (
				id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
				token_lookup char(64) NOT NULL,
				session_id bigint(20) unsigned NOT NULL,
				access_id bigint(20) unsigned NOT NULL,
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

		if ( false === get_option( 'phaseone_bulk_settings', false ) ) {
			add_option(
				'phaseone_bulk_settings',
				array(
					'session_hours'  => 24,
					'intent_minutes' => 30,
					'access_mode'    => 'private',
				),
				'',
				false
			);
		}

		update_option( 'phaseone_bulk_schema_version', self::SCHEMA_VERSION, false );
		if ( ! wp_next_scheduled( 'phaseone_bulk_cleanup' ) ) {
			wp_schedule_event( time() + HOUR_IN_SECONDS, 'hourly', 'phaseone_bulk_cleanup' );
		}
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
		$stored = is_array( $stored ) ? $stored : array();
		$access_mode = 'public' === sanitize_key( (string) ( $stored['access_mode'] ?? '' ) ) ? 'public' : 'private';
		return array(
			'session_hours'  => max( 1, min( 168, absint( $stored['session_hours'] ?? 24 ) ) ),
			'intent_minutes' => max( 5, min( 120, absint( $stored['intent_minutes'] ?? 30 ) ) ),
			'access_mode'    => $access_mode,
		);
	}
}
