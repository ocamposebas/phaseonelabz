<?php

declare(strict_types=1);

define( 'ABSPATH', __DIR__ . '/' );

$phaseone_bulk_test_user_meta = array();
$phaseone_bulk_customer_orders = array();
$phaseone_bulk_email_orders = array();

function sanitize_key( string $value ): string { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( $value ) ) ?: ''; }
function sanitize_email( string $value ): string { return strtolower( trim( $value ) ); }
function absint( mixed $value ): int { return abs( (int) $value ); }
function sanitize_textarea_field( string $value ): string { return trim( strip_tags( $value ) ); }
function get_user_meta( int $customer_id, string $key, bool $single = true ): mixed {
	global $phaseone_bulk_test_user_meta;
	return $phaseone_bulk_test_user_meta[ $customer_id ][ $key ] ?? '';
}
function update_user_meta( int $customer_id, string $key, mixed $value ): bool {
	global $phaseone_bulk_test_user_meta;
	$phaseone_bulk_test_user_meta[ $customer_id ][ $key ] = $value;
	return true;
}
function delete_user_meta( int $customer_id, string $key ): bool {
	global $phaseone_bulk_test_user_meta;
	unset( $phaseone_bulk_test_user_meta[ $customer_id ][ $key ] );
	return true;
}
function get_userdata( int $customer_id ): object|false {
	return 7 === $customer_id ? (object) array( 'ID' => 7, 'display_name' => 'Bulk Customer', 'user_email' => 'bulk@example.com' ) : false;
}
function wc_get_orders( array $args = array() ): array {
	global $phaseone_bulk_customer_orders, $phaseone_bulk_email_orders;
	if ( isset( $args['customer_id'] ) ) {
		return $phaseone_bulk_customer_orders[ (int) $args['customer_id'] ] ?? array();
	}
	if ( isset( $args['billing_email'] ) ) {
		return $phaseone_bulk_email_orders[ strtolower( (string) $args['billing_email'] ) ] ?? array();
	}
	return array();
}
function get_current_user_id(): int { return 99; }

final class WP_Error {
	public function __construct( public string $code = '', public string $message = '', public mixed $data = null ) {}
	public function get_error_code(): string { return $this->code; }
}

function is_wp_error( mixed $value ): bool { return $value instanceof WP_Error; }

require_once dirname( __DIR__, 2 ) . '/wordpress/plugins/phaseone-bulk-orders/includes/class-phaseone-bulk-access.php';

function assert_bulk_access( bool $condition, string $message ): void {
	if ( ! $condition ) {
		fwrite( STDERR, "FAIL: {$message}\n" );
		exit( 1 );
	}
}

assert_bulk_access( 'private' === PhaseOne_Bulk_Access::mode() && ! PhaseOne_Bulk_Access::is_public(), 'private catalog data must never be public' );
$missing = PhaseOne_Bulk_Access::context( '' );
assert_bulk_access( is_wp_error( $missing ) && 401 === (int) $missing->data['status'], 'a missing session must be rejected' );

$ineligible = PhaseOne_Bulk_Access::grant_special_tier( 7 );
assert_bulk_access( is_wp_error( $ineligible ) && 'phaseone_bulk_customer_ineligible' === $ineligible->get_error_code(), 'an order alone makes the customer eligible; it must not auto-grant access' );

$phaseone_bulk_email_orders['bulk@example.com'] = array( 701 );
assert_bulk_access( 1 === PhaseOne_Bulk_Access::completed_orders( 7 ), 'a completed guest order with the verified account billing email is eligible' );

$phaseone_bulk_customer_orders[7] = array( 702 );
$phaseone_bulk_email_orders['bulk@example.com'] = array( 701, 702 );
assert_bulk_access( 2 === PhaseOne_Bulk_Access::completed_orders( 7 ), 'customer-ID and billing-email matches are merged without duplicate orders' );

$granted = PhaseOne_Bulk_Access::grant_special_tier( 7, 'Reviewed manually' );
assert_bulk_access( true === $granted && PhaseOne_Bulk_Access::has_special_tier( 7 ), 'an eligible customer can be manually granted Special Tier' );

echo "Bulk access policy smoke tests passed.\n";
