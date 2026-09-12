<?php

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Bulk_Product_Rules {
	public const META_ENABLED  = '_phaseone_bulk_enabled';
	public const META_MIN      = '_phaseone_bulk_min_qty';
	public const META_MAX      = '_phaseone_bulk_max_qty';
	public const META_MODE     = '_phaseone_bulk_pricing_mode';
	public const META_PRICE    = '_phaseone_bulk_fixed_price';
	public const META_TIERS    = '_phaseone_bulk_tiers';
	public const META_REVISION = '_phaseone_bulk_rule_revision';

	public static function get( int $product_id ): array|WP_Error {
		$product = wc_get_product( $product_id );
		if ( ! $product instanceof WC_Product || $product->is_type( 'variable' ) ) {
			return new WP_Error( 'phaseone_bulk_invalid_product', 'Choose a simple product or a specific variation.' );
		}

		$mode  = sanitize_key( (string) $product->get_meta( self::META_MODE, true ) );
		$mode  = in_array( $mode, array( 'fixed', 'tiered' ), true ) ? $mode : 'fixed';
		$tiers = self::sanitize_tiers( $product->get_meta( self::META_TIERS, true ) );
		return array(
			'product_id'  => $product->is_type( 'variation' ) ? (int) $product->get_parent_id() : (int) $product->get_id(),
			'variation_id' => $product->is_type( 'variation' ) ? (int) $product->get_id() : 0,
			'purchasable_id' => (int) $product->get_id(),
			'enabled'     => 'yes' === $product->get_meta( self::META_ENABLED, true ),
			'minimum'     => max( 1, absint( $product->get_meta( self::META_MIN, true ) ?: 10 ) ),
			'maximum'     => max( 0, absint( $product->get_meta( self::META_MAX, true ) ) ),
			'mode'        => $mode,
			'fixed_price' => self::money( $product->get_meta( self::META_PRICE, true ) ),
			'tiers'       => $tiers,
			'revision'    => sanitize_text_field( (string) $product->get_meta( self::META_REVISION, true ) ),
		);
	}

	public static function save( int $product_id, array $raw ): true|WP_Error {
		$product = wc_get_product( $product_id );
		if ( ! $product instanceof WC_Product || $product->is_type( 'variable' ) ) {
			return new WP_Error( 'phaseone_bulk_invalid_product', 'Choose a simple product or a specific variation.' );
		}

		$enabled = ! empty( $raw['enabled'] );
		$minimum = max( 1, absint( $raw['minimum'] ?? 10 ) );
		$maximum = max( 0, absint( $raw['maximum'] ?? 0 ) );
		$mode    = 'tiered' === sanitize_key( $raw['mode'] ?? '' ) ? 'tiered' : 'fixed';
		$price   = self::money( $raw['fixed_price'] ?? 0 );
		$tiers   = self::sanitize_tiers( $raw['tiers'] ?? array() );
		if ( 'fixed' === $mode && array_key_exists( 'bundle_price', $raw ) ) {
			$bundle_price = self::money( $raw['bundle_price'] );
			$price = $bundle_price > 0 ? self::money( $bundle_price / $minimum ) : 0.0;
		}

		if ( $maximum > 0 && $maximum < $minimum ) {
			return new WP_Error( 'phaseone_bulk_invalid_maximum', 'Maximum quantity cannot be lower than the minimum.' );
		}
		if ( $enabled && '' === trim( (string) $product->get_sku() ) ) {
			return new WP_Error( 'phaseone_bulk_missing_sku', 'A product or variation must have a SKU before Bulk can be enabled.' );
		}
		$sku_owner = '' !== trim( (string) $product->get_sku() ) ? absint( wc_get_product_id_by_sku( $product->get_sku() ) ) : 0;
		if ( $enabled && $sku_owner > 0 && $sku_owner !== (int) $product->get_id() ) {
			return new WP_Error( 'phaseone_bulk_duplicate_sku', 'Bulk requires a unique SKU for every enabled product or variation.' );
		}
		if ( $enabled && 'fixed' === $mode && $price <= 0 ) {
			return new WP_Error( 'phaseone_bulk_invalid_price', 'Enter a positive Bundle price.' );
		}
		if ( $enabled && 'tiered' === $mode && empty( $tiers ) ) {
			return new WP_Error( 'phaseone_bulk_invalid_tiers', 'Add at least one valid pricing tier.' );
		}
		if ( 'tiered' === $mode && ! empty( $tiers ) && (int) $tiers[0]['minimum'] > $minimum ) {
			return new WP_Error( 'phaseone_bulk_tier_gap', 'The first tier must begin at or before the Bulk minimum.' );
		}

		$revision = hash(
			'sha256',
			wp_json_encode(
				array(
					'enabled' => $enabled,
					'minimum' => $minimum,
					'maximum' => $maximum,
					'mode'    => $mode,
					'price'   => $price,
					'tiers'   => $tiers,
				)
			)
		);

		$product->update_meta_data( self::META_ENABLED, $enabled ? 'yes' : 'no' );
		$product->update_meta_data( self::META_MIN, $minimum );
		$product->update_meta_data( self::META_MAX, $maximum );
		$product->update_meta_data( self::META_MODE, $mode );
		$product->update_meta_data( self::META_PRICE, wc_format_decimal( $price, wc_get_price_decimals() ) );
		$product->update_meta_data( self::META_TIERS, $tiers );
		$product->update_meta_data( self::META_REVISION, $revision );
		$product->save_meta_data();
		wp_cache_delete( 'catalog', 'phaseone_bulk' );
		return true;
	}

	public static function delete( int $product_id ): bool {
		$product = wc_get_product( $product_id );
		if ( ! $product instanceof WC_Product ) {
			return false;
		}
		foreach ( array( self::META_ENABLED, self::META_MIN, self::META_MAX, self::META_MODE, self::META_PRICE, self::META_TIERS, self::META_REVISION ) as $key ) {
			$product->delete_meta_data( $key );
		}
		$product->save_meta_data();
		wp_cache_delete( 'catalog', 'phaseone_bulk' );
		return true;
	}

	public static function configured_ids( bool $enabled_only = false ): array {
		$meta_clause = array(
			'key'     => self::META_ENABLED,
			'compare' => 'EXISTS',
		);
		if ( $enabled_only ) {
			$meta_clause['compare'] = '=';
			$meta_clause['value']   = 'yes';
		}

		$args = array(
			'post_type'      => array( 'product', 'product_variation' ),
			'post_status'    => array( 'publish', 'private' ),
			'posts_per_page' => 500,
			'fields'         => 'ids',
			'orderby'        => 'ID',
			'order'          => 'ASC',
			'no_found_rows'  => true,
			'meta_query'     => array( $meta_clause ),
		);
		$ids = get_posts( $args );
		if ( $ids ) {
			_prime_post_caches( $ids, true, true );
		}
		return array_map( 'absint', $ids );
	}

	public static function price_for_quantity( array $rule, int $quantity ): array|WP_Error {
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
		return array(
			'unit_price' => self::money( $matched['price'] ),
			'tier'       => (string) (int) $matched['minimum'] . '+',
		);
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
			$minimum = max( 1, absint( $tier['minimum'] ?? $tier['min'] ?? 0 ) );
			$price   = self::money( $tier['price'] ?? 0 );
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

	private static function money( mixed $value ): float {
		return round( max( 0, (float) wc_format_decimal( $value ) ), wc_get_price_decimals() );
	}
}
