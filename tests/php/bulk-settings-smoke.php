<?php

define( 'ABSPATH', __DIR__ . '/' );

$phaseone_bulk_options = array(
	'phaseone_bulk_settings' => array(
		'session_days' => 14,
		'intent_minutes' => 30,
		'access_mode' => 'private',
		'catalog_mode' => 'include_all',
		'global_discount' => 45,
		'default_minimum' => 10,
		'excluded_category_ids' => array(),
		'excluded_family_ids' => array(),
		'public_title' => 'Bulk Orders',
		'public_intro' => 'Private pricing.',
		'pricing_revision' => 'revision-before',
	),
);
$phaseone_bulk_cache_deletes = array();
$phaseone_bulk_uuid = 0;

final class WP_Error {
	public function __construct( public string $code = '', public string $message = '' ) {}
	public function get_error_code(): string { return $this->code; }
}

function is_wp_error( mixed $value ): bool { return $value instanceof WP_Error; }
function get_option( string $key, mixed $default = false ): mixed { global $phaseone_bulk_options; return $phaseone_bulk_options[ $key ] ?? $default; }
function update_option( string $key, mixed $value, bool $autoload = false ): bool { global $phaseone_bulk_options; $phaseone_bulk_options[ $key ] = $value; return true; }
function sanitize_key( mixed $value ): string { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $value ) ) ?: ''; }
function sanitize_text_field( mixed $value ): string { return trim( strip_tags( (string) $value ) ); }
function sanitize_textarea_field( mixed $value ): string { return trim( strip_tags( (string) $value ) ); }
function absint( mixed $value ): int { return abs( (int) $value ); }
function wp_json_encode( mixed $value ): string { return json_encode( $value ); }
function wp_generate_uuid4(): string { global $phaseone_bulk_uuid; $phaseone_bulk_uuid++; return 'revision-' . $phaseone_bulk_uuid; }
function wp_cache_delete( string $key, string $group ): bool { global $phaseone_bulk_cache_deletes; $phaseone_bulk_cache_deletes[] = $group . ':' . $key; return true; }

require_once dirname( __DIR__, 2 ) . '/wordpress/plugins/phaseone-bulk-orders/includes/class-phaseone-bulk-installer.php';

function expect_setting( bool $condition, string $message ): void {
	if ( ! $condition ) {
		fwrite( STDERR, "FAIL: {$message}\n" );
		exit( 1 );
	}
}

expect_setting( 47.5 === PhaseOne_Bulk_Installer::validate_discount( '47,5' ), 'decimal comma must sanitize to a decimal discount' );
expect_setting( is_wp_error( PhaseOne_Bulk_Installer::validate_discount( '-1' ) ), 'negative discounts must be rejected' );
expect_setting( is_wp_error( PhaseOne_Bulk_Installer::validate_discount( '100' ) ), 'free-product discounts must be rejected' );
expect_setting( is_wp_error( PhaseOne_Bulk_Installer::validate_discount( 'discount' ) ), 'non-numeric discounts must be rejected' );

$changed = PhaseOne_Bulk_Installer::update_settings( array( 'global_discount' => '47.5' ) );
expect_setting( true === $changed, 'a valid decimal global discount must save' );
expect_setting( 47.5 === $phaseone_bulk_options['phaseone_bulk_settings']['global_discount'], 'the sanitized decimal must be persisted' );
expect_setting( 'revision-before' !== $phaseone_bulk_options['phaseone_bulk_settings']['pricing_revision'], 'pricing changes must rotate the revision' );
expect_setting( in_array( 'phaseone_bulk:catalog', $phaseone_bulk_cache_deletes, true ) && in_array( 'phaseone_bulk:program', $phaseone_bulk_cache_deletes, true ), 'pricing changes must invalidate catalog and public-program caches' );

$revision = $phaseone_bulk_options['phaseone_bulk_settings']['pricing_revision'];
PhaseOne_Bulk_Installer::update_settings( array( 'public_title' => 'Wholesale Program' ) );
expect_setting( $revision === $phaseone_bulk_options['phaseone_bulk_settings']['pricing_revision'], 'copy-only changes must not invalidate checkout fingerprints' );

echo "Bulk settings smoke tests passed.\n";
