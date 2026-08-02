<?php
/**
 * Plugin Name: Phase One PRISM Checkout Bridge
 * Description: Creates authoritative WooCommerce orders from the Phase One custom Astro checkout and starts the installed PRISM payment gateway.
 * Version: 1.4.0
 * Author: Phase One Labz
 * Requires PHP: 8.1
 */

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Prism_Checkout_Bridge {
    private const REST_NAMESPACE = 'phaseone/v1';
    private const REST_ROUTE     = '/prism-checkout';
    private const STATUS_ROUTE   = '/prism-order-status';
    private const GATEWAY_ID     = 'prism_simple_checkout';
    private const MAX_ITEMS      = 50;
    private const MAX_COUPONS    = 3;
    private const SECRET_HASH_OPTION = 'phaseone_prism_bridge_secret_hash';
    private const RECON_WATER_PROMO_THRESHOLD = 100.00;
    private const RECON_WATER_PROMO_PRICE     = 15.00;
    private const RECON_WATER_PURCHASE_LIMIT  = 2;
    private const BUNDLE_REQUIRED_QUANTITY     = 5;
    private const BUNDLE_DISCOUNT_RATE         = 0.10;
    private const FREE_SHIPPING_MINIMUM        = 150.00;
    private const SHIPPING_COST                 = 13.00;
    private const SHIPPING_PROTECTION_RATE_US   = 1.09;
    private const SHIPPING_PROTECTION_RATE_INTL = 1.39;

    public static function boot(): void {
        add_action( 'rest_api_init', array( __CLASS__, 'register_route' ) );
        add_action( 'woocommerce_admin_order_data_after_billing_address', array( __CLASS__, 'render_admin_fields' ) );
        add_action( 'woocommerce_email_order_meta', array( __CLASS__, 'render_email_fields' ), 20, 4 );
        add_action( 'admin_menu', array( __CLASS__, 'register_settings_page' ) );
        add_action( 'admin_post_phaseone_prism_bridge_save_secret', array( __CLASS__, 'save_secret' ) );
    }

    public static function register_route(): void {
        register_rest_route(
            self::REST_NAMESPACE,
            self::REST_ROUTE,
            array(
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => array( __CLASS__, 'create_checkout' ),
                'permission_callback' => array( __CLASS__, 'authorize_request' ),
            )
        );

        register_rest_route(
            self::REST_NAMESPACE,
            self::STATUS_ROUTE,
            array(
                'methods'             => WP_REST_Server::CREATABLE,
                'callback'            => array( __CLASS__, 'get_order_status' ),
                'permission_callback' => array( __CLASS__, 'authorize_request' ),
            )
        );
    }

    public static function authorize_request( WP_REST_Request $request ) {
        $provided = trim( (string) $request->get_header( 'x-phaseone-checkout-secret' ) );

        if ( '' === $provided || ! self::secret_matches( $provided ) ) {
            return new WP_Error(
                'phaseone_prism_unauthorized',
                'Unauthorized checkout request.',
                array( 'status' => 403 )
            );
        }

        return true;
    }

    private static function secret_matches( string $provided ): bool {
        $configured = self::get_runtime_secret();

        if ( '' !== $configured ) {
            return hash_equals( $configured, $provided );
        }

        $stored_hash = trim( (string) get_option( self::SECRET_HASH_OPTION, '' ) );
        if ( '' === $stored_hash ) {
            return false;
        }

        return hash_equals( $stored_hash, hash( 'sha256', $provided ) );
    }

    private static function get_runtime_secret(): string {
        if ( defined( 'PHASEONE_PRISM_BRIDGE_SECRET' ) ) {
            return trim( (string) PHASEONE_PRISM_BRIDGE_SECRET );
        }

        $env_value = getenv( 'PHASEONE_PRISM_BRIDGE_SECRET' );
        if ( false !== $env_value && '' !== trim( (string) $env_value ) ) {
            return trim( (string) $env_value );
        }

        foreach ( array( $_ENV, $_SERVER ) as $source ) {
            if ( isset( $source['PHASEONE_PRISM_BRIDGE_SECRET'] ) ) {
                $value = trim( (string) $source['PHASEONE_PRISM_BRIDGE_SECRET'] );
                if ( '' !== $value ) {
                    return $value;
                }
            }
        }

        return '';
    }

    public static function register_settings_page(): void {
        add_submenu_page(
            'woocommerce',
            'PRISM Bridge',
            'PRISM Bridge',
            'manage_woocommerce',
            'phaseone-prism-bridge',
            array( __CLASS__, 'render_settings_page' )
        );
    }

    public static function render_settings_page(): void {
        if ( ! current_user_can( 'manage_woocommerce' ) ) {
            return;
        }

        $runtime_secret_active = '' !== self::get_runtime_secret();
        $saved_secret_active   = '' !== trim( (string) get_option( self::SECRET_HASH_OPTION, '' ) );
        $status                = sanitize_key( wp_unslash( $_GET['phaseone_status'] ?? '' ) );
        ?>
        <div class="wrap">
            <h1>Phase One PRISM Checkout Bridge</h1>

            <?php if ( 'saved' === $status ) : ?>
                <div class="notice notice-success is-dismissible"><p>The private bridge secret was saved.</p></div>
            <?php elseif ( 'mismatch' === $status ) : ?>
                <div class="notice notice-error"><p>The two secret values did not match.</p></div>
            <?php elseif ( 'short' === $status ) : ?>
                <div class="notice notice-error"><p>Use a secret containing at least 32 characters.</p></div>
            <?php endif; ?>

            <p>
                Use the same private value here and in the Astro/Coolify variable
                <code>PRISM_CHECKOUT_SHARED_SECRET</code>. The value entered here is stored only as a SHA-256 hash.
            </p>

            <table class="widefat striped" style="max-width:760px;margin:20px 0;">
                <tbody>
                    <tr>
                        <td><strong>WordPress admin secret</strong></td>
                        <td><?php echo $saved_secret_active ? 'Configured' : 'Not configured'; ?></td>
                    </tr>
                    <tr>
                        <td><strong>Server environment/wp-config secret</strong></td>
                        <td><?php echo $runtime_secret_active ? 'Configured and takes priority' : 'Not configured'; ?></td>
                    </tr>
                    <tr>
                        <td><strong>REST endpoint</strong></td>
                        <td><code><?php echo esc_html( rest_url( self::REST_NAMESPACE . self::REST_ROUTE ) ); ?></code></td>
                    </tr>
                    <tr>
                        <td><strong>Order status endpoint</strong></td>
                        <td><code><?php echo esc_html( rest_url( self::REST_NAMESPACE . self::STATUS_ROUTE ) ); ?></code></td>
                    </tr>
                </tbody>
            </table>

            <form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" style="max-width:760px;">
                <input type="hidden" name="action" value="phaseone_prism_bridge_save_secret">
                <?php wp_nonce_field( 'phaseone_prism_bridge_save_secret' ); ?>

                <table class="form-table" role="presentation">
                    <tr>
                        <th scope="row"><label for="phaseone_bridge_secret">New private secret</label></th>
                        <td>
                            <input
                                id="phaseone_bridge_secret"
                                name="phaseone_bridge_secret"
                                type="password"
                                class="regular-text"
                                minlength="32"
                                autocomplete="new-password"
                                required
                            >
                            <p class="description">Use a randomly generated value of at least 32 characters.</p>
                        </td>
                    </tr>
                    <tr>
                        <th scope="row"><label for="phaseone_bridge_secret_confirm">Confirm secret</label></th>
                        <td>
                            <input
                                id="phaseone_bridge_secret_confirm"
                                name="phaseone_bridge_secret_confirm"
                                type="password"
                                class="regular-text"
                                minlength="32"
                                autocomplete="new-password"
                                required
                            >
                        </td>
                    </tr>
                </table>

                <?php submit_button( 'Save private secret' ); ?>
            </form>
        </div>
        <?php
    }

    public static function save_secret(): void {
        if ( ! current_user_can( 'manage_woocommerce' ) ) {
            wp_die( 'You are not allowed to manage this setting.' );
        }

        check_admin_referer( 'phaseone_prism_bridge_save_secret' );

        $secret  = trim( (string) wp_unslash( $_POST['phaseone_bridge_secret'] ?? '' ) );
        $confirm = trim( (string) wp_unslash( $_POST['phaseone_bridge_secret_confirm'] ?? '' ) );
        $status  = 'saved';

        if ( $secret !== $confirm ) {
            $status = 'mismatch';
        } elseif ( strlen( $secret ) < 32 ) {
            $status = 'short';
        } else {
            update_option( self::SECRET_HASH_OPTION, hash( 'sha256', $secret ), false );
        }

        wp_safe_redirect(
            add_query_arg(
                array(
                    'page'            => 'phaseone-prism-bridge',
                    'phaseone_status' => $status,
                ),
                admin_url( 'admin.php' )
            )
        );
        exit;
    }

    public static function create_checkout( WP_REST_Request $request ) {
        if ( ! class_exists( 'WooCommerce' ) || ! function_exists( 'wc_create_order' ) ) {
            return new WP_Error(
                'phaseone_prism_woocommerce_missing',
                'WooCommerce is unavailable.',
                array( 'status' => 503 )
            );
        }

        $payload = $request->get_json_params();
        if ( ! is_array( $payload ) ) {
            return new WP_Error(
                'phaseone_prism_invalid_json',
                'Invalid checkout payload.',
                array( 'status' => 400 )
            );
        }

        $items = isset( $payload['items'] ) && is_array( $payload['items'] )
            ? array_values( $payload['items'] )
            : array();

        if ( empty( $items ) || count( $items ) > self::MAX_ITEMS ) {
            return new WP_Error(
                'phaseone_prism_invalid_items',
                'The cart is empty or contains too many items.',
                array( 'status' => 400 )
            );
        }

        $billing  = self::sanitize_address( $payload['billing'] ?? array(), true );
        $shipping = self::sanitize_address( $payload['shipping'] ?? array(), false, $billing );

        $required = array( 'first_name', 'last_name', 'email', 'phone', 'address_1', 'city', 'state', 'postcode', 'country' );
        foreach ( $required as $field ) {
            if ( empty( $billing[ $field ] ) ) {
                return new WP_Error(
                    'phaseone_prism_missing_field',
                    sprintf( 'Missing required checkout field: %s.', $field ),
                    array( 'status' => 400 )
                );
            }
        }

        if ( ! is_email( $billing['email'] ) ) {
            return new WP_Error(
                'phaseone_prism_invalid_email',
                'A valid email address is required.',
                array( 'status' => 400 )
            );
        }

        if ( empty( $payload['acknowledgements']['age21OrOlder'] )
            || empty( $payload['acknowledgements']['inVitroResearchUseOnly'] )
            || empty( $payload['acknowledgements']['termsAndConditionsAccepted'] ) ) {
            return new WP_Error(
                'phaseone_prism_acknowledgement_required',
                'The required checkout acknowledgement was not accepted.',
                array( 'status' => 400 )
            );
        }

        $order = null;

        try {
            $order = wc_create_order(
                array(
                    'status'      => 'pending',
                    'customer_id' => self::customer_id_from_email( $billing['email'] ),
                )
            );

            if ( is_wp_error( $order ) || ! $order instanceof WC_Order ) {
                throw new RuntimeException( 'WooCommerce could not create the order.' );
            }

            if ( method_exists( $order, 'set_created_via' ) ) {
                $order->set_created_via( 'phaseone_prism_bridge' );
            }

            $order->set_address( $billing, 'billing' );
            $order->set_address( $shipping, 'shipping' );
            $order->set_currency( get_woocommerce_currency() );

            $items = self::normalize_authoritative_cart_items( $items );

            foreach ( $items as $item ) {
                self::add_authoritative_product( $order, $item );
            }

            // Calculate from WooCommerce product prices. Browser-submitted prices are ignored.
            $order->calculate_totals( false );

            $pricing = self::apply_phaseone_pricing_rules( $order );

            $coupon_codes = self::sanitize_coupon_codes( $payload );
            foreach ( $coupon_codes as $coupon_code ) {
                $applied = $order->apply_coupon( $coupon_code );
                if ( is_wp_error( $applied ) ) {
                    throw new RuntimeException( 'A supplied coupon is invalid.' );
                }
            }

            // Match the frontend: FedEx is free from $150 merchandise total
            // after product/bundle pricing, before coupons.
            $free_shipping_minimum = (float) apply_filters( 'phaseone_prism_free_shipping_minimum', self::FREE_SHIPPING_MINIMUM, $order );
            $shipping_cost         = (float) apply_filters( 'phaseone_prism_shipping_cost', self::SHIPPING_COST, $order );
            $is_free_shipping      = (float) $pricing['merchandise_total'] >= $free_shipping_minimum;

            $shipping_item = new WC_Order_Item_Shipping();
            $shipping_item->set_method_title( 'FedEx Shipping' );
            $shipping_item->set_method_id( $is_free_shipping ? 'free_shipping' : 'flat_rate' );
            $shipping_item->set_total( $is_free_shipping ? 0 : $shipping_cost );
            $order->add_item( $shipping_item );

            $order->calculate_totals( false );
            self::apply_shipping_protection( $order, $payload, $billing );

            self::store_custom_fields( $order, $payload );
            self::store_acknowledgements( $order, $payload );
            $order->update_meta_data( '_phaseone_recon_water_promo', $pricing['recon_water_promo_active'] ? 'yes' : 'no' );
            $order->update_meta_data( '_phaseone_recon_water_discount', wc_format_decimal( $pricing['recon_water_discount'], 2 ) );
            $order->update_meta_data( '_phaseone_bundle_promo', $pricing['bundle_active'] ? 'yes' : 'no' );
            $order->update_meta_data( '_phaseone_bundle_discount', wc_format_decimal( $pricing['bundle_discount'], 2 ) );

            $gateways = WC()->payment_gateways()->payment_gateways();
            $gateway  = $gateways[ self::GATEWAY_ID ] ?? null;

            if ( ! $gateway instanceof WC_Payment_Gateway || ! $gateway->is_available() ) {
                throw new RuntimeException( 'The PRISM gateway is not enabled or activated.' );
            }

            $order->set_payment_method( $gateway );
            $order->set_payment_method_title( $gateway->get_title() );
            $order->calculate_totals( true );
            $order->add_order_note( 'Created securely from the Phase One custom checkout.' );
            $order->save();
            self::reserve_order_stock( $order );

            // The vendor plugin signs the PRISM request using its server-side stored credential.
            $payment = $gateway->process_payment( $order->get_id() );

            if ( ! is_array( $payment )
                || 'success' !== ( $payment['result'] ?? '' )
                || empty( $payment['redirect'] )
                || 0 !== strpos( (string) $payment['redirect'], 'https://' ) ) {
                throw new RuntimeException( 'PRISM did not return a valid checkout URL.' );
            }

            return new WP_REST_Response(
                array(
                    'success'     => true,
                    'orderId'     => $order->get_id(),
                    'orderNumber' => $order->get_order_number(),
                    'orderKey'    => $order->get_order_key(),
                    'total'       => (float) $order->get_total(),
                    'currency'    => $order->get_currency(),
                    'redirectUrl' => esc_url_raw( $payment['redirect'] ),
                ),
                200
            );
        } catch ( Throwable $exception ) {
            if ( $order instanceof WC_Order ) {
                self::release_order_stock( $order );
                $order->update_status( 'failed', 'Custom checkout failed before PRISM redirect.' );
            }

            error_log( 'Phase One PRISM bridge error: ' . $exception->getMessage() );

            return new WP_Error(
                'phaseone_prism_checkout_failed',
                self::customer_safe_error_message( $exception ),
                array( 'status' => 400 )
            );
        }
    }

    public static function get_order_status( WP_REST_Request $request ) {
        if ( ! function_exists( 'wc_get_order' ) ) {
            return new WP_Error(
                'phaseone_prism_woocommerce_missing',
                'WooCommerce is unavailable.',
                array( 'status' => 503 )
            );
        }

        $order_id  = absint( $request->get_param( 'order_id' ) ?: $request->get_param( 'orderId' ) );
        $order_key = wc_clean( (string) ( $request->get_param( 'order_key' ) ?: $request->get_param( 'orderKey' ) ) );

        if ( ! $order_id || '' === $order_key ) {
            return new WP_Error(
                'phaseone_prism_status_invalid_request',
                'Order ID and order key are required.',
                array( 'status' => 400 )
            );
        }

        $order = wc_get_order( $order_id );

        if ( ! $order instanceof WC_Order
            || ! hash_equals( (string) $order->get_order_key(), $order_key ) ) {
            return new WP_Error(
                'phaseone_prism_order_not_found',
                'The order could not be verified.',
                array( 'status' => 404 )
            );
        }

        if ( self::GATEWAY_ID !== (string) $order->get_payment_method() ) {
            return new WP_Error(
                'phaseone_prism_wrong_gateway',
                'This order does not use the PRISM gateway.',
                array( 'status' => 400 )
            );
        }

        $items = array();

        foreach ( $order->get_items( 'line_item' ) as $item_id => $item ) {
            if ( ! $item instanceof WC_Order_Item_Product ) {
                continue;
            }

            $product = $item->get_product();
            $image   = '';

            if ( $product instanceof WC_Product ) {
                $image_id = $product->get_image_id();
                if ( $image_id ) {
                    $image = (string) wp_get_attachment_image_url( $image_id, 'woocommerce_thumbnail' );
                }
            }

            $items[] = array(
                'id'           => (int) $item_id,
                'product_id'   => (int) $item->get_product_id(),
                'variation_id' => (int) $item->get_variation_id(),
                'name'         => $item->get_name(),
                'quantity'     => (int) $item->get_quantity(),
                'subtotal'     => (float) $item->get_subtotal(),
                'total'        => (float) $item->get_total(),
                'sku'          => $product instanceof WC_Product ? $product->get_sku() : '',
                'image'        => $image,
            );
        }

        $shipping = array(
            'first_name' => $order->get_shipping_first_name(),
            'last_name'  => $order->get_shipping_last_name(),
            'company'    => $order->get_shipping_company(),
            'address_1'  => $order->get_shipping_address_1(),
            'address_2'  => $order->get_shipping_address_2(),
            'city'       => $order->get_shipping_city(),
            'state'      => $order->get_shipping_state(),
            'postcode'   => $order->get_shipping_postcode(),
            'country'    => $order->get_shipping_country(),
            'phone'      => method_exists( $order, 'get_shipping_phone' ) ? $order->get_shipping_phone() : '',
            'email'      => $order->get_billing_email(),
        );

        $has_shipping_address = '' !== trim(
            (string) $shipping['first_name']
            . (string) $shipping['last_name']
            . (string) $shipping['address_1']
            . (string) $shipping['city']
            . (string) $shipping['postcode']
        );

        if ( ! $has_shipping_address ) {
            $shipping = array(
                'first_name' => $order->get_billing_first_name(),
                'last_name'  => $order->get_billing_last_name(),
                'company'    => $order->get_billing_company(),
                'address_1'  => $order->get_billing_address_1(),
                'address_2'  => $order->get_billing_address_2(),
                'city'       => $order->get_billing_city(),
                'state'      => $order->get_billing_state(),
                'postcode'   => $order->get_billing_postcode(),
                'country'    => $order->get_billing_country(),
                'phone'      => $order->get_billing_phone(),
                'email'      => $order->get_billing_email(),
            );
        }

        return new WP_REST_Response(
            array(
                'success' => true,
                'order'   => array(
                    'id'                 => $order->get_id(),
                    'number'             => $order->get_order_number(),
                    'status'             => $order->get_status(),
                    'statusLabel'        => wc_get_order_status_name( $order->get_status() ),
                    'isPaid'             => $order->is_paid(),
                    'total'              => (float) $order->get_total(),
                    'currency'           => $order->get_currency(),
                    'email'              => $order->get_billing_email(),
                    'paymentMethod'      => $order->get_payment_method(),
                    'paymentMethodTitle' => $order->get_payment_method_title(),
                    'createdAt'          => $order->get_date_created()
                        ? $order->get_date_created()->date( DATE_ATOM )
                        : '',
                    'shipping'           => $shipping,
                    'items'              => $items,
                ),
            ),
            200
        );
    }

    private static function sanitize_address( $source, bool $require_email, array $fallback = array() ): array {
        $source = is_array( $source ) ? $source : array();
        $value  = static function ( string $key ) use ( $source, $fallback ): string {
            $raw = $source[ $key ] ?? $fallback[ $key ] ?? '';
            return is_scalar( $raw ) ? trim( (string) $raw ) : '';
        };

        $address = array(
            'first_name' => sanitize_text_field( $value( 'first_name' ) ),
            'last_name'  => sanitize_text_field( $value( 'last_name' ) ),
            'company'    => sanitize_text_field( $value( 'company' ) ),
            'email'      => sanitize_email( $value( 'email' ) ),
            'phone'      => sanitize_text_field( $value( 'phone' ) ),
            'address_1'  => sanitize_text_field( $value( 'address_1' ) ),
            'address_2'  => sanitize_text_field( $value( 'address_2' ) ),
            'city'       => sanitize_text_field( $value( 'city' ) ),
            'state'      => strtoupper( sanitize_text_field( $value( 'state' ) ) ),
            'postcode'   => sanitize_text_field( $value( 'postcode' ) ),
            'country'    => strtoupper( sanitize_text_field( $value( 'country' ) ?: 'US' ) ),
        );

        if ( ! $require_email && empty( $address['email'] ) ) {
            $address['email'] = $fallback['email'] ?? '';
        }

        return $address;
    }

    private static function customer_id_from_email( string $email ): int {
        $user = get_user_by( 'email', $email );
        return $user instanceof WP_User ? (int) $user->ID : 0;
    }

    private static function normalize_authoritative_cart_items( array $items ): array {
        $normalized = array();

        foreach ( $items as $raw_item ) {
            if ( ! is_array( $raw_item ) ) {
                throw new RuntimeException( 'Invalid cart item.' );
            }

            $product_id   = absint( $raw_item['product_id'] ?? $raw_item['productId'] ?? 0 );
            $variation_id = absint( $raw_item['variation_id'] ?? $raw_item['variationId'] ?? 0 );
            $quantity     = absint( $raw_item['quantity'] ?? 1 );
            $quantity     = max( 1, $quantity );
            $lookup_id    = $variation_id ?: $product_id;

            if ( $lookup_id <= 0 ) {
                throw new RuntimeException( 'Invalid cart item.' );
            }

            $key = (string) $lookup_id;

            if ( isset( $normalized[ $key ] ) ) {
                $normalized[ $key ]['quantity'] += $quantity;
                continue;
            }

            $normalized[ $key ] = array(
                'product_id'   => $product_id,
                'variation_id' => $variation_id,
                'quantity'     => $quantity,
            );
        }

        $validated = array_values( $normalized );

        foreach ( $validated as $item ) {
            self::validate_authoritative_product( $item );
        }

        self::validate_aggregate_purchase_limits( $validated );

        return $validated;
    }

    private static function add_authoritative_product( WC_Order $order, $raw_item ): void {
        if ( ! is_array( $raw_item ) ) {
            throw new RuntimeException( 'Invalid cart item.' );
        }

        $product_id   = absint( $raw_item['product_id'] ?? $raw_item['productId'] ?? 0 );
        $variation_id = absint( $raw_item['variation_id'] ?? $raw_item['variationId'] ?? 0 );
        $quantity     = max( 1, absint( $raw_item['quantity'] ?? 1 ) );
        $lookup_id    = $variation_id ?: $product_id;
        $product      = wc_get_product( $lookup_id );

        if ( ! $product instanceof WC_Product || ! $product->exists() || ! $product->is_purchasable() ) {
            throw new RuntimeException( 'A product is unavailable.' );
        }

        if ( $variation_id > 0 ) {
            if ( ! $product instanceof WC_Product_Variation ) {
                throw new RuntimeException( 'Invalid product variation.' );
            }
            if ( $product_id > 0 && (int) $product->get_parent_id() !== $product_id ) {
                throw new RuntimeException( 'Variation does not belong to the supplied product.' );
            }
        }

        $args = array();
        if ( $product instanceof WC_Product_Variation ) {
            $args['variation'] = $product->get_variation_attributes();
        }

        $item_id = $order->add_product( $product, $quantity, $args );
        if ( ! $item_id ) {
            throw new RuntimeException( 'WooCommerce could not add a product to the order.' );
        }
    }

    private static function validate_authoritative_product( array $raw_item ): void {
        $product_id   = absint( $raw_item['product_id'] ?? 0 );
        $variation_id = absint( $raw_item['variation_id'] ?? 0 );
        $quantity     = max( 1, absint( $raw_item['quantity'] ?? 1 ) );
        $lookup_id    = $variation_id ?: $product_id;
        $product      = wc_get_product( $lookup_id );

        if ( ! $product instanceof WC_Product || ! $product->exists() || ! $product->is_purchasable() ) {
            throw new RuntimeException( 'A product in your cart is no longer available.' );
        }

        if ( $variation_id > 0 ) {
            if ( ! $product instanceof WC_Product_Variation ) {
                throw new RuntimeException( 'Invalid product variation.' );
            }
            if ( $product_id > 0 && (int) $product->get_parent_id() !== $product_id ) {
                throw new RuntimeException( 'A selected product option is no longer available.' );
            }
        }

        if ( ! $product->is_in_stock() ) {
            throw new RuntimeException( sprintf( '%s is sold out. Please remove it from your cart.', $product->get_name() ) );
        }

        $purchase_limit = self::get_product_purchase_limit( $product );
        if ( null !== $purchase_limit && $quantity > $purchase_limit ) {
            throw new RuntimeException(
                sprintf(
                    '%s is limited to %d per order. Please update your cart.',
                    $product->get_name(),
                    $purchase_limit
                )
            );
        }

        if ( method_exists( $product, 'backorders_allowed' ) && ! $product->backorders_allowed() && method_exists( $product, 'is_on_backorder' ) && $product->is_on_backorder( $quantity ) ) {
            throw new RuntimeException( sprintf( '%s does not have enough stock for that quantity.', $product->get_name() ) );
        }

        if ( method_exists( $product, 'has_enough_stock' ) && ! $product->has_enough_stock( $quantity ) ) {
            throw new RuntimeException( sprintf( '%s does not have enough stock for that quantity.', $product->get_name() ) );
        }
    }

    private static function get_product_purchase_limit( WC_Product $product ): ?int {
        $limits = array();

        if ( method_exists( $product, 'is_sold_individually' ) && $product->is_sold_individually() ) {
            $limits[] = 1;
        }

        if ( method_exists( $product, 'get_max_purchase_quantity' ) ) {
            $max = (int) $product->get_max_purchase_quantity();
            if ( $max > 0 ) {
                $limits[] = $max;
            }
        }

        if ( self::is_recon_water_product( $product ) ) {
            $limits[] = self::RECON_WATER_PURCHASE_LIMIT;
        }

        if ( empty( $limits ) ) {
            return null;
        }

        return max( 1, min( $limits ) );
    }

    private static function validate_aggregate_purchase_limits( array $items ): void {
        $totals = array();

        foreach ( $items as $item ) {
            $product_id   = absint( $item['product_id'] ?? 0 );
            $variation_id = absint( $item['variation_id'] ?? 0 );
            $quantity     = max( 1, absint( $item['quantity'] ?? 1 ) );
            $product      = wc_get_product( $variation_id ?: $product_id );

            if ( ! $product instanceof WC_Product ) {
                continue;
            }

            $limit = self::get_product_purchase_limit( $product );
            if ( null === $limit ) {
                continue;
            }

            $parent_id = $product instanceof WC_Product_Variation
                ? (int) $product->get_parent_id()
                : (int) $product->get_id();
            $key       = (string) ( $parent_id ?: $product->get_id() );

            if ( ! isset( $totals[ $key ] ) ) {
                $totals[ $key ] = array(
                    'quantity' => 0,
                    'limit'    => $limit,
                    'name'     => $product->get_name(),
                );
            }

            $totals[ $key ]['quantity'] += $quantity;
            $totals[ $key ]['limit']     = min( $totals[ $key ]['limit'], $limit );
        }

        foreach ( $totals as $total ) {
            if ( $total['quantity'] > $total['limit'] ) {
                throw new RuntimeException(
                    sprintf(
                        '%s is limited to %d per order. Please update your cart.',
                        $total['name'],
                        $total['limit']
                    )
                );
            }
        }
    }

    private static function reserve_order_stock( WC_Order $order ): void {
        if ( ! function_exists( 'wc_reserve_stock_for_order' ) ) {
            return;
        }

        $minutes = (int) get_option( 'woocommerce_hold_stock_minutes', 0 );
        if ( $minutes <= 0 ) {
            return;
        }

        $result = wc_reserve_stock_for_order( $order, $minutes );
        if ( is_wp_error( $result ) ) {
            throw new RuntimeException( $result->get_error_message() );
        }
    }

    private static function release_order_stock( WC_Order $order ): void {
        if ( function_exists( 'wc_release_stock_for_order' ) ) {
            wc_release_stock_for_order( $order );
        }
    }

    private static function customer_safe_error_message( Throwable $exception ): string {
        $message = trim( $exception->getMessage() );

        if ( preg_match( '/sold out|stock|limited|available|variation|cart item/i', $message ) ) {
            return $message;
        }

        return 'Unable to start secure card checkout. Please try again.';
    }

    private static function normalize_product_identifier( $value ): string {
        $value = strtolower( trim( (string) $value ) );
        $value = preg_replace( '/[^a-z0-9]+/', '-', $value );
        return trim( (string) $value, '-' );
    }

    private static function shipping_protection_requested( array $payload ): bool {
        $shipping_protection = isset( $payload['shippingProtection'] ) && is_array( $payload['shippingProtection'] )
            ? $payload['shippingProtection']
            : ( isset( $payload['shipping_protection'] ) && is_array( $payload['shipping_protection'] ) ? $payload['shipping_protection'] : array() );

        return ! empty( $payload['shippingProtectionSelected'] )
            || ! empty( $payload['shipping_protection_selected'] )
            || ! empty( $shipping_protection['selected'] );
    }

    private static function calculate_shipping_protection_amount( float $base_total, string $country ): float {
        $base_total = max( 0, $base_total );
        if ( $base_total <= 0 ) {
            return 0.0;
        }

        $rate = 'US' === strtoupper( trim( $country ?: 'US' ) )
            ? self::SHIPPING_PROTECTION_RATE_US
            : self::SHIPPING_PROTECTION_RATE_INTL;
        $fee = 0.0;

        for ( $attempt = 0; $attempt < 8; $attempt++ ) {
            $units    = max( 1, (int) ceil( ( $base_total + $fee ) / 100 ) );
            $next_fee = round( $units * $rate, 2 );

            if ( abs( $next_fee - $fee ) < 0.001 ) {
                $fee = $next_fee;
                break;
            }

            $fee = $next_fee;
        }

        return round( $fee, 2 );
    }

    private static function apply_shipping_protection( WC_Order $order, array $payload, array $billing ): void {
        if ( ! self::shipping_protection_requested( $payload ) ) {
            $order->update_meta_data( '_phaseone_shipping_protection_selected', 'no' );
            return;
        }

        $base_total = round( (float) $order->get_total(), 2 );
        $amount     = self::calculate_shipping_protection_amount( $base_total, $billing['country'] ?? 'US' );

        if ( $amount <= 0 ) {
            $order->update_meta_data( '_phaseone_shipping_protection_selected', 'no' );
            return;
        }

        $fee = new WC_Order_Item_Fee();
        $fee->set_name( 'Shipping Protection' );
        $fee->set_tax_status( 'none' );
        $fee->set_total( $amount );
        $order->add_item( $fee );
        $order->update_meta_data( '_phaseone_shipping_protection_selected', 'yes' );
        $order->update_meta_data( '_phaseone_shipping_protection_provider', 'parcelguard' );
        $order->update_meta_data( '_phaseone_shipping_protection_amount', wc_format_decimal( $amount, 2 ) );
        $order->update_meta_data( '_phaseone_shipping_protection_insured_value', wc_format_decimal( $base_total + $amount, 2 ) );
        $order->calculate_totals( false );
    }

    private static function is_recon_water_product( $product ): bool {
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
            $identifiers = array(
                $candidate->get_slug(),
                $candidate->get_sku(),
                $candidate->get_name(),
            );

            foreach ( $identifiers as $identifier ) {
                if ( in_array(
                    self::normalize_product_identifier( $identifier ),
                    array( 'h-recon-water', 'recon-water-30ml' ),
                    true
                ) ) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Apply the same authoritative product pricing used by the frontend.
     * The browser only submits product IDs and quantities; all discounts are
     * derived again from WooCommerce data before the PRISM request is signed.
     */
    private static function apply_phaseone_pricing_rules( WC_Order $order ): array {
        $qualifying_subtotal = 0.0;
        $recon_items         = array();
        $quantity             = 0;

        foreach ( $order->get_items( 'line_item' ) as $item ) {
            if ( ! $item instanceof WC_Order_Item_Product ) {
                continue;
            }

            $product = $item->get_product();
            $item_qty = max( 1, (int) $item->get_quantity() );
            $quantity += $item_qty;

            if ( self::is_recon_water_product( $product ) ) {
                $recon_items[] = $item;
            } else {
                $qualifying_subtotal += (float) $item->get_subtotal();
            }
        }

        $recon_promo_active = $qualifying_subtotal >= self::RECON_WATER_PROMO_THRESHOLD;
        $recon_water_discount = 0.0;

        if ( $recon_promo_active ) {
            foreach ( $recon_items as $item ) {
                $item_qty = max( 1, (int) $item->get_quantity() );
                $current_total = (float) $item->get_total();
                $current_unit = $current_total / $item_qty;
                $discounted_unit = min( $current_unit, self::RECON_WATER_PROMO_PRICE );
                $discounted_total = round( $discounted_unit * $item_qty, wc_get_price_decimals() );

                $recon_water_discount += max( 0, $current_total - $discounted_total );
                $item->set_subtotal( $discounted_total );
                $item->set_total( $discounted_total );
                $item->save();
            }
        }

        $bundle_active = $quantity >= self::BUNDLE_REQUIRED_QUANTITY;
        $bundle_discount = 0.0;

        if ( $bundle_active ) {
            foreach ( $order->get_items( 'line_item' ) as $item ) {
                if ( ! $item instanceof WC_Order_Item_Product ) {
                    continue;
                }

                // Recon Water remains exactly $15; the bundle applies to the
                // other products only, matching CartContext.jsx.
                if ( self::is_recon_water_product( $item->get_product() ) ) {
                    continue;
                }

                $current_total = (float) $item->get_total();
                $discounted_total = round(
                    $current_total * ( 1 - self::BUNDLE_DISCOUNT_RATE ),
                    wc_get_price_decimals()
                );
                $bundle_discount += max( 0, $current_total - $discounted_total );
                $item->set_total( $discounted_total );
                $item->save();
            }
        }

        $order->calculate_totals( false );
        $merchandise_total = 0.0;
        foreach ( $order->get_items( 'line_item' ) as $item ) {
            if ( $item instanceof WC_Order_Item_Product ) {
                $merchandise_total += (float) $item->get_total();
            }
        }

        return array(
            'recon_water_promo_active' => $recon_promo_active,
            'recon_water_discount'     => round( $recon_water_discount, 2 ),
            'bundle_active'            => $bundle_active,
            'bundle_discount'          => round( $bundle_discount, 2 ),
            'merchandise_total'        => round( $merchandise_total, 2 ),
        );
    }

    private static function sanitize_coupon_codes( array $payload ): array {
        $codes = $payload['couponCodes'] ?? $payload['coupon_codes'] ?? array();
        if ( is_string( $codes ) ) {
            $codes = preg_split( '/[\s,;]+/', $codes );
        }
        if ( ! is_array( $codes ) ) {
            return array();
        }

        $clean = array();
        foreach ( array_slice( $codes, 0, self::MAX_COUPONS ) as $code ) {
            if ( ! is_scalar( $code ) ) {
                continue;
            }
            $formatted = wc_format_coupon_code( sanitize_text_field( (string) $code ) );
            if ( '' !== $formatted && ! in_array( $formatted, $clean, true ) ) {
                $clean[] = $formatted;
            }
        }
        return $clean;
    }

    private static function store_custom_fields( WC_Order $order, array $payload ): void {
        $custom = isset( $payload['customFields'] ) && is_array( $payload['customFields'] )
            ? $payload['customFields']
            : ( isset( $payload['custom_fields'] ) && is_array( $payload['custom_fields'] ) ? $payload['custom_fields'] : array() );

        $research_organization = sanitize_text_field(
            (string) ( $custom['researchOrganization'] ?? $custom['research_organization'] ?? '' )
        );
        $delivery_instructions = sanitize_textarea_field(
            (string) ( $custom['deliveryInstructions'] ?? $custom['delivery_instructions'] ?? '' )
        );
        $order_notes = sanitize_textarea_field(
            (string) ( $custom['orderNotes'] ?? $custom['order_notes'] ?? '' )
        );

        if ( '' !== $research_organization ) {
            $order->update_meta_data( '_phaseone_research_organization', $research_organization );
        }
        if ( '' !== $delivery_instructions ) {
            $order->update_meta_data( '_phaseone_delivery_instructions', $delivery_instructions );
        }
        if ( '' !== $order_notes ) {
            $order->set_customer_note( $order_notes );
        }

        $accepts_marketing = ! empty( $payload['acceptsMarketing'] ) || ! empty( $payload['accepts_marketing'] );
        $order->update_meta_data( '_phaseone_accepts_marketing', $accepts_marketing ? 'yes' : 'no' );
    }

    private static function store_acknowledgements( WC_Order $order, array $payload ): void {
        $ack = isset( $payload['acknowledgements'] ) && is_array( $payload['acknowledgements'] )
            ? $payload['acknowledgements']
            : array();

        $order->update_meta_data( '_phaseone_age_confirmed', ! empty( $ack['age21OrOlder'] ) ? 'yes' : 'no' );
        $order->update_meta_data( '_phaseone_research_use_acknowledged', ! empty( $ack['inVitroResearchUseOnly'] ) ? 'yes' : 'no' );
        $order->update_meta_data( '_phaseone_terms_accepted', ! empty( $ack['termsAndConditionsAccepted'] ) ? 'yes' : 'no' );
        $order->update_meta_data( '_phaseone_refund_policy_accepted', ! empty( $ack['refundPolicyAccepted'] ) ? 'yes' : 'no' );
        $order->update_meta_data( '_phaseone_research_use_policy_accepted', ! empty( $ack['researchUseOnlyPolicyAccepted'] ) ? 'yes' : 'no' );
        $order->update_meta_data( '_phaseone_policy_acknowledged_at', sanitize_text_field( (string) ( $ack['acceptedAt'] ?? gmdate( 'c' ) ) ) );
    }

    public static function render_admin_fields( WC_Order $order ): void {
        $organization = (string) $order->get_meta( '_phaseone_research_organization' );
        $instructions = (string) $order->get_meta( '_phaseone_delivery_instructions' );

        if ( '' === $organization && '' === $instructions ) {
            return;
        }

        echo '<div class="phaseone-custom-order-fields">';
        echo '<h3>' . esc_html__( 'Phase One checkout details', 'phaseone-prism-bridge' ) . '</h3>';
        if ( '' !== $organization ) {
            echo '<p><strong>' . esc_html__( 'Research organization:', 'phaseone-prism-bridge' ) . '</strong> ' . esc_html( $organization ) . '</p>';
        }
        if ( '' !== $instructions ) {
            echo '<p><strong>' . esc_html__( 'Delivery instructions:', 'phaseone-prism-bridge' ) . '</strong><br>' . nl2br( esc_html( $instructions ) ) . '</p>';
        }
        echo '</div>';
    }

    public static function render_email_fields( WC_Order $order, bool $sent_to_admin, bool $plain_text, WC_Email $email ): void {
        $organization = (string) $order->get_meta( '_phaseone_research_organization' );
        $instructions = (string) $order->get_meta( '_phaseone_delivery_instructions' );

        if ( '' === $organization && '' === $instructions ) {
            return;
        }

        if ( $plain_text ) {
            echo "\nPHASE ONE CHECKOUT DETAILS\n";
            if ( '' !== $organization ) {
                echo 'Research organization: ' . $organization . "\n";
            }
            if ( '' !== $instructions ) {
                echo 'Delivery instructions: ' . $instructions . "\n";
            }
            return;
        }

        echo '<h2>' . esc_html__( 'Checkout details', 'phaseone-prism-bridge' ) . '</h2>';
        if ( '' !== $organization ) {
            echo '<p><strong>' . esc_html__( 'Research organization:', 'phaseone-prism-bridge' ) . '</strong> ' . esc_html( $organization ) . '</p>';
        }
        if ( '' !== $instructions ) {
            echo '<p><strong>' . esc_html__( 'Delivery instructions:', 'phaseone-prism-bridge' ) . '</strong><br>' . nl2br( esc_html( $instructions ) ) . '</p>';
        }
    }
}

PhaseOne_Prism_Checkout_Bridge::boot();
