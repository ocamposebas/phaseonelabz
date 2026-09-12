<?php

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Bulk_Pricing_Engine {
	private const MAX_LINES = 100;

	public static function quote( array $raw_items ): array|WP_Error {
		$items = self::normalize_items( $raw_items );
		if ( is_wp_error( $items ) ) {
			return $items;
		}

		$lines    = array();
		$subtotal = 0.0;
		$item_count = 0;
		foreach ( $items as $item ) {
			$product = self::resolve_product( $item );
			if ( is_wp_error( $product ) ) {
				return $product;
			}

			$rule = PhaseOne_Bulk_Product_Rules::get( (int) $product->get_id() );
			if ( is_wp_error( $rule ) || empty( $rule['enabled'] ) ) {
				return new WP_Error( 'phaseone_bulk_not_eligible', 'One or more selected SKUs are not available for Bulk ordering.', array( 'status' => 400 ) );
			}

			$quantity = (int) $item['quantity'];
			$minimum  = (int) $rule['minimum'];
			$maximum  = self::effective_maximum( $product, (int) $rule['maximum'] );
			if ( $quantity < $minimum ) {
				return new WP_Error( 'phaseone_bulk_minimum', sprintf( '%s requires a minimum of %d units per SKU.', $product->get_name(), $minimum ), array( 'status' => 400, 'product_id' => $product->get_id(), 'minimum' => $minimum ) );
			}
			if ( $maximum > 0 && $quantity > $maximum ) {
				return new WP_Error( 'phaseone_bulk_maximum', sprintf( '%s currently allows a maximum of %d units.', $product->get_name(), $maximum ), array( 'status' => 400, 'product_id' => $product->get_id(), 'maximum' => $maximum ) );
			}
			if ( ! $product->is_purchasable() || ! $product->is_in_stock() ) {
				return new WP_Error( 'phaseone_bulk_unavailable', sprintf( '%s is not currently purchasable.', $product->get_name() ), array( 'status' => 409 ) );
			}
			if ( ! $product->backorders_allowed() && $product->managing_stock() && null !== $product->get_stock_quantity() && $quantity > (int) $product->get_stock_quantity() ) {
				return new WP_Error( 'phaseone_bulk_stock', sprintf( '%s does not have enough stock for that quantity.', $product->get_name() ), array( 'status' => 409 ) );
			}

			$price = PhaseOne_Bulk_Product_Rules::price_for_quantity( $rule, $quantity );
			if ( is_wp_error( $price ) ) {
				return $price;
			}
			$line_total = self::money( (float) $price['unit_price'] * $quantity );
			$subtotal  += $line_total;
			$item_count += $quantity;
			$lines[] = self::build_line( $product, $rule, $price, $quantity, $maximum, $line_total );
		}

		$subtotal = self::money( $subtotal );
		$fingerprint_data = array_map(
			static fn( array $line ): array => array(
				'id'       => $line['purchasable_id'],
				'quantity' => $line['quantity'],
				'price'    => $line['unit_price'],
				'tier'     => $line['tier'],
				'revision' => $line['rule_revision'],
			),
			$lines
		);

		return array(
			'context'     => 'bulk',
			'currency'    => get_woocommerce_currency(),
			'lines'       => $lines,
			'line_count'  => count( $lines ),
			'item_count'  => $item_count,
			'subtotal'    => $subtotal,
			'fingerprint' => hash( 'sha256', wp_json_encode( $fingerprint_data ) ),
			'quoted_at'   => gmdate( DATE_ATOM ),
		);
	}

	public static function catalog(): array {
		$items = array();
		foreach ( PhaseOne_Bulk_Product_Rules::configured_ids( true ) as $id ) {
			$product = wc_get_product( $id );
			if ( ! $product instanceof WC_Product || $product->is_type( 'variable' ) || '' === trim( (string) $product->get_sku() ) ) {
				continue;
			}
			$rule = PhaseOne_Bulk_Product_Rules::get( $id );
			if ( is_wp_error( $rule ) || empty( $rule['enabled'] ) ) {
				continue;
			}
			$minimum = (int) $rule['minimum'];
			$maximum = self::effective_maximum( $product, (int) $rule['maximum'] );
			$price   = PhaseOne_Bulk_Product_Rules::price_for_quantity( $rule, $minimum );
			if ( is_wp_error( $price ) ) {
				continue;
			}
			$available = $product->is_purchasable() && $product->is_in_stock() && ( 0 === $maximum || $maximum >= $minimum );
			$items[] = self::build_line( $product, $rule, $price, $minimum, $maximum, self::money( (float) $price['unit_price'] * $minimum ), $available );
		}

		usort( $items, static fn( array $left, array $right ): int => strnatcasecmp( $left['parent_name'] . ' ' . $left['name'], $right['parent_name'] . ' ' . $right['name'] ) );
		return array(
			'context'  => 'bulk',
			'currency' => get_woocommerce_currency(),
			'items'    => $items,
			'count'    => count( $items ),
		);
	}

	private static function normalize_items( array $raw_items ): array|WP_Error {
		if ( empty( $raw_items ) || count( $raw_items ) > self::MAX_LINES ) {
			return new WP_Error( 'phaseone_bulk_invalid_cart', 'The Bulk cart is empty or too large.', array( 'status' => 400 ) );
		}
		$merged = array();
		foreach ( $raw_items as $raw ) {
			if ( ! is_array( $raw ) ) {
				continue;
			}
			$product_id   = absint( $raw['product_id'] ?? $raw['productId'] ?? 0 );
			$variation_id = absint( $raw['variation_id'] ?? $raw['variationId'] ?? 0 );
			$quantity     = absint( $raw['quantity'] ?? 0 );
			if ( $product_id <= 0 || $quantity <= 0 || $quantity > 100000 ) {
				return new WP_Error( 'phaseone_bulk_invalid_line', 'A Bulk cart line is invalid.', array( 'status' => 400 ) );
			}
			$key = $variation_id > 0 ? 'v:' . $variation_id : 'p:' . $product_id;
			if ( ! isset( $merged[ $key ] ) ) {
				$merged[ $key ] = array( 'product_id' => $product_id, 'variation_id' => $variation_id, 'quantity' => 0 );
			}
			if ( (int) $merged[ $key ]['product_id'] !== $product_id ) {
				return new WP_Error( 'phaseone_bulk_variation_mismatch', 'A variation does not belong to the submitted product.', array( 'status' => 400 ) );
			}
			$merged[ $key ]['quantity'] += $quantity;
		}
		return array_values( $merged );
	}

	private static function resolve_product( array $item ): WC_Product|WP_Error {
		if ( (int) $item['variation_id'] > 0 ) {
			$product = wc_get_product( (int) $item['variation_id'] );
			if ( ! $product instanceof WC_Product_Variation || (int) $product->get_parent_id() !== (int) $item['product_id'] ) {
				return new WP_Error( 'phaseone_bulk_variation_mismatch', 'A variation does not belong to the submitted product.', array( 'status' => 400 ) );
			}
			return $product;
		}
		$product = wc_get_product( (int) $item['product_id'] );
		if ( ! $product instanceof WC_Product || ! $product->is_type( 'simple' ) ) {
			return new WP_Error( 'phaseone_bulk_invalid_product', 'Choose a valid simple product or variation.', array( 'status' => 400 ) );
		}
		return $product;
	}

	private static function effective_maximum( WC_Product $product, int $configured_maximum ): int {
		$limits = array();
		if ( $configured_maximum > 0 ) {
			$limits[] = $configured_maximum;
		}
		$woo_max = (int) $product->get_max_purchase_quantity();
		if ( $woo_max > 0 ) {
			$limits[] = $woo_max;
		}
		if ( $product->managing_stock() && ! $product->backorders_allowed() && null !== $product->get_stock_quantity() ) {
			$limits[] = max( 0, (int) $product->get_stock_quantity() );
		}
		return empty( $limits ) ? 0 : min( $limits );
	}

	private static function build_line( WC_Product $product, array $rule, array $price, int $quantity, int $maximum, float $line_total, ?bool $available = null ): array {
		$parent = $product->is_type( 'variation' ) ? wc_get_product( $product->get_parent_id() ) : $product;
		$image_id = $product->get_image_id() ?: ( $parent instanceof WC_Product ? $parent->get_image_id() : 0 );
		$categories = $parent instanceof WC_Product ? wp_get_post_terms( $parent->get_id(), 'product_cat', array( 'fields' => 'names' ) ) : array();
		$attributes = array();
		if ( $product instanceof WC_Product_Variation ) {
			foreach ( $product->get_variation_attributes() as $key => $value ) {
				$attributes[] = array(
					'name'  => wc_attribute_label( str_replace( 'attribute_', '', $key ), $parent ),
					'value' => $value,
				);
			}
		}

		return array(
			'product_id'     => (int) $rule['product_id'],
			'variation_id'   => (int) $rule['variation_id'],
			'purchasable_id' => (int) $product->get_id(),
			'parent_name'    => $parent instanceof WC_Product ? wp_strip_all_tags( $parent->get_name() ) : '',
			'name'           => wp_strip_all_tags( $product->get_name() ),
			'sku'            => (string) $product->get_sku(),
			'image'          => $image_id ? (string) wp_get_attachment_image_url( $image_id, 'woocommerce_thumbnail' ) : (string) wc_placeholder_img_src( 'woocommerce_thumbnail' ),
			'attributes'     => $attributes,
			'categories'     => is_wp_error( $categories ) ? array() : array_values( $categories ),
			'quantity'       => $quantity,
			'minimum'        => (int) $rule['minimum'],
			'maximum'        => $maximum,
			'pricing_mode'   => (string) $rule['mode'],
			'tiers'          => $rule['tiers'],
			'unit_price'     => self::money( $price['unit_price'] ),
			'tier'           => (string) $price['tier'],
			'line_total'     => $line_total,
			'rule_revision'  => (string) $rule['revision'],
			'available'      => null === $available ? true : $available,
			'backorders'     => $product->backorders_allowed(),
		);
	}

	private static function money( float $value ): float {
		return round( max( 0, $value ), wc_get_price_decimals() );
	}
}
