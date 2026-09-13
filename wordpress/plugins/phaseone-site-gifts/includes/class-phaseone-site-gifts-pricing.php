<?php

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Site_Gifts_Pricing {
	private const BUNDLE_ONE_QUANTITY = 5;
	private const BUNDLE_ONE_RATE = 0.10;
	private const BUNDLE_TWO_QUANTITY = 10;
	private const BUNDLE_TWO_RATE = 0.30;

	public static function is_gift_item( $item ): bool {
		return $item instanceof WC_Order_Item_Product
			&& 'yes' === (string) $item->get_meta( '_phaseone_promotional_gift', true );
	}

	public static function apply_to_order( WC_Order $order ): array {
		$quantity            = 0;
		$decimals            = wc_get_price_decimals();

		foreach ( $order->get_items( 'line_item' ) as $item ) {
			if ( ! $item instanceof WC_Order_Item_Product || self::is_gift_item( $item ) ) {
				continue;
			}

			$item_qty = max( 1, (int) $item->get_quantity() );
			$is_recon = self::is_recon( $item->get_product() );
			$base_meta = $item->get_meta( '_phaseone_authoritative_base_subtotal', true );
			$base = '' !== $base_meta && is_numeric( $base_meta )
				? round( (float) $base_meta, $decimals )
				: round( (float) $item->get_subtotal(), $decimals );

			if ( '' === $base_meta || ! is_numeric( $base_meta ) ) {
				$item->update_meta_data( '_phaseone_authoritative_base_subtotal', wc_format_decimal( $base, $decimals ) );
				$item->update_meta_data( '_phaseone_authoritative_base_unit_price', wc_format_decimal( $base / $item_qty, $decimals ) );
				$item->save();
			}

			if ( ! $is_recon ) {
				$quantity += $item_qty;
			}
		}

		$recon_active    = false;
		$recon_discount  = 0.0;
		$bundle          = self::bundle_tier( $quantity );
		$bundle_discount = 0.0;

		foreach ( $order->get_items( 'line_item' ) as $item ) {
			if ( ! $item instanceof WC_Order_Item_Product || self::is_gift_item( $item ) ) {
				continue;
			}

			$item_qty = max( 1, (int) $item->get_quantity() );
			$base     = round( (float) $item->get_meta( '_phaseone_authoritative_base_subtotal', true ), $decimals );
			$target   = $base;
			$is_recon = self::is_recon( $item->get_product() );
			$bundle_applies = false;

			if ( ! $is_recon && $bundle['active'] ) {
				$target = round( $base * ( 1 - $bundle['discount_rate'] ), $decimals );
				$bundle_discount += max( 0, $base - $target );
				$bundle_applies = true;
			}

			$item->set_subtotal( $target );
			$item->set_total( $target );
			$item->update_meta_data( '_phaseone_locked_pre_coupon_subtotal', wc_format_decimal( $target, $decimals ) );
			$item->update_meta_data( '_phaseone_bundle_tier_percent', (int) $bundle['discount_percent'] );
			$item->update_meta_data( '_phaseone_bundle_tier_quantity', (int) $bundle['required_quantity'] );
			$item->update_meta_data( '_phaseone_bundle_applied_to_line', $bundle_applies ? 'yes' : 'no' );
			$item->save();
		}

		$order->calculate_totals( false );
		$merchandise_total = 0.0;
		foreach ( $order->get_items( 'line_item' ) as $item ) {
			if ( $item instanceof WC_Order_Item_Product && ! self::is_gift_item( $item ) ) {
				$merchandise_total += (float) $item->get_subtotal();
			}
		}

		return array(
			'recon_water_promo_active' => $recon_active,
			'recon_water_discount'     => round( $recon_discount, 2 ),
			'bundle_active'             => (bool) $bundle['active'],
			'bundle_discount'           => round( $bundle_discount, 2 ),
			'bundle_rate'               => (float) $bundle['discount_rate'],
			'bundle_percent'            => (int) $bundle['discount_percent'],
			'bundle_required_quantity'  => (int) $bundle['required_quantity'],
			'bundle_tier_key'           => (string) $bundle['key'],
			'merchandise_total'         => round( $merchandise_total, 2 ),
			'quantity'                  => $quantity,
		);
	}

	public static function quote( array $raw_items, array $coupon_codes = array() ): array {
		if ( ! class_exists( 'WC_Cart' ) ) {
			throw new RuntimeException( 'WooCommerce cart services are unavailable.' );
		}

		$items = self::normalize_quote_items( $raw_items );
		if ( empty( $items ) ) {
			return array( 'eligible_total' => 0.0, 'merchandise_total' => 0.0, 'coupons' => array() );
		}

		$woocommerce = WC();
		$original_session = $woocommerce->session;
		$original_customer = $woocommerce->customer;
		$original_cart = $woocommerce->cart;

		// REST requests do not bootstrap the frontend WooCommerce session. The
		// cart calculator still expects one, so provide an isolated in-memory
		// session for this quote only. Nothing is persisted and no cookie is sent.
		if ( ! $woocommerce->session instanceof WC_Session ) {
			$woocommerce->session = new class() extends WC_Session {};
		}
		if ( ! $woocommerce->customer instanceof WC_Customer ) {
			$woocommerce->customer = new WC_Customer( 0, true );
		}

		try {
			$quantity = 0;
			foreach ( $items as $item ) {
				if ( ! $item['is_recon'] ) {
					$quantity += $item['quantity'];
				}
			}

			$bundle = self::bundle_tier( $quantity );
			$disable_session_hooks = static fn(): bool => false;
			add_filter( 'woocommerce_cart_session_initialize', $disable_session_hooks, PHP_INT_MAX );
			$cart = new WC_Cart();
			remove_filter( 'woocommerce_cart_session_initialize', $disable_session_hooks, PHP_INT_MAX );
			$woocommerce->cart = $cart;
			if ( ! did_action( 'woocommerce_load_cart_from_session' ) ) {
				do_action( 'woocommerce_load_cart_from_session' );
			}

			$cart_contents = array();
			foreach ( $items as &$item ) {
				$unit = $item['base_unit'];
				if ( ! $item['is_recon'] && $bundle['active'] ) {
					$unit = round( $unit * ( 1 - $bundle['discount_rate'] ), wc_get_price_decimals() );
				}

				$item['priced_unit'] = $unit;
				$variation = $item['product'] instanceof WC_Product_Variation
					? $item['product']->get_variation_attributes()
					: array();
				$priced_product = clone $item['product'];
				$priced_product->set_price( $unit );
				$cart_key = $cart->generate_cart_id( $item['product_id'], $item['variation_id'], $variation, array() );
				$cart_contents[ $cart_key ] = array(
					'key'          => $cart_key,
					'product_id'   => $item['product_id'],
					'variation_id' => $item['variation_id'],
					'variation'    => $variation,
					'quantity'     => $item['quantity'],
					'data'         => $priced_product,
					'data_hash'    => wc_get_cart_item_data_hash( $priced_product ),
				);
			}
			unset( $item );
			$cart->set_cart_contents( $cart_contents );

			foreach ( array_slice( array_unique( array_filter( array_map( 'wc_format_coupon_code', $coupon_codes ) ) ), 0, 3 ) as $code ) {
				if ( ! $cart->apply_coupon( $code ) ) {
					throw new RuntimeException( sprintf( 'Coupon %s is invalid for this cart.', $code ) );
				}
			}

			$cart->calculate_totals();
			$eligible_total = 0.0;
			foreach ( $cart->get_cart() as $cart_item ) {
				$eligible_total += (float) ( $cart_item['line_total'] ?? 0 );
			}

			return array(
				'eligible_total'    => round( max( 0, $eligible_total ), 2 ),
				'merchandise_total' => round( (float) $cart->get_subtotal(), 2 ),
				'coupons'           => array_values( $cart->get_applied_coupons() ),
				'pricing'           => array(
					'bundle_active'            => (bool) $bundle['active'],
					'bundle_percent'           => (int) $bundle['discount_percent'],
					'bundle_required_quantity' => (int) $bundle['required_quantity'],
					'recon_water_promo_active' => false,
				),
			);
		} finally {
			$woocommerce->cart = $original_cart;
			$woocommerce->customer = $original_customer;
			$woocommerce->session = $original_session;
		}
	}

	private static function normalize_quote_items( array $raw_items ): array {
		$normalized = array();
		foreach ( array_slice( $raw_items, 0, 50 ) as $raw ) {
			if ( ! is_array( $raw ) ) {
				continue;
			}

			$product_id   = absint( $raw['product_id'] ?? $raw['productId'] ?? 0 );
			$variation_id = absint( $raw['variation_id'] ?? $raw['variationId'] ?? 0 );
			$quantity     = max( 1, min( 99, absint( $raw['quantity'] ?? 1 ) ) );
			$lookup_id    = $variation_id ?: $product_id;
			$product      = wc_get_product( $lookup_id );

			if ( ! $product instanceof WC_Product || ! $product->exists() || ! $product->is_purchasable() || ! $product->is_in_stock() ) {
				throw new RuntimeException( 'A product is unavailable.' );
			}
			if ( $variation_id && ( ! $product instanceof WC_Product_Variation || (int) $product->get_parent_id() !== $product_id ) ) {
				throw new RuntimeException( 'A product variation is invalid.' );
			}
			if ( method_exists( $product, 'has_enough_stock' ) && ! $product->has_enough_stock( $quantity ) ) {
				throw new RuntimeException( sprintf( '%s does not have enough stock.', $product->get_name() ) );
			}

			$key = (string) $lookup_id;
			if ( isset( $normalized[ $key ] ) ) {
				$normalized[ $key ]['quantity'] = min( 99, $normalized[ $key ]['quantity'] + $quantity );
				continue;
			}

			$normalized[ $key ] = array(
				'product_id'   => $variation_id ? (int) $product->get_parent_id() : (int) $product->get_id(),
				'variation_id' => $variation_id,
				'quantity'     => $quantity,
				'product'      => $product,
				'base_unit'    => (float) $product->get_price(),
				'is_recon'     => self::is_recon( $product ),
			);
		}

		return array_values( $normalized );
	}

	private static function normalize_identifier( $value ): string {
		return sanitize_title( remove_accents( wp_strip_all_tags( (string) $value ) ) );
	}

	private static function is_recon( $product ): bool {
		if ( ! $product instanceof WC_Product ) {
			return false;
		}

		$products = array( $product );
		if ( $product instanceof WC_Product_Variation && $product->get_parent_id() ) {
			$parent = wc_get_product( $product->get_parent_id() );
			if ( $parent instanceof WC_Product ) {
				$products[] = $parent;
			}
		}

		foreach ( $products as $candidate ) {
			foreach ( array( $candidate->get_slug(), $candidate->get_sku(), $candidate->get_name() ) as $identifier ) {
				$clean = self::normalize_identifier( $identifier );
				if (
					in_array( $clean, array( 'h-recon', 'h-recon-water', 'recon-water', 'recon-water-30ml' ), true )
					|| str_starts_with( $clean, 'h-recon-' )
					|| str_starts_with( $clean, 'recon-water-' )
				) {
					return true;
				}
			}
		}

		return false;
	}

	private static function bundle_tier( int $quantity ): array {
		$two_quantity = (int) apply_filters( 'phaseone_prism_bundle_tier_two_quantity', self::BUNDLE_TWO_QUANTITY );
		$two_rate     = (float) apply_filters( 'phaseone_prism_bundle_tier_two_rate', self::BUNDLE_TWO_RATE );
		$one_quantity = (int) apply_filters( 'phaseone_prism_bundle_tier_one_quantity', self::BUNDLE_ONE_QUANTITY );
		$one_rate     = (float) apply_filters( 'phaseone_prism_bundle_tier_one_rate', self::BUNDLE_ONE_RATE );

		if ( $quantity >= $two_quantity ) {
			return array( 'active' => true, 'required_quantity' => $two_quantity, 'discount_rate' => $two_rate, 'discount_percent' => (int) round( $two_rate * 100 ), 'key' => $two_quantity . '-products-' . (int) round( $two_rate * 100 ) . '-percent' );
		}
		if ( $quantity >= $one_quantity ) {
			return array( 'active' => true, 'required_quantity' => $one_quantity, 'discount_rate' => $one_rate, 'discount_percent' => (int) round( $one_rate * 100 ), 'key' => $one_quantity . '-products-' . (int) round( $one_rate * 100 ) . '-percent' );
		}

		return array( 'active' => false, 'required_quantity' => 0, 'discount_rate' => 0.0, 'discount_percent' => 0, 'key' => 'none' );
	}

}
