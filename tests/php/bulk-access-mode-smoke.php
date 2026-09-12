<?php

declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );
define( 'MINUTE_IN_SECONDS', 60 );

$phaseone_bulk_test_settings = array();

function get_option( string $key, mixed $default = false ): mixed {
	global $phaseone_bulk_test_settings;
	return 'phaseone_bulk_settings' === $key ? $phaseone_bulk_test_settings : $default;
}

function sanitize_key( string $value ): string {
	return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( $value ) ) ?: '';
}

function absint( mixed $value ): int {
	return abs( (int) $value );
}

class WP_Error {
	public function __construct(
		public string $code = '',
		public string $message = '',
		public mixed $data = null
	) {}
}

function is_wp_error( mixed $value ): bool {
	return $value instanceof WP_Error;
}

require_once dirname( __DIR__, 2 ) . '/wordpress/plugins/phaseone-bulk-orders/includes/class-phaseone-bulk-installer.php';
require_once dirname( __DIR__, 2 ) . '/wordpress/plugins/phaseone-bulk-orders/includes/class-phaseone-bulk-access.php';

function assert_bulk_access( bool $condition, string $message ): void {
	if ( ! $condition ) {
		fwrite( STDERR, "FAIL: {$message}\n" );
		exit( 1 );
	}
}

$phaseone_bulk_test_settings = array( 'access_mode' => 'private' );
$private = PhaseOne_Bulk_Access::context( '' );
assert_bulk_access( is_wp_error( $private ), 'Private mode must reject a missing customer session.' );
assert_bulk_access( 401 === (int) $private->data['status'], 'Private rejection must use HTTP 401.' );

$phaseone_bulk_test_settings = array( 'access_mode' => 'public', 'intent_minutes' => 30 );
$public = PhaseOne_Bulk_Access::context( '' );
assert_bulk_access( is_array( $public ), 'Public mode must create an anonymous authorization context.' );
assert_bulk_access( 'public' === $public['access_mode'], 'Public context must be explicitly marked.' );
assert_bulk_access( 0 === $public['id'] && 0 === $public['access_id'], 'Public context must not impersonate an Access Code session.' );
assert_bulk_access( strtotime( $public['expires_at'] . ' UTC' ) > time(), 'Public context must have a bounded intent lifetime.' );

echo "Bulk access mode smoke tests passed.\n";
