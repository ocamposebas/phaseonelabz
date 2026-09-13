<?php

defined( 'ABSPATH' ) || exit;

/**
 * Narrow integration contract for the existing payment/order handlers.
 * Adapters call from_payload() before any retail pricing and then use
 * apply_to_order() instead of their retail line/pricing routine.
 */
final class PhaseOne_Bulk_Checkout {
	public static function authenticated_customer_id( WP_REST_Request $request ): int {
		$current = get_current_user_id();
		if ( $current > 0 ) {
			return $current;
		}
		$authorization = trim( (string) $request->get_header( 'authorization' ) );
		if ( '' === $authorization ) {
			return 0;
		}
		$account_request = new WP_REST_Request( 'GET', '/lab/v1/account-token' );
		$account_request->set_header( 'authorization', $authorization );
		$response = rest_do_request( $account_request );
		if ( is_wp_error( $response ) || $response->is_error() ) {
			return 0;
		}
		$data = $response->get_data();
		$user = is_array( $data ) ? ( $data['user'] ?? $data['customer'] ?? $data ) : array();
		return is_array( $user ) ? absint( $user['id'] ?? $user['customer_id'] ?? 0 ) : 0;
	}

	public static function from_payload( array $payload, int $customer_id ): array|null|WP_Error {
		$session_token = trim( (string) ( $payload['bulk_session_token'] ?? '' ) );
		$intent_token  = trim( (string) ( $payload['bulk_intent_token'] ?? '' ) );
		$declared_mode = sanitize_key( (string) ( $payload['checkout_mode'] ?? '' ) );

		if ( '' === $session_token && '' === $intent_token && 'bulk' !== $declared_mode ) {
			return null;
		}
		if ( $customer_id <= 0 ) {
			return new WP_Error( 'phaseone_bulk_login_required', 'You must be signed in to complete a Bulk order.', array( 'status' => 401 ) );
		}

		$session = PhaseOne_Bulk_Access::context( $session_token, $customer_id );
		if ( is_wp_error( $session ) ) {
			return $session;
		}
		$intent = PhaseOne_Bulk_Intents::resolve( $intent_token, $session );
		if ( is_wp_error( $intent ) ) {
			return $intent;
		}
		if ( 'ordered' === $intent['status'] && (int) $intent['order_id'] > 0 ) {
			return array(
				'is_bulk'       => true,
				'is_idempotent' => true,
				'order_id'      => (int) $intent['order_id'],
				'intent'        => $intent,
			);
		}
		if ( 'open' !== $intent['status'] ) {
			return new WP_Error( 'phaseone_bulk_intent_processing', 'This Bulk checkout is already being processed.', array( 'status' => 409 ) );
		}
		if ( (int) $intent['customer_id'] > 0 && (int) $intent['customer_id'] !== $customer_id ) {
			return new WP_Error( 'phaseone_bulk_customer_mismatch', 'This Bulk checkout belongs to another account.', array( 'status' => 403 ) );
		}
		if ( ! PhaseOne_Bulk_Intents::bind_customer( (int) $intent['id'], $customer_id ) ) {
			return new WP_Error( 'phaseone_bulk_customer_bind_failed', 'The Bulk checkout could not be assigned to your account.', array( 'status' => 409 ) );
		}

		$quote = PhaseOne_Bulk_Pricing_Engine::quote( $intent['items'] );
		if ( is_wp_error( $quote ) ) {
			return $quote;
		}
		if ( ! hash_equals( (string) $intent['quote_fingerprint'], (string) $quote['fingerprint'] ) ) {
			return new WP_Error( 'phaseone_bulk_quote_changed', 'Bulk pricing changed after this checkout was prepared. Return to the Bulk catalog and continue again.', array( 'status' => 409 ) );
		}
		$claimed = PhaseOne_Bulk_Intents::claim( (int) $intent['id'] );
		if ( is_wp_error( $claimed ) ) {
			return $claimed;
		}

		return array(
			'is_bulk'       => true,
			'is_idempotent' => false,
			'access_mode'   => (string) $session['access_mode'],
			'access_source' => (string) $session['source'],
			'access_id'     => (int) $session['access_id'],
			'session_id'    => (int) $session['id'],
			'intent_id'     => (int) $intent['id'],
			'customer_id'   => $customer_id,
			'quote'         => $quote,
			'intent'        => $intent,
		);
	}

	public static function apply_to_order( WC_Order $order, array $context ): bool|WP_Error {
		if ( empty( $context['is_bulk'] ) || empty( $context['quote']['lines'] ) ) {
			return new WP_Error( 'phaseone_bulk_context_invalid', 'Bulk checkout context is invalid.' );
		}
		if ( $order->get_items( 'line_item' ) ) {
			return new WP_Error( 'phaseone_bulk_mixed_cart', 'Retail and Bulk products cannot be combined in one order.' );
		}

		$order->update_meta_data( '_phaseone_bulk_order', 'yes' );
		$order->update_meta_data( '_phaseone_bulk_access_mode', sanitize_key( (string) ( $context['access_mode'] ?? 'private' ) ) );
		$order->update_meta_data( '_phaseone_bulk_access_source', sanitize_key( (string) ( $context['access_source'] ?? 'code' ) ) );
		$order->update_meta_data( '_phaseone_bulk_access_id', (int) $context['access_id'] );
		$order->update_meta_data( '_phaseone_bulk_intent_id', (int) $context['intent_id'] );
		$order->update_meta_data( '_phaseone_bulk_pricing_fingerprint', sanitize_text_field( $context['quote']['fingerprint'] ) );
		$order->update_meta_data( '_phaseone_bulk_site_gifts_excluded', 'yes' );
		$order->update_meta_data( '_phaseone_bulk_coupons_excluded', 'yes' );
		$order->update_meta_data( '_phaseone_bulk_affiliate_excluded', 'yes' );
		$order->update_meta_data( '_phaseone_bulk_store_credit_excluded', 'yes' );

		foreach ( $context['quote']['lines'] as $line ) {
			$product = wc_get_product( (int) $line['purchasable_id'] );
			if ( ! $product instanceof WC_Product ) {
				return new WP_Error( 'phaseone_bulk_product_missing', 'A Bulk product is no longer available.' );
			}
			$item_id = $order->add_product( $product, (int) $line['quantity'] );
			$item    = $order->get_item( $item_id );
			if ( ! $item instanceof WC_Order_Item_Product ) {
				return new WP_Error( 'phaseone_bulk_line_failed', 'WooCommerce could not create a Bulk order line.' );
			}
			$item->set_subtotal( wc_format_decimal( $line['line_total'], wc_get_price_decimals() ) );
			$item->set_total( wc_format_decimal( $line['line_total'], wc_get_price_decimals() ) );
			$item->update_meta_data( '_phaseone_bulk_item', 'yes' );
			$item->update_meta_data( '_phaseone_bulk_unit_price', wc_format_decimal( $line['unit_price'], wc_get_price_decimals() ) );
			$item->update_meta_data( '_phaseone_bulk_tier', sanitize_text_field( $line['tier'] ) );
			$item->update_meta_data( '_phaseone_bulk_min_qty', (int) $line['minimum'] );
			$item->update_meta_data( '_phaseone_bulk_rule_revision', sanitize_text_field( $line['rule_revision'] ) );
			$item->update_meta_data( '_phaseone_bulk_kit_units', (int) ( $line['kit_units'] ?? PhaseOne_Bulk_Installer::KIT_UNITS ) );
			$item->update_meta_data( '_phaseone_bulk_retail_unit_price', wc_format_decimal( $line['retail_unit_price'] ?? 0, wc_get_price_decimals() ) );
			$item->update_meta_data( '_phaseone_bulk_savings_percent', wc_format_decimal( $line['savings_percent'] ?? 0, 2 ) );
			$item->update_meta_data( '_phaseone_bulk_pricing_source', sanitize_key( (string) ( $line['pricing_source'] ?? '' ) ) );
			$item->save();
		}

		$order->save();
		return true;
	}

	public static function complete( array $context, WC_Order $order ): bool {
		return ! empty( $context['intent_id'] ) && PhaseOne_Bulk_Intents::mark_order( (int) $context['intent_id'], (int) $order->get_id() );
	}

	public static function decorate_existing_order( WC_Order $order, array $context ): bool|WP_Error {
		$items = array_values( $order->get_items( 'line_item' ) );
		$lines = array_values( $context['quote']['lines'] ?? array() );
		if ( count( $items ) !== count( $lines ) ) {
			return new WP_Error( 'phaseone_bulk_line_count_mismatch', 'Bulk order lines do not match the authoritative quote.' );
		}

		$order->update_meta_data( '_phaseone_bulk_order', 'yes' );
		$order->update_meta_data( '_phaseone_bulk_access_mode', sanitize_key( (string) ( $context['access_mode'] ?? 'private' ) ) );
		$order->update_meta_data( '_phaseone_bulk_access_source', sanitize_key( (string) ( $context['access_source'] ?? 'code' ) ) );
		$order->update_meta_data( '_phaseone_bulk_access_id', (int) $context['access_id'] );
		$order->update_meta_data( '_phaseone_bulk_intent_id', (int) $context['intent_id'] );
		$order->update_meta_data( '_phaseone_bulk_pricing_fingerprint', sanitize_text_field( $context['quote']['fingerprint'] ) );
		$order->update_meta_data( '_phaseone_bulk_site_gifts_excluded', 'yes' );
		$order->update_meta_data( '_phaseone_bulk_coupons_excluded', 'yes' );
		$order->update_meta_data( '_phaseone_bulk_affiliate_excluded', 'yes' );
		$order->update_meta_data( '_phaseone_bulk_store_credit_excluded', 'yes' );

		foreach ( $items as $index => $item ) {
			$line = $lines[ $index ];
			$expected_id = (int) $line['purchasable_id'];
			$actual_id = (int) ( $item->get_variation_id() ?: $item->get_product_id() );
			if ( $actual_id !== $expected_id || (int) $item->get_quantity() !== (int) $line['quantity'] || round( (float) $item->get_subtotal(), wc_get_price_decimals() ) !== round( (float) $line['line_total'], wc_get_price_decimals() ) ) {
				return new WP_Error( 'phaseone_bulk_line_mismatch', 'A persisted Bulk order line differs from its authoritative quote.' );
			}
			$item->update_meta_data( '_phaseone_bulk_item', 'yes' );
			$item->update_meta_data( '_phaseone_bulk_unit_price', wc_format_decimal( $line['unit_price'], wc_get_price_decimals() ) );
			$item->update_meta_data( '_phaseone_bulk_tier', sanitize_text_field( $line['tier'] ) );
			$item->update_meta_data( '_phaseone_bulk_min_qty', (int) $line['minimum'] );
			$item->update_meta_data( '_phaseone_bulk_rule_revision', sanitize_text_field( $line['rule_revision'] ) );
			$item->update_meta_data( '_phaseone_bulk_kit_units', (int) ( $line['kit_units'] ?? PhaseOne_Bulk_Installer::KIT_UNITS ) );
			$item->update_meta_data( '_phaseone_bulk_retail_unit_price', wc_format_decimal( $line['retail_unit_price'] ?? 0, wc_get_price_decimals() ) );
			$item->update_meta_data( '_phaseone_bulk_savings_percent', wc_format_decimal( $line['savings_percent'] ?? 0, 2 ) );
			$item->update_meta_data( '_phaseone_bulk_pricing_source', sanitize_key( (string) ( $line['pricing_source'] ?? '' ) ) );
			$item->save();
		}
		$order->save();
		return true;
	}

	public static function release( array $context ): void {
		if ( ! empty( $context['intent_id'] ) ) {
			PhaseOne_Bulk_Intents::release( (int) $context['intent_id'] );
		}
	}
}
