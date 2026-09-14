<?php

define( 'ABSPATH', __DIR__ );
define( 'MINUTE_IN_SECONDS', 60 );

function add_action() {}
function delete_transient() {}
function sanitize_text_field( $value ) { return trim( strip_tags( (string) $value ) ); }
function sanitize_key( $value ) { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $value ) ); }
function absint( $value ) { return abs( (int) $value ); }
function esc_url_raw( $value ) { return (string) $value; }
function wp_parse_url( $url, $component = -1 ) { return parse_url( $url, $component ); }
function wp_generate_uuid4() { return '11111111-2222-4333-8444-555555555555'; }
function is_wp_error( $value ) { return $value instanceof WP_Error; }

class WP_Error {}
class WC_Product {
	private $sku;
	public function __construct( $sku ) { $this->sku = $sku; }
	public function get_sku() { return $this->sku; }
}
class WC_Order_Item_Product {
	private $product;
	private $product_id;
	private $variation_id;
	private $quantity;
	private $meta = array();
	public $saved = 0;
	public function __construct( $product_id, $variation_id, $sku, $quantity ) {
		$this->product = new WC_Product( $sku );
		$this->product_id = $product_id;
		$this->variation_id = $variation_id;
		$this->quantity = $quantity;
	}
	public function get_product() { return $this->product; }
	public function get_product_id() { return $this->product_id; }
	public function get_variation_id() { return $this->variation_id; }
	public function get_quantity() { return $this->quantity; }
	public function get_meta( $key ) { return isset( $this->meta[ $key ] ) ? $this->meta[ $key ] : ''; }
	public function update_meta_data( $key, $value ) { $this->meta[ $key ] = $value; }
	public function save() { $this->saved++; }
}

require dirname( __DIR__, 2 ) . '/wordpress/plugins/phaseone-order-coas/phaseone-order-coas.php';

function expect_true( $condition, $message ) {
	if ( ! $condition ) {
		fwrite( STDERR, "FAILED: {$message}\n" );
		exit( 1 );
	}
}

function coa_record( $id, $lot, $date, $current, $url ) {
	return array(
		'id' => $id,
		'post_id' => (int) $id,
		'coa_number' => 'COA-' . $id,
		'product_name' => 'Test Product',
		'product_ids' => array( 10 ),
		'parent_product_ids' => array(),
		'variation_ids' => array( 11 ),
		'skus' => array( 'SKU-11' ),
		'strength' => '10 mg',
		'lot' => $lot,
		'testing_date' => $date,
		'laboratory' => 'Test Lab',
		'test_method' => 'HPLC',
		'purity' => '99.9%',
		'status' => 'Available',
		'current_shipping_lot' => $current,
		'file_attachment_id' => (int) $id,
		'view_url' => $url,
		'file_kind' => 'pdf',
	);
}

$item = new WC_Order_Item_Product( 10, 11, 'SKU-11', 3 );
$current = coa_record( '101', 'LOT-A', 'Jan 1, 2026', true, 'https://example.test/lot-a.pdf' );
$newer = coa_record( '102', 'LOT-B', 'Sep 1, 2026', false, 'https://example.test/lot-b.pdf' );
$catalog = array( $newer, $current );

$preferred = phaseone_order_coas_preferred_candidate( $item, $catalog );
expect_true( 'LOT-A' === $preferred['lot'], 'The marked current shipping lot must win over a newer previous lot.' );
$latest_fallback = phaseone_order_coas_preferred_candidate(
	$item,
	array(
		coa_record( '103', 'LOT-OLD', 'Dec 15, 2025', false, 'https://example.test/old.pdf' ),
		coa_record( '104', 'LOT-LATEST', 'Sep 12, 2026', false, 'https://example.test/latest.pdf' ),
	)
);
expect_true( 'LOT-LATEST' === $latest_fallback['lot'], 'The newest testing date must be used when no lot is marked current.' );

$capture = phaseone_order_coas_capture_item_snapshot( $item, $catalog, 'purchase_snapshot' );
expect_true( 1 === $capture['assigned'], 'The current COA should be assigned once at purchase.' );
$assignments = phaseone_order_coas_assignments( $item );
expect_true( 1 === count( $assignments ), 'Exactly one automatic assignment should be stored.' );
expect_true( 'LOT-A' === $assignments[0]['coa_snapshot']['lot'], 'The lot must be snapshotted on the order item.' );
expect_true( 'https://example.test/lot-a.pdf' === $assignments[0]['coa_snapshot']['view_url'], 'The purchase-time file URL must be snapshotted.' );

$changed_live = coa_record( '101', 'LOT-CHANGED', 'Sep 13, 2026', true, 'https://example.test/changed.pdf' );
$resolved = phaseone_order_coas_assignment_record( $assignments[0], array( $changed_live, $newer ) );
expect_true( 'LOT-A' === $resolved['lot'], 'A later COA Manager edit must not replace the purchased lot.' );
expect_true( 'https://example.test/lot-a.pdf' === $resolved['view_url'], 'A later COA Manager edit must not replace the purchased file URL.' );
$offline_resolved = phaseone_order_coas_assignment_record( $assignments[0], array() );
expect_true( 'LOT-A' === $offline_resolved['lot'], 'The saved snapshot must remain available when the live catalog is unavailable.' );

$again = phaseone_order_coas_capture_item_snapshot( $item, array( $changed_live, $newer ), 'purchase_snapshot' );
expect_true( 0 === $again['assigned'], 'Automatic capture must be idempotent.' );
expect_true( 1 === count( phaseone_order_coas_assignments( $item ) ), 'An automatic retry must not duplicate assignments.' );

$legacy = new WC_Order_Item_Product( 10, 11, 'SKU-11', 2 );
$legacy->update_meta_data(
	PHASEONE_ORDER_COAS_META_KEY,
	array(
		array(
			'assignment_id' => 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
			'coa_id' => '102',
			'lot' => 'LOT-B',
			'quantity' => 2,
			'assigned_at' => '2026-09-01T00:00:00Z',
		),
	)
);
$enriched = phaseone_order_coas_capture_item_snapshot( $legacy, $catalog, 'historical_backfill' );
$legacy_assignments = phaseone_order_coas_assignments( $legacy );
expect_true( 1 === $enriched['enriched'], 'A legacy assignment should receive a snapshot.' );
expect_true( '102' === $legacy_assignments[0]['coa_id'], 'Historical enrichment must preserve the already-confirmed COA ID.' );
expect_true( 'LOT-B' === $legacy_assignments[0]['coa_snapshot']['lot'], 'Historical enrichment must snapshot its own assigned lot.' );

echo "Order COA snapshot smoke tests passed.\n";
