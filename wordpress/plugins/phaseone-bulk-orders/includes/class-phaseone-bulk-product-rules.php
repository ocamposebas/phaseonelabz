<?php

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Bulk_Product_Rules {
	public const META_ENABLED  = '_phaseone_bulk_enabled';
	public const META_CATALOG  = '_phaseone_bulk_catalog_override';
	public const META_MIN      = '_phaseone_bulk_min_qty';
	public const META_MAX      = '_phaseone_bulk_max_qty';
	public const META_MODE     = '_phaseone_bulk_pricing_mode';
	public const META_DISCOUNT = '_phaseone_bulk_discount_percent';
	public const META_PRICE    = '_phaseone_bulk_fixed_price';
	public const META_TIERS    = '_phaseone_bulk_tiers';
	public const META_REVISION = '_phaseone_bulk_rule_revision';

	public static function get( int $product_id ): array|WP_Error {
		$product = wc_get_product( $product_id );
		if ( ! $product instanceof WC_Product || ! in_array( $product->get_type(), array( 'simple', 'variation', 'variable' ), true ) ) {
			return new WP_Error( 'phaseone_bulk_invalid_product', 'Choose a simple product, variable product, or specific variation.' );
		}

		$settings = PhaseOne_Bulk_Installer::settings();
		$has_catalog = self::has_meta( $product, self::META_CATALOG );
		$catalog = $has_catalog ? sanitize_key( (string) $product->get_meta( self::META_CATALOG, true ) ) : '';
		if ( ! in_array( $catalog, array( 'inherit', 'include', 'exclude' ), true ) ) {
			$catalog = self::has_meta( $product, self::META_ENABLED )
				? ( 'yes' === $product->get_meta( self::META_ENABLED, true ) ? 'include' : 'exclude' )
				: 'inherit';
		}

		$has_mode = self::has_meta( $product, self::META_MODE );
		$mode = $has_mode ? sanitize_key( (string) $product->get_meta( self::META_MODE, true ) ) : 'inherit';
		if ( ! in_array( $mode, array( 'inherit', 'discount', 'fixed', 'tiered' ), true ) ) {
			$mode = $has_mode ? 'fixed' : 'inherit';
		}
		$discount = self::discount( $product->get_meta( self::META_DISCOUNT, true ) );
		$tiers = self::sanitize_tiers( $product->get_meta( self::META_TIERS, true ) );
		$is_variation = $product->is_type( 'variation' );
		$is_variable  = $product->is_type( 'variable' );

		return array(
			'product_id'       => $is_variation ? (int) $product->get_parent_id() : (int) $product->get_id(),
			'variation_id'     => $is_variation ? (int) $product->get_id() : 0,
			'purchasable_id'   => $is_variable ? 0 : (int) $product->get_id(),
			'catalog_override' => $catalog,
			'enabled'          => 'include' === $catalog,
			'minimum'          => max( 1, absint( $product->get_meta( self::META_MIN, true ) ?: $settings['default_minimum'] ) ),
			'minimum_explicit' => self::has_meta( $product, self::META_MIN ),
			'maximum'          => max( 0, absint( $product->get_meta( self::META_MAX, true ) ) ),
			'maximum_explicit' => self::has_meta( $product, self::META_MAX ),
			'mode'             => $mode,
			'mode_explicit'    => $has_mode && 'inherit' !== $mode,
			'discount'         => $discount,
			'fixed_price'      => self::money( $product->get_meta( self::META_PRICE, true ) ),
			'tiers'            => $tiers,
			'revision'         => sanitize_text_field( (string) $product->get_meta( self::META_REVISION, true ) ),
		);
	}

	public static function effective( WC_Product $product ): array|WP_Error {
		$rule = self::get( (int) $product->get_id() );
		if ( is_wp_error( $rule ) ) {
			return $rule;
		}
		$parent_rule = null;
		if ( $product->is_type( 'variation' ) ) {
			$parent_rule = self::get( (int) $product->get_parent_id() );
			$parent_rule = is_wp_error( $parent_rule ) ? null : $parent_rule;
		}
		$settings = PhaseOne_Bulk_Installer::settings();
		$pricing = $rule;
		$source = 'variation';
		if ( empty( $rule['mode_explicit'] ) ) {
			if ( is_array( $parent_rule ) && ! empty( $parent_rule['mode_explicit'] ) ) {
				$pricing = $parent_rule;
				$source = 'product';
			} else {
				$pricing = array(
					'mode'        => 'discount',
					'discount'    => (float) $settings['global_discount'],
					'fixed_price' => 0.0,
					'tiers'       => array(),
					'revision'    => (string) $settings['pricing_revision'],
				);
				$source = 'global';
			}
		} elseif ( ! $product->is_type( 'variation' ) ) {
			$source = 'product';
		}

		$minimum = ! empty( $rule['minimum_explicit'] )
			? (int) $rule['minimum']
			: ( is_array( $parent_rule ) && ! empty( $parent_rule['minimum_explicit'] ) ? (int) $parent_rule['minimum'] : (int) $settings['default_minimum'] );
		$minimum = max( PhaseOne_Bulk_Installer::KIT_UNITS, $minimum );
		$minimum = (int) ceil( $minimum / PhaseOne_Bulk_Installer::KIT_UNITS ) * PhaseOne_Bulk_Installer::KIT_UNITS;
		$maximum = ! empty( $rule['maximum_explicit'] )
			? (int) $rule['maximum']
			: ( is_array( $parent_rule ) && ! empty( $parent_rule['maximum_explicit'] ) ? (int) $parent_rule['maximum'] : 0 );

		return array(
			'product_id'       => (int) $rule['product_id'],
			'variation_id'     => (int) $rule['variation_id'],
			'purchasable_id'   => (int) $rule['purchasable_id'],
			'enabled'          => self::is_included( $product ),
			'catalog_override' => (string) $rule['catalog_override'],
			'minimum'          => $minimum,
			'maximum'          => $maximum,
			'mode'             => (string) $pricing['mode'],
			'discount'         => (float) ( $pricing['discount'] ?? 0 ),
			'fixed_price'      => (float) ( $pricing['fixed_price'] ?? 0 ),
			'tiers'            => (array) ( $pricing['tiers'] ?? array() ),
			'pricing_source'   => $source,
			'revision'         => hash( 'sha256', implode( '|', array( $rule['revision'], $parent_rule['revision'] ?? '', $pricing['revision'] ?? '', $settings['pricing_revision'] ) ) ),
		);
	}

	public static function is_included( WC_Product $product ): bool {
		$rule = self::get( (int) $product->get_id() );
		if ( is_wp_error( $rule ) ) {
			return false;
		}
		if ( in_array( $rule['catalog_override'], array( 'include', 'exclude' ), true ) ) {
			return 'include' === $rule['catalog_override'];
		}
		$parent = $product;
		if ( $product->is_type( 'variation' ) ) {
			$parent = wc_get_product( (int) $product->get_parent_id() );
			$parent_rule = $parent instanceof WC_Product ? self::get( (int) $parent->get_id() ) : null;
			if ( is_array( $parent_rule ) && in_array( $parent_rule['catalog_override'], array( 'include', 'exclude' ), true ) ) {
				return 'include' === $parent_rule['catalog_override'];
			}
		}

		$settings = PhaseOne_Bulk_Installer::settings();
		if ( $parent instanceof WC_Product && in_array( (int) $parent->get_id(), $settings['excluded_family_ids'], true ) ) {
			return false;
		}
		if ( $parent instanceof WC_Product ) {
			$category_ids = wp_get_post_terms( $parent->get_id(), 'product_cat', array( 'fields' => 'ids' ) );
			if ( ! is_wp_error( $category_ids ) && array_intersect( array_map( 'absint', $category_ids ), $settings['excluded_category_ids'] ) ) {
				return false;
			}
		}
		return 'include_all' === $settings['catalog_mode'];
	}

	public static function save( int $product_id, array $raw ): bool|WP_Error {
		$product = wc_get_product( $product_id );
		if ( ! $product instanceof WC_Product || ! in_array( $product->get_type(), array( 'simple', 'variation', 'variable' ), true ) ) {
			return new WP_Error( 'phaseone_bulk_invalid_product', 'Choose a simple product, variable product, or specific variation.' );
		}
		$settings = PhaseOne_Bulk_Installer::settings();
		$catalog = sanitize_key( (string) ( $raw['catalog_override'] ?? '' ) );
		if ( ! in_array( $catalog, array( 'inherit', 'include', 'exclude' ), true ) ) {
			$catalog = ! empty( $raw['enabled'] ) ? 'include' : 'exclude';
		}
		$minimum_kits_raw = array_key_exists( 'minimum_kits', $raw ) ? trim( (string) $raw['minimum_kits'] ) : null;
		$minimum_explicit = null !== $minimum_kits_raw ? '' !== $minimum_kits_raw : array_key_exists( 'minimum', $raw );
		$minimum = null !== $minimum_kits_raw
			? max( 1, absint( $minimum_kits_raw ) ) * PhaseOne_Bulk_Installer::KIT_UNITS
			: max( PhaseOne_Bulk_Installer::KIT_UNITS, absint( $raw['minimum'] ?? $settings['default_minimum'] ) );
		$minimum = (int) ceil( $minimum / PhaseOne_Bulk_Installer::KIT_UNITS ) * PhaseOne_Bulk_Installer::KIT_UNITS;
		$maximum = max( 0, absint( $raw['maximum'] ?? 0 ) );
		if ( $maximum > 0 ) {
			$maximum = (int) floor( $maximum / PhaseOne_Bulk_Installer::KIT_UNITS ) * PhaseOne_Bulk_Installer::KIT_UNITS;
		}
		$mode = sanitize_key( (string) ( $raw['mode'] ?? 'inherit' ) );
		$mode = in_array( $mode, array( 'inherit', 'discount', 'fixed', 'tiered' ), true ) ? $mode : 'inherit';
		$discount = PhaseOne_Bulk_Installer::validate_discount( $raw['discount'] ?? 0 );
		if ( is_wp_error( $discount ) ) {
			return $discount;
		}
		$price = self::money( $raw['fixed_price'] ?? 0 );
		if ( array_key_exists( 'bundle_price', $raw ) ) {
			$kit_price = self::money( $raw['bundle_price'] );
			$price = $kit_price > 0 ? self::money( $kit_price / PhaseOne_Bulk_Installer::KIT_UNITS ) : 0.0;
		}
		$tiers = array_key_exists( 'tier_kits', $raw )
			? self::tiers_from_kit_text( (string) $raw['tier_kits'] )
			: self::sanitize_tiers( $raw['tiers'] ?? array() );

		if ( $maximum > 0 && $maximum < $minimum ) {
			return new WP_Error( 'phaseone_bulk_invalid_maximum', 'Maximum quantity cannot be lower than the minimum.' );
		}
		if ( ! $product->is_type( 'variable' ) && 'include' === $catalog && '' === trim( (string) $product->get_sku() ) ) {
			return new WP_Error( 'phaseone_bulk_missing_sku', 'A product or variation must have a SKU before Bulk can be included.' );
		}
		if ( ! $product->is_type( 'variable' ) && 'include' === $catalog ) {
			$sku_owner = absint( wc_get_product_id_by_sku( $product->get_sku() ) );
			if ( $sku_owner > 0 && $sku_owner !== (int) $product->get_id() ) {
				return new WP_Error( 'phaseone_bulk_duplicate_sku', 'Bulk requires a unique SKU for every included product or variation.' );
			}
		}
		if ( 'exclude' !== $catalog && 'fixed' === $mode && $price <= 0 ) {
			return new WP_Error( 'phaseone_bulk_invalid_price', 'Enter a positive fixed Kit price.' );
		}
		if ( 'exclude' !== $catalog && 'tiered' === $mode && empty( $tiers ) ) {
			return new WP_Error( 'phaseone_bulk_invalid_tiers', 'Add at least one valid Kit pricing tier.' );
		}
		if ( 'exclude' !== $catalog && 'tiered' === $mode && (int) $tiers[0]['minimum'] > $minimum ) {
			return new WP_Error( 'phaseone_bulk_tier_gap', 'The first tier must begin at or before the Bulk minimum.' );
		}

		$revision = hash( 'sha256', wp_json_encode( compact( 'catalog', 'minimum', 'maximum', 'mode', 'discount', 'price', 'tiers' ) ) );
		$product->update_meta_data( self::META_CATALOG, $catalog );
		if ( $minimum_explicit ) {
			$product->update_meta_data( self::META_MIN, $minimum );
		} else {
			$product->delete_meta_data( self::META_MIN );
		}
		$product->update_meta_data( self::META_MAX, $maximum );
		$product->update_meta_data( self::META_MODE, $mode );
		$product->update_meta_data( self::META_DISCOUNT, wc_format_decimal( $discount, 2 ) );
		$product->update_meta_data( self::META_PRICE, wc_format_decimal( $price, wc_get_price_decimals() ) );
		$product->update_meta_data( self::META_TIERS, $tiers );
		$product->update_meta_data( self::META_REVISION, $revision );
		$product->save_meta_data();
		self::invalidate_cache();
		return true;
	}

	public static function delete( int $product_id ): bool {
		$product = wc_get_product( $product_id );
		if ( ! $product instanceof WC_Product ) {
			return false;
		}
		foreach ( array( self::META_ENABLED, self::META_CATALOG, self::META_MIN, self::META_MAX, self::META_MODE, self::META_DISCOUNT, self::META_PRICE, self::META_TIERS, self::META_REVISION ) as $key ) {
			$product->delete_meta_data( $key );
		}
		$product->save_meta_data();
		self::invalidate_cache();
		return true;
	}

	public static function configured_ids(): array {
		$args = array(
			'post_type'      => array( 'product', 'product_variation' ),
			'post_status'    => array( 'publish', 'private' ),
			'posts_per_page' => 1000,
			'fields'         => 'ids',
			'orderby'        => 'ID',
			'order'          => 'ASC',
			'no_found_rows'  => true,
			'meta_query'     => array(
				'relation' => 'OR',
				array( 'key' => self::META_ENABLED, 'compare' => 'EXISTS' ),
				array( 'key' => self::META_CATALOG, 'compare' => 'EXISTS' ),
				array( 'key' => self::META_MODE, 'compare' => 'EXISTS' ),
			),
		);
		return array_map( 'absint', get_posts( $args ) ?: array() );
	}

	public static function catalog_candidate_ids(): array {
		$settings = PhaseOne_Bulk_Installer::settings();
		if ( 'legacy_explicit' === $settings['catalog_mode'] ) {
			$ids = self::configured_ids();
			foreach ( $ids as $id ) {
				$product = wc_get_product( $id );
				if ( $product instanceof WC_Product && $product->is_type( 'variable' ) && method_exists( $product, 'get_children' ) ) {
					$ids = array_merge( $ids, array_map( 'absint', $product->get_children() ) );
				}
			}
			$ids = array_values( array_unique( array_filter( array_map( 'absint', $ids ) ) ) );
			sort( $ids, SORT_NUMERIC );
			return $ids;
		}
		return array_map(
			'absint',
			get_posts(
				array(
					'post_type'      => array( 'product', 'product_variation' ),
					'post_status'    => array( 'publish', 'private' ),
					'posts_per_page' => 2000,
					'fields'         => 'ids',
					'orderby'        => 'menu_order title ID',
					'order'          => 'ASC',
					'no_found_rows'  => true,
				)
			) ?: array()
		);
	}

	public static function price_for_quantity( array $rule, int $quantity, float $retail_price = 0.0 ): array|WP_Error {
		if ( 'discount' === $rule['mode'] ) {
			$discount = (float) $rule['discount'];
			$price = self::money( $retail_price * ( 1 - ( $discount / 100 ) ) );
			return $retail_price > 0 && $price > 0
				? array( 'unit_price' => $price, 'tier' => self::percent_label( $discount ), 'discount' => $discount )
				: new WP_Error( 'phaseone_bulk_price_unavailable', 'Retail pricing is unavailable for this SKU.' );
		}
		if ( 'fixed' === $rule['mode'] ) {
			$price = self::money( $rule['fixed_price'] );
			return $price > 0
				? array( 'unit_price' => $price, 'tier' => 'fixed' )
				: new WP_Error( 'phaseone_bulk_price_unavailable', 'Bulk pricing is not configured for this SKU.' );
		}
		$matched = null;
		foreach ( $rule['tiers'] as $tier ) {
			if ( $quantity >= (int) $tier['minimum'] ) {
				$matched = $tier;
			}
		}
		if ( ! is_array( $matched ) ) {
			return new WP_Error( 'phaseone_bulk_tier_unavailable', 'This quantity does not unlock a configured Bulk tier.' );
		}
		return array( 'unit_price' => self::money( $matched['price'] ), 'tier' => (string) (int) $matched['minimum'] . '+' );
	}

	public static function sanitize_tiers( mixed $raw ): array {
		if ( is_string( $raw ) ) {
			$decoded = json_decode( $raw, true );
			$raw = is_array( $decoded ) ? $decoded : self::tiers_from_text( $raw );
		}
		if ( ! is_array( $raw ) ) {
			return array();
		}
		$by_minimum = array();
		foreach ( $raw as $tier ) {
			if ( ! is_array( $tier ) ) {
				continue;
			}
			$minimum = max( PhaseOne_Bulk_Installer::KIT_UNITS, absint( $tier['minimum'] ?? $tier['min'] ?? 0 ) );
			$minimum = (int) ceil( $minimum / PhaseOne_Bulk_Installer::KIT_UNITS ) * PhaseOne_Bulk_Installer::KIT_UNITS;
			$price = self::money( $tier['price'] ?? 0 );
			if ( $price > 0 ) {
				$by_minimum[ $minimum ] = array( 'minimum' => $minimum, 'price' => $price );
			}
		}
		ksort( $by_minimum, SORT_NUMERIC );
		return array_values( $by_minimum );
	}

	private static function tiers_from_text( string $raw ): array {
		$tiers = array();
		foreach ( preg_split( '/\r\n|\r|\n/', $raw ) ?: array() as $line ) {
			$parts = preg_split( '/\s*[:=,]\s*/', trim( $line ) );
			if ( is_array( $parts ) && count( $parts ) >= 2 ) {
				$tiers[] = array( 'minimum' => $parts[0], 'price' => $parts[1] );
			}
		}
		return $tiers;
	}

	private static function tiers_from_kit_text( string $raw ): array {
		$tiers = array();
		foreach ( preg_split( '/\r\n|\r|\n/', $raw ) ?: array() as $line ) {
			$parts = preg_split( '/\s*[:=,]\s*/', trim( $line ) );
			if ( ! is_array( $parts ) || count( $parts ) < 2 ) {
				continue;
			}
			$kits = max( 1, absint( $parts[0] ) );
			$kit_price = self::money( $parts[1] );
			if ( $kit_price > 0 ) {
				$tiers[] = array(
					'minimum' => $kits * PhaseOne_Bulk_Installer::KIT_UNITS,
					'price'   => self::money( $kit_price / PhaseOne_Bulk_Installer::KIT_UNITS ),
				);
			}
		}
		return self::sanitize_tiers( $tiers );
	}

	private static function has_meta( WC_Product $product, string $key ): bool {
		return method_exists( $product, 'meta_exists' )
			? $product->meta_exists( $key )
			: '' !== (string) $product->get_meta( $key, true );
	}

	private static function discount( mixed $value ): float {
		$result = PhaseOne_Bulk_Installer::validate_discount( '' === (string) $value ? 0 : $value );
		return is_wp_error( $result ) ? 0.0 : $result;
	}

	private static function percent_label( float $value ): string {
		return rtrim( rtrim( number_format( $value, 2, '.', '' ), '0' ), '.' ) . '%';
	}

	public static function invalidate_cache(): void {
		wp_cache_delete( 'catalog', 'phaseone_bulk' );
		wp_cache_delete( 'program', 'phaseone_bulk' );
	}

	private static function money( mixed $value ): float {
		return round( max( 0, (float) wc_format_decimal( $value ) ), wc_get_price_decimals() );
	}
}
