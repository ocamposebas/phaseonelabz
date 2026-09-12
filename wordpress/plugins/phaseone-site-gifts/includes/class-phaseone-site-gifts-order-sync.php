<?php

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Site_Gifts_Order_Sync {
	private static array $locks = array();
	private static array $queued = array();

	public static function boot(): void {
		add_action( 'phaseone_prism_after_gateway_verified', array( __CLASS__, 'sync' ), 10, 1 );
		add_action( 'woocommerce_checkout_order_created', array( __CLASS__, 'sync' ), 20, 1 );
		add_action( 'woocommerce_store_api_checkout_order_processed', array( __CLASS__, 'sync' ), 20, 1 );
		add_action( 'woocommerce_rest_insert_shop_order_object', array( __CLASS__, 'sync_rest_order' ), 20, 3 );
		add_action( 'woocommerce_new_order', array( __CLASS__, 'queue_order' ), 20, 1 );
		add_action( 'woocommerce_order_status_pending', array( __CLASS__, 'sync' ), 5, 1 );
		add_action( 'woocommerce_order_status_on-hold', array( __CLASS__, 'sync' ), 5, 1 );
		add_action( 'woocommerce_order_status_processing', array( __CLASS__, 'sync' ), 5, 1 );
		add_action( 'shutdown', array( __CLASS__, 'flush_queue' ), 5 );
	}

	public static function queue_order( $order_id ): void {
		$order_id = absint( $order_id );
		if ( $order_id ) {
			self::$queued[ $order_id ] = true;
		}
	}

	public static function flush_queue(): void {
		foreach ( array_keys( self::$queued ) as $order_id ) {
			self::sync( $order_id );
		}
		self::$queued = array();
	}

	public static function sync_rest_order( $order, $request, $creating ): void {
		if ( $creating && $order instanceof WC_Order ) {
			self::sync( $order );
		}
	}

	public static function sync( $order_or_id ): void {
		$order = $order_or_id instanceof WC_Order ? $order_or_id : wc_get_order( absint( $order_or_id ) );
		if ( ! $order instanceof WC_Order || ! self::is_current_order( $order ) ) {
			return;
		}

		$order_id = (int) $order->get_id();
		$lock_key = $order_id > 0 ? (string) $order_id : spl_object_hash( $order );
		if ( isset( self::$locks[ $lock_key ] ) ) {
			return;
		}

		self::$locks[ $lock_key ] = true;
		try {
			self::reconcile( $order );
		} catch ( Throwable $exception ) {
			wc_get_logger()->error(
				'Order gift reconciliation failed: ' . $exception->getMessage(),
				array( 'source' => 'phaseone-site-gifts', 'order_id' => $order_id )
			);
		} finally {
			unset( self::$locks[ $lock_key ] );
		}
	}

	private static function reconcile( WC_Order $order ): void {
		$evaluation = PhaseOne_Site_Gifts_Engine::evaluate_order( $order );
		$desired = array();
		foreach ( $evaluation['gifts'] as $gift ) {
			$desired[ (string) $gift['ruleId'] ] = $gift;
		}

		$existing = array();
		foreach ( $order->get_items( 'line_item' ) as $item_id => $item ) {
			if ( ! PhaseOne_Site_Gifts_Pricing::is_gift_item( $item ) ) {
				continue;
			}
			$rule_id = sanitize_key( (string) $item->get_meta( '_phaseone_gift_rule_id', true ) );
			if ( '' === $rule_id || isset( $existing[ $rule_id ] ) ) {
				self::restore_removed_stock( $item );
				$order->remove_item( $item_id );
				continue;
			}
			$existing[ $rule_id ] = $item;
		}

		foreach ( $existing as $rule_id => $item ) {
			if ( isset( $desired[ $rule_id ] ) ) {
				$gift = $desired[ $rule_id ];
				$expected_product_id = (int) $gift['productId'];
				$expected_variation_id = (int) $gift['variationId'];
				if ( (int) $item->get_product_id() === $expected_product_id
					&& (int) $item->get_variation_id() === $expected_variation_id ) {
					continue;
				}
			}
			self::restore_removed_stock( $item );
			$order->remove_item( $item->get_id() );
			unset( $existing[ $rule_id ] );
		}

		$new_items = array();
		foreach ( $desired as $rule_id => $gift ) {
			if ( isset( $existing[ $rule_id ] ) ) {
				$item = $existing[ $rule_id ];
				$old_quantity = max( 0, (int) $item->get_quantity() );
				$new_quantity = max( 1, (int) $gift['quantity'] );
				$item->set_quantity( $new_quantity );
				$item->set_subtotal( 0 );
				$item->set_total( 0 );
				$item->set_taxes( array( 'subtotal' => array(), 'total' => array() ) );
				$item->update_meta_data( '_phaseone_gift_threshold', wc_format_decimal( $gift['threshold'], 2 ) );
				$item->update_meta_data( '_phaseone_gift_mode', (string) $evaluation['mode'] );
				$item->save();
				self::adjust_reduced_stock_for_quantity_change( $item, $old_quantity, $new_quantity );
				continue;
			}

			$lookup_id = ! empty( $gift['variationId'] ) ? (int) $gift['variationId'] : (int) $gift['productId'];
			$product = wc_get_product( $lookup_id );
			if ( ! $product instanceof WC_Product ) {
				continue;
			}

			$args = array(
				'subtotal' => 0,
				'total'    => 0,
			);
			if ( $product instanceof WC_Product_Variation ) {
				$args['variation'] = $product->get_variation_attributes();
			}

			$item_id = $order->add_product( $product, (int) $gift['quantity'], $args );
			$item = $item_id ? $order->get_item( $item_id ) : false;
			if ( ! $item instanceof WC_Order_Item_Product ) {
				throw new RuntimeException( sprintf( 'Gift %s could not be added to the order.', $rule_id ) );
			}

			$item->set_subtotal( 0 );
			$item->set_total( 0 );
			$item->set_taxes( array( 'subtotal' => array(), 'total' => array() ) );
			$item->update_meta_data( '_phaseone_promotional_gift', 'yes' );
			$item->update_meta_data( '_phaseone_gift_rule_id', $rule_id );
			$item->update_meta_data( '_phaseone_gift_threshold', wc_format_decimal( $gift['threshold'], 2 ) );
			$item->update_meta_data( '_phaseone_gift_mode', (string) $evaluation['mode'] );
			$item->save();
			$new_items[] = $item;
		}

		$order->update_meta_data( '_phaseone_site_gifts_version', PHASEONE_SITE_GIFTS_VERSION );
		$order->update_meta_data( '_phaseone_site_gifts_mode', (string) $evaluation['mode'] );
		$order->update_meta_data( '_phaseone_site_gifts_eligible_total', wc_format_decimal( $evaluation['eligibleTotal'], 2 ) );
		$order->update_meta_data( '_phaseone_site_gifts_rule_ids', array_keys( $desired ) );
		$order->update_meta_data( '_phaseone_site_gifts_evaluated_at', gmdate( 'c' ) );
		$order->save();

		self::synchronize_stock_state( $order, $new_items );
	}

	private static function synchronize_stock_state( WC_Order $order, array $new_items ): void {
		if ( empty( $new_items ) ) {
			return;
		}

		if ( wc_string_to_bool( $order->get_meta( '_order_stock_reduced', true ) ) ) {
			foreach ( $new_items as $item ) {
				$product = $item->get_product();
				$quantity = (int) $item->get_quantity();
				if ( $product instanceof WC_Product && $product->managing_stock() && $quantity > 0 ) {
					wc_update_product_stock( $product, $quantity, 'decrease' );
					$item->update_meta_data( '_reduced_stock', $quantity );
					$item->save();
				}
			}
			return;
		}

		$minutes = (int) get_option( 'woocommerce_hold_stock_minutes', 0 );
		if ( $minutes > 0 && function_exists( 'wc_reserve_stock_for_order' ) ) {
			$result = wc_reserve_stock_for_order( $order, $minutes );
			if ( is_wp_error( $result ) ) {
				throw new RuntimeException( $result->get_error_message() );
			}
		}
	}

	private static function restore_removed_stock( WC_Order_Item_Product $item ): void {
		$reduced = absint( $item->get_meta( '_reduced_stock', true ) );
		$product = $item->get_product();
		if ( $reduced > 0 && $product instanceof WC_Product && $product->managing_stock() ) {
			wc_update_product_stock( $product, $reduced, 'increase' );
			$item->delete_meta_data( '_reduced_stock' );
			$item->save();
		}
	}

	private static function adjust_reduced_stock_for_quantity_change( WC_Order_Item_Product $item, int $old_quantity, int $new_quantity ): void {
		$reduced = absint( $item->get_meta( '_reduced_stock', true ) );
		$product = $item->get_product();
		if ( $reduced <= 0 || ! $product instanceof WC_Product || ! $product->managing_stock() || $old_quantity === $new_quantity ) {
			return;
		}

		$delta = $new_quantity - $old_quantity;
		wc_update_product_stock( $product, abs( $delta ), $delta > 0 ? 'decrease' : 'increase' );
		$item->update_meta_data( '_reduced_stock', max( 0, $reduced + $delta ) );
		$item->save();
	}

	private static function is_current_order( WC_Order $order ): bool {
		if ( in_array( $order->get_status(), array( 'failed', 'cancelled', 'refunded', 'trash' ), true ) ) {
			return false;
		}

		if ( '' !== (string) $order->get_meta( '_phaseone_site_gifts_evaluated_at', true ) ) {
			return true;
		}

		$created = $order->get_date_created();
		$activated = (int) get_option( 'phaseone_site_gifts_activated_at', time() );
		return $created && $created->getTimestamp() >= $activated;
	}
}
