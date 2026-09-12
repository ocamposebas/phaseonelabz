<?php

define( 'ABSPATH', __DIR__ );

final class WP_Error {
	private string $code;
	private string $message;
	private array $data;
	public function __construct( string $code, string $message, array $data = array() ) { $this->code = $code; $this->message = $message; $this->data = $data; }
	public function get_error_code(): string { return $this->code; }
	public function get_error_message(): string { return $this->message; }
}

function is_wp_error( mixed $value ): bool { return $value instanceof WP_Error; }
function absint( mixed $value ): int { return abs( (int) $value ); }
function sanitize_key( mixed $value ): string { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $value ) ); }
function sanitize_text_field( mixed $value ): string { return trim( strip_tags( (string) $value ) ); }
function wc_format_decimal( mixed $value, mixed $dp = false ): string { return number_format( (float) $value, false === $dp ? 2 : (int) $dp, '.', '' ); }
function wc_get_price_decimals(): int { return 2; }
function wp_json_encode( mixed $value ): string { return json_encode( $value, JSON_UNESCAPED_SLASHES ); }
function get_woocommerce_currency(): string { return 'USD'; }
function wp_strip_all_tags( mixed $value ): string { return strip_tags( (string) $value ); }
function wp_get_post_terms(): array { return array(); }
function wp_get_attachment_image_url(): string { return ''; }
function wc_placeholder_img_src(): string { return '/placeholder.png'; }
function wc_attribute_label( string $name ): string { return $name; }

class WC_Product {
	public function __construct(
		protected int $id,
		protected string $type,
		protected string $name,
		protected string $sku,
		protected array $meta,
		protected ?int $stock = 100,
		protected bool $backorders = false,
	) {}
	public function get_id(): int { return $this->id; }
	public function is_type( string $type ): bool { return $this->type === $type; }
	public function get_name(): string { return $this->name; }
	public function get_sku(): string { return $this->sku; }
	public function get_meta( string $key ): mixed { return $this->meta[ $key ] ?? ''; }
	public function is_purchasable(): bool { return true; }
	public function is_in_stock(): bool { return null === $this->stock || $this->stock > 0 || $this->backorders; }
	public function backorders_allowed(): bool { return $this->backorders; }
	public function managing_stock(): bool { return null !== $this->stock; }
	public function get_stock_quantity(): ?int { return $this->stock; }
	public function get_max_purchase_quantity(): int { return $this->backorders || null === $this->stock ? -1 : $this->stock; }
	public function get_image_id(): int { return 0; }
}

class WC_Product_Variation extends WC_Product {
	public function __construct( int $id, private int $parent_id, string $name, string $sku, array $meta, ?int $stock = 100 ) { parent::__construct( $id, 'variation', $name, $sku, $meta, $stock ); }
	public function get_parent_id(): int { return $this->parent_id; }
	public function get_variation_attributes(): array { return array( 'attribute_strength' => '10mg' ); }
}

$base = array(
	'_phaseone_bulk_enabled'       => 'yes',
	'_phaseone_bulk_min_qty'       => 10,
	'_phaseone_bulk_max_qty'       => 0,
	'_phaseone_bulk_pricing_mode'  => 'fixed',
	'_phaseone_bulk_fixed_price'   => '18.00',
	'_phaseone_bulk_tiers'         => array(),
	'_phaseone_bulk_rule_revision' => 'r1',
);
$tiered = $base;
$tiered['_phaseone_bulk_pricing_mode'] = 'tiered';
$tiered['_phaseone_bulk_tiers'] = array( array( 'minimum' => 10, 'price' => 18 ), array( 'minimum' => 50, 'price' => 15 ) );
$products = array(
	1 => new WC_Product( 1, 'simple', 'SKU A', 'A', $base, 12 ),
	2 => new WC_Product( 2, 'simple', 'SKU B', 'B', $tiered, 100 ),
	3 => new WC_Product( 3, 'variable', 'Variable parent', 'PARENT', array(), null ),
	4 => new WC_Product_Variation( 4, 3, 'Variable — 10mg', 'V-10', $tiered, 100 ),
);
function wc_get_product( int $id ): WC_Product|false { global $products; return $products[ $id ] ?? false; }

require dirname( __DIR__, 2 ) . '/wordpress/plugins/phaseone-bulk-orders/includes/class-phaseone-bulk-product-rules.php';
require dirname( __DIR__, 2 ) . '/wordpress/plugins/phaseone-bulk-orders/includes/class-phaseone-bulk-pricing-engine.php';

function expect( bool $condition, string $message ): void {
	if ( ! $condition ) {
		fwrite( STDERR, "FAIL: {$message}\n" );
		exit( 1 );
	}
}

$minimum = PhaseOne_Bulk_Pricing_Engine::quote( array( array( 'product_id' => 1, 'quantity' => 9 ) ) );
expect( is_wp_error( $minimum ) && 'phaseone_bulk_minimum' === $minimum->get_error_code(), 'quantity 9 must fail a minimum of 10' );

$fixed = PhaseOne_Bulk_Pricing_Engine::quote( array( array( 'product_id' => 1, 'quantity' => 10 ) ) );
expect( ! is_wp_error( $fixed ) && 180.0 === $fixed['subtotal'], 'fixed price quote must be authoritative' );

$stock = PhaseOne_Bulk_Pricing_Engine::quote( array( array( 'product_id' => 1, 'quantity' => 13 ) ) );
expect( is_wp_error( $stock ) && 'phaseone_bulk_maximum' === $stock->get_error_code(), 'real Woo stock must cap quantity' );

$per_sku = PhaseOne_Bulk_Pricing_Engine::quote( array( array( 'product_id' => 1, 'quantity' => 5 ), array( 'product_id' => 2, 'quantity' => 5 ) ) );
expect( is_wp_error( $per_sku ) && 'phaseone_bulk_minimum' === $per_sku->get_error_code(), 'minimum must not be combined across SKUs' );

$tier = PhaseOne_Bulk_Pricing_Engine::quote( array( array( 'product_id' => 2, 'quantity' => 50 ) ) );
expect( ! is_wp_error( $tier ) && 15.0 === $tier['lines'][0]['unit_price'] && 750.0 === $tier['subtotal'], 'highest unlocked tier must apply' );

$variation = PhaseOne_Bulk_Pricing_Engine::quote( array( array( 'product_id' => 3, 'variation_id' => 4, 'quantity' => 10 ) ) );
expect( ! is_wp_error( $variation ) && 4 === $variation['lines'][0]['purchasable_id'], 'variation must resolve against its real parent' );

$tampered = PhaseOne_Bulk_Pricing_Engine::quote( array( array( 'product_id' => 1, 'variation_id' => 4, 'quantity' => 10 ) ) );
expect( is_wp_error( $tampered ) && 'phaseone_bulk_variation_mismatch' === $tampered->get_error_code(), 'variation-parent tampering must fail' );

echo "Bulk pricing smoke tests passed.\n";
