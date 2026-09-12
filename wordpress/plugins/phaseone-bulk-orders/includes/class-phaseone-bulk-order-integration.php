<?php

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Bulk_Order_Integration {
	public static function boot(): void {
		add_filter( 'phaseone_site_gifts_eligible_total', array( __CLASS__, 'exclude_site_gifts' ), 5, 2 );
		add_filter( 'wcusage_calculate_edit_commission', array( __CLASS__, 'exclude_affiliate_commission' ), 5, 4 );
		add_filter( 'woocommerce_hidden_order_itemmeta', array( __CLASS__, 'hide_internal_item_meta' ) );
		add_action( 'woocommerce_admin_order_data_after_order_details', array( __CLASS__, 'render_admin_order_flag' ) );
		add_filter( 'woocommerce_shop_order_list_table_columns', array( __CLASS__, 'hpos_columns' ) );
		add_action( 'woocommerce_shop_order_list_table_custom_column', array( __CLASS__, 'hpos_column_value' ), 10, 2 );
		add_filter( 'manage_edit-shop_order_columns', array( __CLASS__, 'legacy_columns' ) );
		add_action( 'manage_shop_order_posts_custom_column', array( __CLASS__, 'legacy_column_value' ), 10, 2 );
	}

	public static function is_bulk_order( mixed $order ): bool {
		$order = $order instanceof WC_Order ? $order : wc_get_order( absint( $order ) );
		return $order instanceof WC_Order && 'yes' === $order->get_meta( '_phaseone_bulk_order', true );
	}

	public static function exclude_site_gifts( float $total, WC_Order $order ): float {
		return self::is_bulk_order( $order ) ? 0.0 : $total;
	}

	public static function exclude_affiliate_commission( mixed $commission, mixed $order_id, mixed $coupon_id = 0, mixed $coupon_user = null ): mixed {
		return self::is_bulk_order( $order_id ) ? 0 : $commission;
	}

	public static function hide_internal_item_meta( array $keys ): array {
		return array_values(
			array_unique(
				array_merge(
					$keys,
					array(
						'_phaseone_bulk_item',
						'_phaseone_bulk_unit_price',
						'_phaseone_bulk_tier',
						'_phaseone_bulk_min_qty',
						'_phaseone_bulk_rule_revision',
					)
				)
			)
		);
	}

	public static function render_admin_order_flag( WC_Order $order ): void {
		if ( ! self::is_bulk_order( $order ) ) {
			return;
		}
		echo '<p class="form-field form-field-wide"><strong>Phase One order type:</strong> <span style="display:inline-block;margin-left:6px;padding:2px 8px;border:1px solid #2271b1;border-radius:999px;color:#135e96;font-size:12px;font-weight:600;">Bulk Order</span></p>';
	}

	public static function hpos_columns( array $columns ): array {
		$columns['phaseone_bulk'] = 'Order type';
		return $columns;
	}

	public static function hpos_column_value( string $column, WC_Order $order ): void {
		if ( 'phaseone_bulk' === $column && self::is_bulk_order( $order ) ) {
			echo '<strong>Bulk</strong>';
		}
	}

	public static function legacy_columns( array $columns ): array {
		$columns['phaseone_bulk'] = 'Order type';
		return $columns;
	}

	public static function legacy_column_value( string $column, int $post_id ): void {
		if ( 'phaseone_bulk' === $column && self::is_bulk_order( $post_id ) ) {
			echo '<strong>Bulk</strong>';
		}
	}
}
