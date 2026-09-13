<?php

define( 'ABSPATH', __DIR__ );

final class WP_Error {
	public function __construct( private string $code, private string $message, public array $data = array() ) {}
	public function get_error_code(): string { return $this->code; }
	public function get_error_message(): string { return $this->message; }
}

final class PhaseOne_Bulk_Installer {
	public const KIT_UNITS = 10;
	public static array $settings = array(
		'catalog_mode' => 'include_all',
		'global_discount' => 47.5,
		'default_minimum' => 10,
		'excluded_category_ids' => array(),
		'excluded_family_ids' => array(),
		'pricing_revision' => 'global-r1',
		'public_title' => 'Bulk Orders',
		'public_intro' => 'Private pricing.',
		'session_days' => 14,
	);
	public static function settings(): array { return self::$settings; }
	public static function validate_discount( mixed $value ): float|WP_Error {
		return is_numeric( $value ) && (float) $value >= 0 && (float) $value < 100
			? (float) $value
			: new WP_Error( 'invalid_discount', 'Invalid discount.' );
	}
}

function is_wp_error( mixed $value ): bool { return $value instanceof WP_Error; }
function absint( mixed $value ): int { return abs( (int) $value ); }
function sanitize_key( mixed $value ): string { return preg_replace( '/[^a-z0-9_\-]/', '', strtolower( (string) $value ) ) ?: ''; }
function sanitize_text_field( mixed $value ): string { return trim( strip_tags( (string) $value ) ); }
function wc_format_decimal( mixed $value, mixed $dp = false ): string { return number_format( (float) $value, false === $dp ? 2 : (int) $dp, '.', '' ); }
function wc_get_price_decimals(): int { return 2; }
function wp_json_encode( mixed $value ): string { return json_encode( $value, JSON_UNESCAPED_SLASHES ); }
function get_woocommerce_currency(): string { return 'USD'; }
function wp_strip_all_tags( mixed $value ): string { return strip_tags( (string) $value ); }
function wp_specialchars_decode( mixed $value, int $quote_style = ENT_NOQUOTES ): string { return html_entity_decode( (string) $value, $quote_style | ENT_HTML5, 'UTF-8' ); }
function wp_get_post_terms( mixed $id = 0, mixed $taxonomy = '', mixed $args = array() ): array { return array( 'Healing &amp; Recovery' ); }
function wp_get_attachment_image_url(): string { return ''; }
function wc_placeholder_img_src(): string { return '/placeholder.png'; }
function wc_attribute_label( string $name ): string { return $name; }
function wp_cache_delete(): bool { return true; }
function wp_cache_get(): bool { return false; }
function wp_cache_set(): bool { return true; }
function get_posts(): array { return array( 1, 2, 3, 4, 5, 6, 7 ); }

class WC_Product {
	public function __construct(
		protected int $id,
		protected string $type,
		protected string $name,
		protected string $sku,
		protected array $meta,
		protected float $regular_price = 30,
		protected ?int $stock = 100,
		protected bool $backorders = false,
	) {}
	public function get_id(): int { return $this->id; }
	public function get_type(): string { return $this->type; }
	public function is_type( string $type ): bool { return $this->type === $type; }
	public function get_name(): string { return $this->name; }
	public function get_sku(): string { return $this->sku; }
	public function get_meta( string $key, bool $single = true ): mixed { return $this->meta[ $key ] ?? ''; }
	public function meta_exists( string $key ): bool { return array_key_exists( $key, $this->meta ); }
	public function get_parent_id(): int { return 0; }
	public function get_regular_price(): string { return (string) $this->regular_price; }
	public function get_price(): string { return (string) $this->regular_price; }
	public function is_purchasable(): bool { return true; }
	public function is_in_stock(): bool { return null === $this->stock || $this->stock > 0 || $this->backorders; }
	public function backorders_allowed(): bool { return $this->backorders; }
	public function managing_stock(): bool { return null !== $this->stock; }
	public function get_stock_quantity(): ?int { return $this->stock; }
	public function get_max_purchase_quantity(): int { return $this->backorders || null === $this->stock ? -1 : $this->stock; }
	public function get_image_id(): int { return 0; }
}

class WC_Product_Variation extends WC_Product {
	public function __construct( int $id, private int $parent_id_value, string $name, string $sku, array $meta, float $regular_price = 30, ?int $stock = 100 ) {
		parent::__construct( $id, 'variation', $name, $sku, $meta, $regular_price, $stock );
	}
	public function get_parent_id(): int { return $this->parent_id_value; }
	public function get_variation_attributes(): array { return array( 'attribute_strength' => '10mg' ); }
}

$fixed = array(
	'_phaseone_bulk_enabled'       => 'yes',
	'_phaseone_bulk_min_qty'       => 7,
	'_phaseone_bulk_max_qty'       => 0,
	'_phaseone_bulk_pricing_mode'  => 'fixed',
	'_phaseone_bulk_fixed_price'   => '18.00',
	'_phaseone_bulk_tiers'         => array(),
	'_phaseone_bulk_rule_revision' => 'fixed-r1',
);
$tiered = $fixed;
$tiered['_phaseone_bulk_pricing_mode'] = 'tiered';
$tiered['_phaseone_bulk_tiers'] = array( array( 'minimum' => 10, 'price' => 18 ), array( 'minimum' => 50, 'price' => 15 ) );
$variation_discount = array(
	'_phaseone_bulk_catalog_override' => 'include',
	'_phaseone_bulk_pricing_mode' => 'discount',
	'_phaseone_bulk_discount_percent' => '35',
	'_phaseone_bulk_rule_revision' => 'variation-r1',
);
$product_discount = array(
	'_phaseone_bulk_catalog_override' => 'include',
	'_phaseone_bulk_pricing_mode' => 'discount',
	'_phaseone_bulk_discount_percent' => '30',
	'_phaseone_bulk_rule_revision' => 'product-r1',
);
$products = array(
	1 => new WC_Product( 1, 'simple', 'SKU A', 'A', $fixed, 30, 12 ),
	2 => new WC_Product( 2, 'simple', 'SKU B', 'B', $tiered, 30, 100 ),
	3 => new WC_Product( 3, 'variable', 'Variable parent', 'PARENT', $fixed, 30, null ),
	4 => new WC_Product_Variation( 4, 3, 'Variable — 10mg', 'V-10', $variation_discount, 40, 100 ),
	5 => new WC_Product( 5, 'simple', 'Global default', 'GLOBAL', array(), 40, 100 ),
	6 => new WC_Product( 6, 'simple', 'Explicit exclusion', 'EXCLUDED', array( '_phaseone_bulk_catalog_override' => 'exclude' ), 40, 100 ),
	7 => new WC_Product( 7, 'simple', 'Reta custom discount', 'RETA', $product_discount, 100, 100 ),
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

$incomplete = PhaseOne_Bulk_Pricing_Engine::quote( array( array( 'product_id' => 1, 'quantity' => 9 ) ) );
expect( is_wp_error( $incomplete ) && 'phaseone_bulk_kit_multiple' === $incomplete->get_error_code(), 'incomplete kits must fail before pricing' );

$fixed_quote = PhaseOne_Bulk_Pricing_Engine::quote( array( array( 'product_id' => 1, 'quantity' => 10 ) ) );
expect( ! is_wp_error( $fixed_quote ) && 180.0 === $fixed_quote['subtotal'], 'legacy fixed price must remain authoritative' );
expect( 40.0 === $fixed_quote['lines'][0]['savings_percent'], 'fixed-price savings must be calculated against retail' );
expect( 10 === $fixed_quote['lines'][0]['minimum'], 'legacy minimum below one kit must normalize to one full kit' );

$stock = PhaseOne_Bulk_Pricing_Engine::quote( array( array( 'product_id' => 1, 'quantity' => 20 ) ) );
expect( is_wp_error( $stock ) && 'phaseone_bulk_maximum' === $stock->get_error_code(), 'real Woo stock must cap quantity' );

$per_sku = PhaseOne_Bulk_Pricing_Engine::quote( array( array( 'product_id' => 1, 'quantity' => 5 ), array( 'product_id' => 2, 'quantity' => 5 ) ) );
expect( is_wp_error( $per_sku ) && 'phaseone_bulk_kit_multiple' === $per_sku->get_error_code(), 'kits must not be combined across SKUs' );

$tier = PhaseOne_Bulk_Pricing_Engine::quote( array( array( 'product_id' => 2, 'quantity' => 50 ) ) );
expect( ! is_wp_error( $tier ) && 15.0 === $tier['lines'][0]['unit_price'] && 750.0 === $tier['subtotal'], 'highest unlocked tier must apply' );
expect( 50.0 === $tier['lines'][0]['savings_percent'], 'tier savings must reflect its actual unit price' );

$variation = PhaseOne_Bulk_Pricing_Engine::quote( array( array( 'product_id' => 3, 'variation_id' => 4, 'quantity' => 10 ) ) );
expect( ! is_wp_error( $variation ) && 26.0 === $variation['lines'][0]['unit_price'], 'variation discount override must beat the parent fixed rule' );
expect( 35.0 === $variation['lines'][0]['savings_percent'], 'variation must expose its real effective savings' );

$global = PhaseOne_Bulk_Pricing_Engine::quote( array( array( 'product_id' => 5, 'quantity' => 10 ) ) );
expect( ! is_wp_error( $global ) && 21.0 === $global['lines'][0]['unit_price'], 'unconfigured products must inherit the global decimal discount' );
expect( 47.5 === $global['lines'][0]['savings_percent'], 'global decimal savings must remain accurate' );
expect( 1 === $global['lines'][0]['kit_quantity'] && 210.0 === $global['lines'][0]['kit_price'], 'inherited products must be exposed and priced as complete 10-unit kits' );

$product_override = PhaseOne_Bulk_Pricing_Engine::quote( array( array( 'product_id' => 7, 'quantity' => 10 ) ) );
expect( ! is_wp_error( $product_override ) && 70.0 === $product_override['lines'][0]['unit_price'], 'a product discount override must beat the global discount' );
expect( 30.0 === $product_override['lines'][0]['savings_percent'] && 700.0 === $product_override['lines'][0]['kit_price'], 'a 30 percent product override must expose the real kit price and savings' );

$catalog = PhaseOne_Bulk_Pricing_Engine::catalog();
$catalog_ids = array_column( $catalog['items'], 'purchasable_id' );
expect( in_array( 5, $catalog_ids, true ), 'include-all catalog mode must expose an unconfigured eligible product' );
expect( ! in_array( 6, $catalog_ids, true ), 'an explicit product exclusion must win over include-all catalog mode' );
expect( 'Healing & Recovery' === $catalog['items'][0]['categories'][0], 'catalog labels must decode WooCommerce HTML entities' );

$program = PhaseOne_Bulk_Pricing_Engine::program();
expect( 50.0 === $program['max_savings_percent'], 'public savings must use the highest real applicable tier, not the global default' );
$products[2] = new WC_Product( 2, 'simple', 'SKU B', 'B', $tiered, 30, 40 );
$program_without_unreachable_tier = PhaseOne_Bulk_Pricing_Engine::program();
expect( 47.5 === $program_without_unreachable_tier['max_savings_percent'], 'public savings must not promise a tier that current limits cannot reach' );

$tampered = PhaseOne_Bulk_Pricing_Engine::quote( array( array( 'product_id' => 1, 'variation_id' => 4, 'quantity' => 10 ) ) );
expect( is_wp_error( $tampered ) && 'phaseone_bulk_variation_mismatch' === $tampered->get_error_code(), 'variation-parent tampering must fail' );

echo "Bulk pricing smoke tests passed.\n";
