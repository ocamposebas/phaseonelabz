<?php
/**
 * Shared, server-authoritative store-credit service for Phase One checkouts.
 *
 * The rewards plugin remains the owner of the customer balance stored in
 * _lab_store_credit_balance. Checkout adapters may only request that this
 * service reserve the available balance for a specific WooCommerce order.
 */

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Checkout_Store_Credit {
    private const BALANCE_META       = '_lab_store_credit_balance';
    private const STATUS_META        = '_lab_store_credit_status';
    private const AMOUNT_META        = '_lab_store_credit_amount';
    private const CUSTOMER_META      = '_lab_store_credit_customer_id';
    private const BALANCE_AFTER_META = '_lab_store_credit_balance_after';
    private const EXPIRES_META       = '_lab_store_credit_reservation_expires';
    private const RELEASE_HOOK       = 'phaseone_store_credit_release_reservation';
    private const FEE_NAME           = 'Store Credit';
    private const LOCK_TTL           = 30;

    public static function boot(): void {
        add_action( 'woocommerce_payment_complete', array( __CLASS__, 'commit_order' ), 20 );
        add_action( 'woocommerce_order_status_processing', array( __CLASS__, 'commit_order' ), 20 );
        add_action( 'woocommerce_order_status_completed', array( __CLASS__, 'commit_order' ), 20 );
        add_action( 'woocommerce_order_status_cancelled', array( __CLASS__, 'release_terminal_order' ), 20 );
        add_action( 'woocommerce_order_status_failed', array( __CLASS__, 'release_terminal_order' ), 20 );
        add_action( 'woocommerce_order_status_refunded', array( __CLASS__, 'release_terminal_order' ), 20 );
        add_action( self::RELEASE_HOOK, array( __CLASS__, 'release_expired_order' ), 10, 1 );
    }

    public static function requested( array $payload ): bool {
        $selection = $payload['store_credit'] ?? $payload['storeCredit'] ?? array();

        if ( is_array( $selection ) && ! empty( $selection['apply'] ) ) {
            return true;
        }

        return ! empty( $payload['apply_store_credit'] )
            || ! empty( $payload['applyStoreCredit'] )
            || ! empty( $payload['phaseone_cashback_apply'] );
    }

    public static function authenticated_user_id( WP_REST_Request $request ): int {
        $authorization = trim( (string) $request->get_header( 'authorization' ) );

        if ( preg_match( '/^Bearer\s+(.+)$/i', $authorization, $matches ) ) {
            $token = trim( (string) $matches[1] );
            if ( '' !== $token && function_exists( 'lab_points_get_user_by_token' ) ) {
                $user = lab_points_get_user_by_token( $token );
                if ( $user instanceof WP_User ) {
                    return (int) $user->ID;
                }
            }
        }

        return is_user_logged_in() ? (int) get_current_user_id() : 0;
    }

    public static function balance( int $user_id ): float {
        if ( $user_id <= 0 ) {
            return 0.0;
        }

        if ( function_exists( 'lab_points_get_store_credit_balance' ) ) {
            return self::money( lab_points_get_store_credit_balance( $user_id ) );
        }

        return self::money( get_user_meta( $user_id, self::BALANCE_META, true ) );
    }

    /**
     * Reserve the maximum eligible store credit for an order.
     *
     * @return float|WP_Error Reserved amount or a validation error.
     */
    public static function reserve_for_order( WC_Order $order, int $user_id, int $ttl_seconds = 7200 ) {
        if ( $user_id <= 0 ) {
            return new WP_Error( 'phaseone_store_credit_auth_required', 'Sign in again to use store credit.', array( 'status' => 401 ) );
        }

        $order_id = (int) $order->get_id();
        if ( $order_id <= 0 ) {
            return new WP_Error( 'phaseone_store_credit_order_required', 'Store credit requires a valid WooCommerce order.', array( 'status' => 400 ) );
        }

        $lock_key = self::lock_key( 'order', $order_id );
        if ( ! self::acquire_lock( $lock_key ) ) {
            return new WP_Error( 'phaseone_store_credit_busy', 'Store credit is already being updated. Please try again.', array( 'status' => 409 ) );
        }

        try {
            $existing_status = (string) $order->get_meta( self::STATUS_META, true );
            $existing_amount = self::order_amount( $order );

            if ( in_array( $existing_status, array( 'reserved', 'used' ), true ) && $existing_amount > 0 ) {
                self::ensure_credit_fee( $order, $existing_amount );
                $order->calculate_totals( false );
                return $existing_amount;
            }

            $order_customer_id = (int) $order->get_customer_id();
            if ( $order_customer_id > 0 && $order_customer_id !== $user_id ) {
                return new WP_Error( 'phaseone_store_credit_customer_mismatch', 'Store credit does not belong to this order.', array( 'status' => 403 ) );
            }

            if ( $order_customer_id <= 0 ) {
                $order->set_customer_id( $user_id );
            }

            $eligible_amount = self::eligible_merchandise_amount( $order );
            $available       = self::balance( $user_id );
            $amount          = self::money( min( $available, $eligible_amount ) );

            $order->update_meta_data( '_lab_store_credit_requested', 'yes' );

            if ( $amount <= 0 ) {
                $order->update_meta_data( '_lab_store_credit_applied', 'no' );
                $order->update_meta_data( self::AMOUNT_META, '0.00' );
                return 0.0;
            }

            $next_balance = self::change_balance( $user_id, -$amount );
            if ( is_wp_error( $next_balance ) ) {
                return $next_balance;
            }

            try {
                self::ensure_credit_fee( $order, $amount );
                $order->calculate_totals( false );

                $expires_at = time() + max( 300, $ttl_seconds );
                $order->update_meta_data( '_lab_store_credit_applied', 'yes' );
                $order->update_meta_data( '_lab_store_credit_reserved', 'yes' );
                $order->update_meta_data( self::STATUS_META, 'reserved' );
                $order->update_meta_data( self::AMOUNT_META, self::money_string( $amount ) );
                $order->update_meta_data( self::CUSTOMER_META, $user_id );
                $order->update_meta_data( self::BALANCE_AFTER_META, self::money_string( (float) $next_balance ) );
                $order->update_meta_data( self::EXPIRES_META, $expires_at );
                $order->add_order_note( sprintf( 'Store credit reserved: %s. Remaining customer balance: %s.', self::money_string( $amount ), self::money_string( (float) $next_balance ) ) );
                $order->save();

                if ( ! wp_next_scheduled( self::RELEASE_HOOK, array( $order_id ) ) ) {
                    wp_schedule_single_event( $expires_at, self::RELEASE_HOOK, array( $order_id ) );
                }
            } catch ( Throwable $exception ) {
                self::change_balance( $user_id, $amount );
                throw $exception;
            }

            return $amount;
        } catch ( Throwable $exception ) {
            return new WP_Error( 'phaseone_store_credit_failed', $exception->getMessage(), array( 'status' => 500 ) );
        } finally {
            self::release_lock( $lock_key );
        }
    }

    public static function order_amount( WC_Order $order ): float {
        return self::money( $order->get_meta( self::AMOUNT_META, true ) );
    }

    public static function commit_order( $order_id ): void {
        $order = wc_get_order( $order_id );
        if ( ! $order instanceof WC_Order || 'reserved' !== (string) $order->get_meta( self::STATUS_META, true ) ) {
            return;
        }

        $order->update_meta_data( self::STATUS_META, 'used' );
        $order->update_meta_data( '_lab_store_credit_used_at', gmdate( 'c' ) );
        $order->add_order_note( sprintf( 'Store credit committed: %s.', self::money_string( self::order_amount( $order ) ) ) );
        $order->save();
        self::unschedule_release( (int) $order->get_id() );
    }

    public static function release_terminal_order( $order_id ): void {
        self::release_order( (int) $order_id, 'Order was cancelled, failed, or fully refunded.' );
    }

    public static function release_expired_order( $order_id ): void {
        $order = wc_get_order( $order_id );
        if ( ! $order instanceof WC_Order ) {
            return;
        }

        if ( $order->is_paid() ) {
            self::commit_order( $order_id );
            return;
        }

        $status = (string) $order->get_status();
        if ( ! in_array( $status, array( 'pending', 'on-hold', 'failed', 'cancelled' ), true ) ) {
            return;
        }

        if ( self::release_order( (int) $order_id, 'Store-credit reservation expired before payment.' )
            && in_array( $status, array( 'pending', 'on-hold' ), true ) ) {
            $order = wc_get_order( $order_id );
            if ( $order instanceof WC_Order && ! $order->is_paid() ) {
                $order->update_status( 'cancelled', 'Checkout expired after its store-credit reservation was released.' );
            }
        }
    }

    public static function release_order( int $order_id, string $reason = '' ): bool {
        if ( $order_id <= 0 ) {
            return false;
        }

        $lock_key = self::lock_key( 'order', $order_id );
        if ( ! self::acquire_lock( $lock_key ) ) {
            return false;
        }

        try {
            $order = wc_get_order( $order_id );
            if ( ! $order instanceof WC_Order
                || ! in_array( (string) $order->get_meta( self::STATUS_META, true ), array( 'reserved', 'used' ), true ) ) {
                return false;
            }

            $amount  = self::order_amount( $order );
            $user_id = (int) $order->get_meta( self::CUSTOMER_META, true );
            if ( $user_id <= 0 ) {
                $user_id = (int) $order->get_customer_id();
            }

            if ( $amount <= 0 || $user_id <= 0 ) {
                return false;
            }

            $next_balance = self::change_balance( $user_id, $amount );
            if ( is_wp_error( $next_balance ) ) {
                $order->add_order_note( 'Store credit release failed and requires manual review: ' . $next_balance->get_error_message() );
                $order->save();
                return false;
            }

            $order->update_meta_data( self::STATUS_META, 'released' );
            $order->update_meta_data( '_lab_store_credit_released_at', gmdate( 'c' ) );
            $order->update_meta_data( self::BALANCE_AFTER_META, self::money_string( (float) $next_balance ) );
            $order->add_order_note( sprintf( 'Store credit returned: %s. %s', self::money_string( $amount ), sanitize_text_field( $reason ) ) );
            $order->save();
            self::unschedule_release( $order_id );
            return true;
        } finally {
            self::release_lock( $lock_key );
        }
    }

    private static function eligible_merchandise_amount( WC_Order $order ): float {
        $amount = 0.0;
        foreach ( $order->get_items( 'line_item' ) as $item ) {
            if ( $item instanceof WC_Order_Item_Product ) {
                $amount += (float) $item->get_total() + (float) $item->get_total_tax();
            }
        }
        return self::money( max( 0.0, $amount ) );
    }

    private static function ensure_credit_fee( WC_Order $order, float $amount ): void {
        foreach ( $order->get_items( 'fee' ) as $fee ) {
            if ( $fee instanceof WC_Order_Item_Fee && self::FEE_NAME === (string) $fee->get_name() ) {
                $fee->set_amount( -$amount );
                $fee->set_total( -$amount );
                $fee->set_tax_status( 'none' );
                $fee->save();
                return;
            }
        }

        $fee = new WC_Order_Item_Fee();
        $fee->set_name( self::FEE_NAME );
        $fee->set_amount( -$amount );
        $fee->set_total( -$amount );
        $fee->set_tax_status( 'none' );
        $order->add_item( $fee );
    }

    /** @return float|WP_Error */
    private static function change_balance( int $user_id, float $delta ) {
        $lock_key = self::lock_key( 'user', $user_id );
        if ( ! self::acquire_lock( $lock_key ) ) {
            return new WP_Error( 'phaseone_store_credit_busy', 'Store credit is already being updated. Please try again.', array( 'status' => 409 ) );
        }

        try {
            $raw_balance = get_user_meta( $user_id, self::BALANCE_META, true );
            $current     = self::money( $raw_balance );
            $raw_next = $current + $delta;
            if ( $raw_next < -0.001 ) {
                return new WP_Error( 'phaseone_store_credit_insufficient', 'The available store credit changed. Refresh checkout and try again.', array( 'status' => 409 ) );
            }
            $next = self::money( $raw_next );

            $next_value = self::money_string( $next );
            $updated = '' === $raw_balance
                ? add_user_meta( $user_id, self::BALANCE_META, $next_value, true )
                : update_user_meta( $user_id, self::BALANCE_META, $next_value, $raw_balance );

            if ( false === $updated ) {
                return new WP_Error( 'phaseone_store_credit_changed', 'The available store credit changed. Refresh checkout and try again.', array( 'status' => 409 ) );
            }

            return $next;
        } finally {
            self::release_lock( $lock_key );
        }
    }

    private static function lock_key( string $scope, int $id ): string {
        return '_p1_credit_lock_' . md5( $scope . ':' . $id );
    }

    private static function acquire_lock( string $key ): bool {
        if ( add_option( $key, time(), '', false ) ) {
            return true;
        }

        $created_at = (int) get_option( $key, 0 );
        if ( $created_at > 0 && time() - $created_at > self::LOCK_TTL ) {
            delete_option( $key );
            return add_option( $key, time(), '', false );
        }

        return false;
    }

    private static function release_lock( string $key ): void {
        delete_option( $key );
    }

    private static function unschedule_release( int $order_id ): void {
        $timestamp = wp_next_scheduled( self::RELEASE_HOOK, array( $order_id ) );
        if ( $timestamp ) {
            wp_unschedule_event( $timestamp, self::RELEASE_HOOK, array( $order_id ) );
        }
    }

    private static function money( $value ): float {
        return max( 0.0, round( (float) $value, 2 ) );
    }

    private static function money_string( float $value ): string {
        return function_exists( 'wc_format_decimal' )
            ? wc_format_decimal( $value, 2 )
            : number_format( $value, 2, '.', '' );
    }
}

PhaseOne_Checkout_Store_Credit::boot();
