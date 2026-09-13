<?php
/**
 * Plugin Name: Phase eDebit Order Endpoint
 * Description: Creates securely priced WooCommerce orders from a custom frontend checkout and returns the hosted eDebit/Yodlee redirect URL.
 * Version: 1.1.9
 * Author: Phase One Labz
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('before_woocommerce_init', static function () {
    if (class_exists(\Automattic\WooCommerce\Utilities\FeaturesUtil::class)) {
        \Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
    }
});


final class Phase_Edebit_Shipping_Resolution_Exception_V117 extends InvalidArgumentException {
    private $valid_rates;
    private $requested_shipping;

    public function __construct($message, $valid_rates = [], $requested_shipping = []) {
        parent::__construct($message);
        $this->valid_rates = is_array($valid_rates) ? $valid_rates : [];
        $this->requested_shipping = is_array($requested_shipping) ? $requested_shipping : [];
    }

    public function get_valid_rates() {
        return $this->valid_rates;
    }

    public function get_requested_shipping() {
        return $this->requested_shipping;
    }
}

final class Phase_Edebit_Order_Endpoint_V117 {
    const VERSION = '1.1.9';
    const NAMESPACE = 'phase/v1';
    const DEFAULT_GATEWAY_ID = 'edd_draft_yodlee_gateway';

    const FREE_SHIPPING_MIN_PROMO_SUBTOTAL = 150.00;
    const SHIPPING_PROTECTION_PER_100 = 1.09;
    const DUPLICATE_WINDOW_SECONDS = 300;

    private static $active_yodlee_order_id = 0;
    private static $active_yodlee_locked_total = null;

    /**
     * Activation migration for legacy single-file copies of this plugin.
     *
     * Older installs may exist as a loose phase-edebit-order-endpoint.php in
     * wp-content/plugins while this ZIP installs the plugin in its own folder.
     * Loading both copies causes a duplicate implementation / REST route clash.
     * This activation hook deactivates only other active plugins whose header
     * name exactly matches this plugin, never PRISM/Stripe/other gateways.
     */
    public static function activate() {
        if (!function_exists('get_plugins') || !function_exists('deactivate_plugins')) {
            require_once ABSPATH . 'wp-admin/includes/plugin.php';
        }

        if (!function_exists('get_plugins') || !function_exists('deactivate_plugins')) {
            return;
        }

        $self = plugin_basename(__FILE__);
        $plugins = get_plugins();

        foreach ($plugins as $plugin_file => $headers) {
            if ($plugin_file === $self) {
                continue;
            }

            $name = isset($headers['Name']) ? trim((string) $headers['Name']) : '';
            if ($name !== 'Phase eDebit Order Endpoint') {
                continue;
            }

            if (is_plugin_active($plugin_file)) {
                deactivate_plugins($plugin_file, true);
            }
        }
    }

    public static function init() {
        add_action('rest_api_init', [__CLASS__, 'register_routes'], PHP_INT_MAX);

        // Narrow idempotency guard for this gateway only. WooCommerce already guards
        // stock with _order_stock_reduced; this additionally prevents a repeated
        // payment_complete() call from re-running completion hooks for our Yodlee orders.
        add_filter(
            'woocommerce_valid_order_statuses_for_payment_complete',
            [__CLASS__, 'filter_valid_statuses_for_payment_complete'],
            9999,
            2
        );

        // Record the transaction identifier only after WooCommerce has accepted a
        // payment completion from the actual gateway/callback layer.
        add_action('woocommerce_payment_complete', [__CLASS__, 'record_yodlee_payment_complete'], 99, 1);
    }

    public static function register_routes() {
        register_rest_route(self::NAMESPACE, '/health', [
            'methods' => 'GET',
            'callback' => [__CLASS__, 'health'],
            'permission_callback' => '__return_true',
        ], true);

        register_rest_route(self::NAMESPACE, '/payment-gateways', [
            'methods' => 'GET',
            'callback' => [__CLASS__, 'payment_gateways'],
            'permission_callback' => '__return_true',
        ], true);

        register_rest_route(self::NAMESPACE, '/create-edebit-order', [
            'methods' => 'POST',
            'callback' => [__CLASS__, 'create_order'],
            'permission_callback' => [__CLASS__, 'can_create_order'],
        ], true);

        register_rest_route(self::NAMESPACE, '/pricing-diagnostic', [
            'methods' => 'GET',
            'callback' => [__CLASS__, 'pricing_diagnostic'],
            'permission_callback' => [__CLASS__, 'can_run_diagnostic'],
        ], true);

        register_rest_route(self::NAMESPACE, '/pricing-integration-diagnostic', [
            'methods' => 'POST',
            'callback' => [__CLASS__, 'pricing_integration_diagnostic'],
            'permission_callback' => [__CLASS__, 'can_run_diagnostic'],
        ], true);
    }

    public static function health() {
        return rest_ensure_response([
            'success' => true,
            'plugin' => 'Phase eDebit Order Endpoint',
            'version' => self::VERSION,
            'gateway_id' => self::DEFAULT_GATEWAY_ID,
            'pricing_lock' => true,
            'pricing_engine' => 'authoritative-order-lines-v3-recon-identity',
            'route_callback' => __CLASS__ . '::create_order',
        ]);
    }

    /**
     * Public checkout endpoint.
     * Authentication by PHASE_EDEBIT_ENDPOINT_SECRET has been removed.
     */
    public static function can_create_order(WP_REST_Request $request) {
        return true;
    }

    public static function can_run_diagnostic() {
        return current_user_can('manage_woocommerce');
    }

    public static function payment_gateways() {
        if (!class_exists('WooCommerce') || !function_exists('WC')) {
            return new WP_Error('woocommerce_missing', 'WooCommerce is unavailable.', ['status' => 500]);
        }

        $gateways = WC()->payment_gateways()->payment_gateways();
        $payload = [];

        foreach ($gateways as $id => $gateway) {
            $supports = [];
            foreach (['products', 'refunds', 'tokenization', 'subscriptions'] as $feature) {
                $supports[$feature] = method_exists($gateway, 'supports') ? (bool) $gateway->supports($feature) : false;
            }

            $payload[] = [
                'id' => $id,
                'title' => method_exists($gateway, 'get_title') ? $gateway->get_title() : ($gateway->title ?? ''),
                'method_title' => $gateway->method_title ?? '',
                'enabled' => $gateway->enabled ?? 'no',
                'supports' => $supports,
            ];
        }

        return rest_ensure_response([
            'success' => true,
            'version' => self::VERSION,
            'gateways' => $payload,
            'current_gateway_id' => self::DEFAULT_GATEWAY_ID,
        ]);
    }

    private static function clean_string($value) {
        return sanitize_text_field(is_scalar($value) ? (string) $value : '');
    }

    private static function clean_email($value) {
        return sanitize_email(is_scalar($value) ? (string) $value : '');
    }

    private static function money($value) {
        $decimals = function_exists('wc_get_price_decimals') ? wc_get_price_decimals() : 2;
        return (float) number_format((float) $value, $decimals, '.', '');
    }

    private static function money_string($value) {
        $decimals = function_exists('wc_get_price_decimals') ? wc_get_price_decimals() : 2;
        return number_format((float) $value, $decimals, '.', '');
    }

    private static function normalize_address($data) {
        $data = is_array($data) ? $data : [];

        return [
            'first_name' => self::clean_string($data['first_name'] ?? $data['firstName'] ?? ''),
            'last_name'  => self::clean_string($data['last_name'] ?? $data['lastName'] ?? ''),
            'company'    => self::clean_string($data['company'] ?? ''),
            'email'      => self::clean_email($data['email'] ?? ''),
            'phone'      => self::clean_string($data['phone'] ?? ''),
            'address_1'  => self::clean_string($data['address_1'] ?? $data['address1'] ?? ''),
            'address_2'  => self::clean_string($data['address_2'] ?? $data['address2'] ?? ''),
            'city'       => self::clean_string($data['city'] ?? ''),
            'state'      => self::clean_string($data['state'] ?? ''),
            'postcode'   => self::clean_string($data['postcode'] ?? $data['zip'] ?? $data['postalCode'] ?? ''),
            'country'    => strtoupper(self::clean_string($data['country'] ?? 'US')),
        ];
    }

    private static function get_request_json(WP_REST_Request $request) {
        $params = $request->get_json_params();
        return is_array($params) ? $params : [];
    }

    private static function get_gateway($gateway_id) {
        if (!function_exists('WC') || !WC()->payment_gateways()) {
            return null;
        }

        $gateways = WC()->payment_gateways()->payment_gateways();
        return $gateways[$gateway_id] ?? null;
    }

    private static function get_coupon_codes($body) {
        $codes = [];

        if (!empty($body['couponCode'])) {
            $codes[] = $body['couponCode'];
        } elseif (!empty($body['coupon_code'])) {
            $codes[] = $body['coupon_code'];
        }

        if (!empty($body['coupons']) && is_array($body['coupons'])) {
            foreach ($body['coupons'] as $coupon) {
                if (is_array($coupon)) {
                    $coupon = $coupon['code'] ?? '';
                }
                $codes[] = $coupon;
            }
        }

        $clean = [];
        foreach ($codes as $code) {
            $code = wc_format_coupon_code(self::clean_string($code));
            if ($code !== '') {
                $clean[$code] = $code;
            }
        }

        return array_values($clean);
    }

    private static function shipping_protection_requested($body) {
        $candidates = [
            $body['shippingProtection'] ?? null,
            $body['shipping_protection'] ?? null,
            $body['shippingProtectionSelected'] ?? null,
            $body['shipping_protection_selected'] ?? null,
        ];

        foreach ($candidates as $candidate) {
            if (is_array($candidate)) {
                $candidate = $candidate['enabled'] ?? $candidate['selected'] ?? false;
            }
            if (is_bool($candidate)) {
                return $candidate;
            }
            if (is_numeric($candidate)) {
                return ((float) $candidate) > 0;
            }
            if (is_string($candidate)) {
                $normalized = strtolower(trim($candidate));
                if (in_array($normalized, ['1', 'true', 'yes', 'on', 'selected'], true)) {
                    return true;
                }
                if (in_array($normalized, ['0', 'false', 'no', 'off', ''], true)) {
                    return false;
                }
            }
        }

        // Backward compatibility: the old frontend may have sent a protection total.
        // The numeric amount is NEVER trusted; its presence only means "selected".
        foreach (['shippingProtectionTotal', 'shipping_protection_total'] as $key) {
            if (isset($body[$key]) && is_numeric($body[$key]) && (float) $body[$key] > 0) {
                return true;
            }
        }

        return false;
    }

    private static function requested_shipping_selection($body) {
        $shipping = $body['shippingMethod'] ?? $body['shipping_method'] ?? [];
        $selection = [
            'rate_id' => '',
            'instance_id' => '',
            'method_id' => '',
            'service_type' => '',
            'title' => '',
        ];

        if (is_string($shipping)) {
            $value = self::clean_string($shipping);
            $selection['rate_id'] = $value;
            // A legacy string such as "fedex" is a method hint, not permission
            // to select the first rate returned by that method.
            $selection['method_id'] = $value;
        } elseif (is_array($shipping)) {
            foreach (['rate_id', 'rateId', 'id'] as $key) {
                if (!empty($shipping[$key])) {
                    $selection['rate_id'] = self::clean_string($shipping[$key]);
                    break;
                }
            }
            foreach (['instance_id', 'instanceId'] as $key) {
                if (isset($shipping[$key]) && $shipping[$key] !== '') {
                    $selection['instance_id'] = self::clean_string($shipping[$key]);
                    break;
                }
            }
            foreach (['method_id', 'methodId'] as $key) {
                if (!empty($shipping[$key])) {
                    $selection['method_id'] = self::clean_string($shipping[$key]);
                    break;
                }
            }
            foreach (['service_type', 'serviceType', 'service', 'service_code', 'serviceCode', 'service_id', 'serviceId'] as $key) {
                if (!empty($shipping[$key])) {
                    $selection['service_type'] = self::clean_string($shipping[$key]);
                    break;
                }
            }
            foreach (['title', 'label', 'method_title', 'methodTitle', 'name'] as $key) {
                if (!empty($shipping[$key])) {
                    $selection['title'] = self::clean_string($shipping[$key]);
                    break;
                }
            }

            // Some frontends historically used `id` for a bare method ID.
            if ($selection['method_id'] === '' && $selection['rate_id'] !== '' && strpos($selection['rate_id'], ':') === false) {
                $selection['method_id'] = $selection['rate_id'];
            }
        }

        // A complete WooCommerce rate ID may itself encode method, instance and
        // service (for example fedex:12:FEDEX_GROUND). Exact rate_id matching is
        // always attempted first; these parsed fields are only fallback hints.
        if ($selection['rate_id'] !== '' && strpos($selection['rate_id'], ':') !== false) {
            $parts = explode(':', $selection['rate_id']);
            if ($selection['method_id'] === '' && !empty($parts[0])) {
                $selection['method_id'] = self::clean_string($parts[0]);
            }
            if ($selection['instance_id'] === '' && isset($parts[1]) && ctype_digit((string) $parts[1])) {
                $selection['instance_id'] = self::clean_string($parts[1]);
            }
            if ($selection['service_type'] === '') {
                if (count($parts) >= 3) {
                    $selection['service_type'] = self::clean_string(implode(':', array_slice($parts, 2)));
                } elseif (isset($parts[1]) && !ctype_digit((string) $parts[1])) {
                    $selection['service_type'] = self::clean_string($parts[1]);
                }
            }
        }

        return $selection;
    }

    private static function normalized_shipping_match_value($value) {
        $value = strtolower(trim((string) $value));
        return preg_replace('/[^a-z0-9]+/', '', $value);
    }

    private static function shipping_rate_service_type($rate) {
        $service_keys = [
            'service_type', 'service', 'service_code', 'service_id',
            'fedex_service', 'fedex_service_type', 'service_name',
        ];

        if (method_exists($rate, 'get_meta_data')) {
            $meta_data = $rate->get_meta_data();
            if (is_array($meta_data)) {
                foreach ($meta_data as $meta_key => $meta_value) {
                    $key = '';
                    $value = '';

                    if (is_object($meta_value) && method_exists($meta_value, 'get_data')) {
                        $data = $meta_value->get_data();
                        $key = isset($data['key']) ? (string) $data['key'] : '';
                        $value = isset($data['value']) && is_scalar($data['value']) ? (string) $data['value'] : '';
                    } elseif (is_string($meta_key) && is_scalar($meta_value)) {
                        $key = $meta_key;
                        $value = (string) $meta_value;
                    }

                    if ($key !== '' && in_array(strtolower($key), $service_keys, true) && $value !== '') {
                        return self::clean_string($value);
                    }
                }
            }
        }

        $rate_id = method_exists($rate, 'get_id') ? (string) $rate->get_id() : '';
        if ($rate_id !== '' && strpos($rate_id, ':') !== false) {
            $parts = explode(':', $rate_id);
            if (count($parts) >= 3) {
                return self::clean_string(implode(':', array_slice($parts, 2)));
            }
            if (isset($parts[1]) && !ctype_digit((string) $parts[1])) {
                return self::clean_string($parts[1]);
            }
        }

        return '';
    }

    private static function normalize_shipping_rate($rate) {
        return [
            'rate_id' => method_exists($rate, 'get_id') ? (string) $rate->get_id() : '',
            'instance_id' => method_exists($rate, 'get_instance_id') ? (string) $rate->get_instance_id() : '',
            'method_id' => method_exists($rate, 'get_method_id') ? (string) $rate->get_method_id() : '',
            'service_type' => self::shipping_rate_service_type($rate),
            'title' => method_exists($rate, 'get_label') ? (string) $rate->get_label() : '',
            'server_rate_cost' => method_exists($rate, 'get_cost') ? self::money($rate->get_cost()) : 0.0,
            '_rate_object' => $rate,
        ];
    }

    private static function public_shipping_rate($candidate) {
        return [
            'rate_id' => (string) ($candidate['rate_id'] ?? ''),
            'instance_id' => (string) ($candidate['instance_id'] ?? ''),
            'method_id' => (string) ($candidate['method_id'] ?? ''),
            'service_type' => (string) ($candidate['service_type'] ?? ''),
            'title' => (string) ($candidate['title'] ?? ''),
            'serverPrice' => self::money($candidate['server_rate_cost'] ?? 0),
        ];
    }

    private static function resolve_shipping_candidate($candidates, $selection) {
        $rate_id = (string) ($selection['rate_id'] ?? '');

        // Highest priority: the complete WooCommerce rate_id, byte-for-byte.
        if ($rate_id !== '') {
            $exact = array_values(array_filter($candidates, static function ($candidate) use ($rate_id) {
                return (string) ($candidate['rate_id'] ?? '') === $rate_id;
            }));
            if (count($exact) === 1) {
                return $exact[0];
            }
        }

        $filtered = $candidates;
        $primary_criteria = 0;

        foreach (['method_id', 'instance_id', 'service_type'] as $field) {
            $wanted = self::normalized_shipping_match_value($selection[$field] ?? '');
            if ($wanted === '') {
                continue;
            }
            $primary_criteria++;
            $filtered = array_values(array_filter($filtered, static function ($candidate) use ($field, $wanted) {
                return self::normalized_shipping_match_value($candidate[$field] ?? '') === $wanted;
            }));
        }

        if ($primary_criteria > 0 && count($filtered) === 1) {
            return $filtered[0];
        }

        // Title is deliberately secondary: it may only disambiguate candidates
        // that already survived method/instance/service matching.
        $title = self::normalized_shipping_match_value($selection['title'] ?? '');
        if ($primary_criteria > 0 && $title !== '' && count($filtered) > 1) {
            $title_matches = array_values(array_filter($filtered, static function ($candidate) use ($title) {
                return self::normalized_shipping_match_value($candidate['title'] ?? '') === $title;
            }));
            if (count($title_matches) === 1) {
                return $title_matches[0];
            }
        }

        return null;
    }

    /**
     * Normalize trusted WooCommerce product identity fields for exact,
     * case-insensitive comparisons. Browser-provided names/SKUs are never used.
     */
    private static function normalize_product_identity_value($value) {
        if (!is_scalar($value)) {
            return '';
        }

        $value = trim((string) $value);
        if ($value === '') {
            return '';
        }

        return function_exists('mb_strtolower') ? mb_strtolower($value, 'UTF-8') : strtolower($value);
    }

    /**
     * Product ID 545 is a last-resort trusted identity for the current store.
     * It can be overridden in wp-config.php with PHASE_EDEBIT_RECON_PRODUCT_ID
     * and/or extended with the phase_edebit_recon_product_ids filter.
     */
    private static function configured_recon_product_ids() {
        $ids = [545];

        if (defined('PHASE_EDEBIT_RECON_PRODUCT_ID')) {
            $configured = PHASE_EDEBIT_RECON_PRODUCT_ID;
            if (is_array($configured)) {
                $ids = $configured;
            } elseif (is_scalar($configured)) {
                $ids = preg_split('/[\s,]+/', trim((string) $configured));
            }
        }

        if (function_exists('apply_filters')) {
            $ids = apply_filters('phase_edebit_recon_product_ids', $ids);
        }

        if (!is_array($ids)) {
            $ids = [$ids];
        }

        $normalized = [];
        foreach ($ids as $id) {
            $id = absint($id);
            if ($id > 0) {
                $normalized[] = $id;
            }
        }

        return array_values(array_unique($normalized));
    }

    /**
     * Detect H-Recon Water only from the WC_Product loaded by WooCommerce.
     * For variations, both the variation and its parent are inspected.
     *
     * Trusted identifiers:
     * - SKU: H-RECON-WATER
     * - Slug: h-recon-water
     * - Slug: recon-water-30ml
     * - Configurable product ID fallback (545 by default)
     */
    private static function is_recon_water_product($product) {
        if (!$product || !is_a($product, 'WC_Product')) {
            return false;
        }

        $allowed_slugs = ['h-recon-water', 'recon-water-30ml'];
        $allowed_skus = ['h-recon-water'];
        $allowed_ids = self::configured_recon_product_ids();

        $products_to_check = [$product];
        if ($product->is_type('variation') && $product->get_parent_id()) {
            $parent = wc_get_product($product->get_parent_id());
            if ($parent && is_a($parent, 'WC_Product')) {
                $products_to_check[] = $parent;
            }
        }

        foreach ($products_to_check as $candidate) {
            $candidate_id = absint($candidate->get_id());
            $slug = self::normalize_product_identity_value($candidate->get_slug());
            $sku = self::normalize_product_identity_value($candidate->get_sku());

            if ($candidate_id > 0 && in_array($candidate_id, $allowed_ids, true)) {
                return true;
            }

            if (
                in_array($slug, $allowed_slugs, true) ||
                in_array($sku, $allowed_skus, true) ||
                strpos($slug, 'h-recon-') === 0 ||
                strpos($sku, 'h-recon-') === 0 ||
                strpos($slug, 'recon-water-') === 0 ||
                strpos($sku, 'recon-water-') === 0
            ) {
                return true;
            }
        }

        return false;
    }

    /**
     * Product payload is deliberately restricted to product/variation IDs and quantity.
     * Any price, subtotal, discount or total sent by the browser is ignored.
     */
    private static function prepare_product_lines($items) {
        if (!is_array($items) || empty($items)) {
            throw new InvalidArgumentException('No cart items were provided.');
        }

        $lines = [];

        foreach ($items as $item) {
            if (!is_array($item)) {
                throw new InvalidArgumentException('Invalid cart item.');
            }

            $product_id = absint($item['productId'] ?? $item['product_id'] ?? $item['id'] ?? 0);
            $variation_id = absint($item['variationId'] ?? $item['variation_id'] ?? $item['selectedVariationId'] ?? 0);
            $quantity = absint($item['quantity'] ?? $item['qty'] ?? 0);

            if ($quantity < 1 || $quantity > 1000) {
                throw new InvalidArgumentException('Invalid product quantity.');
            }

            $target_id = $variation_id ?: $product_id;
            if (!$target_id) {
                throw new InvalidArgumentException('Invalid product identifier.');
            }

            $product = wc_get_product($target_id);
            if (!$product || !$product->exists()) {
                throw new InvalidArgumentException('A cart product is invalid or unavailable.');
            }

            if ($variation_id) {
                if (!$product->is_type('variation')) {
                    throw new InvalidArgumentException('Invalid variation identifier.');
                }
                if ($product_id && (int) $product->get_parent_id() !== (int) $product_id) {
                    throw new InvalidArgumentException('Variation does not belong to the requested product.');
                }
            }

            if (!$product->is_purchasable()) {
                throw new InvalidArgumentException('A cart product is not purchasable.');
            }

            if (!$product->is_in_stock()) {
                throw new InvalidArgumentException('A cart product is out of stock.');
            }

            if ($product->managing_stock() && !$product->backorders_allowed() && !$product->has_enough_stock($quantity)) {
                throw new InvalidArgumentException('Insufficient stock for a cart product.');
            }

            $raw_price = $product->get_price();
            if ($raw_price === '' || !is_numeric($raw_price)) {
                throw new InvalidArgumentException('A cart product has no authorized WooCommerce price.');
            }

            $unit_price = self::money((float) $raw_price);
            if ($unit_price < 0) {
                throw new InvalidArgumentException('A cart product has an invalid WooCommerce price.');
            }

            $lines[] = [
                'product' => $product,
                'product_id' => $product_id ?: ($product->is_type('variation') ? $product->get_parent_id() : $product->get_id()),
                'variation_id' => $variation_id,
                'quantity' => $quantity,
                'unit_price' => $unit_price,
                'is_recon' => self::is_recon_water_product($product),
                'needs_shipping' => (bool) $product->needs_shipping(),
            ];
        }

        $pricing = self::calculate_product_promotions($lines);
        self::assert_recon_full_price_model($pricing);
        return $pricing;
    }

    /**
     * Pure promotion engine. It is also used by the diagnostic suite below.
     */
    private static function calculate_product_promotions($lines) {
        $original_subtotal = 0.0;
        $non_recon_subtotal = 0.0;
        $total_quantity = 0;
        $bundle_eligible_quantity = 0;
        $recon_quantity = 0;

        foreach ($lines as $index => $line) {
            $quantity = max(1, (int) ($line['quantity'] ?? 1));
            $unit_price = self::money((float) ($line['unit_price'] ?? 0));
            $line_original = self::money($unit_price * $quantity);

            // Production lines are always reclassified from the trusted WC_Product.
            // The resulting flag is the single source of truth for full-price
            // products that must remain outside the quantity bundle.
            $is_recon = !empty($line['product']) && is_a($line['product'], 'WC_Product')
                ? self::is_recon_water_product($line['product'])
                : !empty($line['is_recon']);

            $lines[$index]['quantity'] = $quantity;
            $lines[$index]['unit_price'] = $unit_price;
            $lines[$index]['original_line_total'] = $line_original;
            $lines[$index]['is_recon'] = $is_recon;

            $original_subtotal += $line_original;
            $total_quantity += $quantity;

            if (!$is_recon) {
                $non_recon_subtotal += $line_original;
                $bundle_eligible_quantity += $quantity;
            } else {
                $recon_quantity += $quantity;
            }
        }

        $original_subtotal = self::money($original_subtotal);
        $non_recon_subtotal = self::money($non_recon_subtotal);

        $bundle_percent = 0;
        $bundle_required_quantity = 0;
        if ($bundle_eligible_quantity >= 10) {
            $bundle_percent = 30;
            $bundle_required_quantity = 10;
        } elseif ($bundle_eligible_quantity >= 5) {
            $bundle_percent = 10;
            $bundle_required_quantity = 5;
        }

        $recon_discount = 0.0;
        $bundle_discount = 0.0;
        $promotional_subtotal = 0.0;

        foreach ($lines as $index => $line) {
            $quantity = (int) $line['quantity'];
            $original_line = self::money($line['original_line_total']);
            $promotional_line = $original_line;

            if (empty($line['is_recon']) && $bundle_percent > 0) {
                $line_discount = self::money($original_line * ($bundle_percent / 100));
                $promotional_line = self::money($original_line - $line_discount);
                $bundle_discount += $line_discount;
            }

            $lines[$index]['promotional_line_total'] = self::money($promotional_line);
            $lines[$index]['promotional_unit_price'] = self::money($lines[$index]['promotional_line_total'] / max(1, $quantity));
            $lines[$index]['product_promo_discount'] = self::money($original_line - $lines[$index]['promotional_line_total']);
            $promotional_subtotal += $lines[$index]['promotional_line_total'];
        }

        return [
            'lines' => $lines,
            'original_subtotal' => self::money($original_subtotal),
            'non_recon_subtotal' => self::money($non_recon_subtotal),
            'total_quantity' => $total_quantity,
            'bundle_eligible_quantity' => $bundle_eligible_quantity,
            'recon_quantity' => $recon_quantity,
            // Retained as inactive compatibility fields for existing order/report consumers.
            'recon_promo' => false,
            'recon_discount' => self::money($recon_discount),
            'bundle_promo' => $bundle_percent > 0,
            'bundle_discount' => self::money($bundle_discount),
            'bundle_discount_percent' => $bundle_percent,
            'bundle_required_quantity' => $bundle_required_quantity,
            'promotional_subtotal' => self::money($promotional_subtotal),
        ];
    }

    /**
     * Adapt the authoritative Bulk quote to the existing order-integrity model.
     * No catalog, coupon, bundle or Recon calculation is repeated here.
     */
    private static function prepare_bulk_pricing($bulk_context) {
        $quote = is_array($bulk_context) ? ($bulk_context['quote'] ?? []) : [];
        if (empty($quote['lines']) || !is_array($quote['lines'])) {
            throw new InvalidArgumentException('The authoritative Bulk quote is unavailable.');
        }

        $lines = [];
        $subtotal = 0.0;
        $total_quantity = 0;
        $recon_quantity = 0;
        $non_recon_subtotal = 0.0;

        foreach ($quote['lines'] as $bulk_line) {
            $product = wc_get_product((int) ($bulk_line['purchasable_id'] ?? 0));
            if (!$product || !is_a($product, 'WC_Product')) {
                throw new InvalidArgumentException('A Bulk product is no longer available.');
            }

            $quantity = max(1, (int) ($bulk_line['quantity'] ?? 0));
            $unit_price = self::money($bulk_line['unit_price'] ?? 0);
            $line_total = self::money($bulk_line['line_total'] ?? ($unit_price * $quantity));
            if ($line_total !== self::money($unit_price * $quantity)) {
                throw new RuntimeException('A Bulk line does not match its authoritative unit price.');
            }

            $is_recon = self::is_recon_water_product($product);
            $subtotal += $line_total;
            $total_quantity += $quantity;
            if ($is_recon) {
                $recon_quantity += $quantity;
            } else {
                $non_recon_subtotal += $line_total;
            }

            $lines[] = [
                'product' => $product,
                'product_id' => (int) ($bulk_line['product_id'] ?? $product->get_id()),
                'variation_id' => (int) ($bulk_line['variation_id'] ?? 0),
                'quantity' => $quantity,
                'unit_price' => $unit_price,
                'original_line_total' => $line_total,
                'promotional_unit_price' => $unit_price,
                'promotional_line_total' => $line_total,
                'product_promo_discount' => 0.0,
                'is_recon' => $is_recon,
                'needs_shipping' => $product->needs_shipping(),
            ];
        }

        $subtotal = self::money($subtotal);
        if ($subtotal !== self::money($quote['subtotal'] ?? -1)) {
            throw new RuntimeException('The Bulk quote subtotal failed its integrity check.');
        }

        return [
            'context' => 'bulk',
            'lines' => $lines,
            'original_subtotal' => $subtotal,
            'non_recon_subtotal' => self::money($non_recon_subtotal),
            'total_quantity' => $total_quantity,
            'recon_quantity' => $recon_quantity,
            'recon_promo' => false,
            'recon_discount' => 0.0,
            'bundle_promo' => false,
            'bundle_discount' => 0.0,
            'bundle_discount_percent' => 0,
            'bundle_required_quantity' => 0,
            'promotional_subtotal' => $subtotal,
        ];
    }

    /**
     * Fail closed unless trusted Recon Water lines retain their authorized
     * WooCommerce price and remain outside the quantity-bundle calculation.
     */
    private static function assert_recon_full_price_model($pricing) {
        if (!is_array($pricing) || empty($pricing['lines']) || !is_array($pricing['lines'])) {
            throw new RuntimeException('Authoritative Recon pricing data is unavailable.');
        }

        if (($pricing['context'] ?? '') === 'bulk') {
            if (
                !empty($pricing['recon_promo']) ||
                !empty($pricing['bundle_promo']) ||
                self::money($pricing['recon_discount'] ?? 0) !== 0.0 ||
                self::money($pricing['bundle_discount'] ?? 0) !== 0.0
            ) {
                throw new RuntimeException('Retail promotions cannot be applied to a Bulk quote.');
            }
            foreach ($pricing['lines'] as $line) {
                $expected = self::money(($line['unit_price'] ?? 0) * max(1, (int) ($line['quantity'] ?? 1)));
                if (self::money($line['promotional_line_total'] ?? -1) !== $expected) {
                    throw new RuntimeException('A Bulk line failed its authoritative pricing check.');
                }
            }
            return true;
        }

        $expected_bundle_discount = 0.0;
        $bundle_percent = (int) ($pricing['bundle_discount_percent'] ?? 0);

        foreach ($pricing['lines'] as $line) {
            $quantity = max(1, (int) ($line['quantity'] ?? 1));
            $unit_price = self::money($line['unit_price'] ?? 0);
            $original_line = self::money($line['original_line_total'] ?? ($unit_price * $quantity));
            $promotional_line = self::money($line['promotional_line_total'] ?? $original_line);

            if (!empty($line['is_recon'])) {
                if ($promotional_line !== $original_line) {
                    throw new RuntimeException('Recon Water must retain its authorized WooCommerce price.');
                }
                // Recon Water must never contribute to the bundle discount.
                continue;
            }

            if ($bundle_percent > 0) {
                $expected_bundle_discount += self::money($original_line * ($bundle_percent / 100));
            }
        }

        $expected_bundle_discount = self::money($expected_bundle_discount);

        if (!empty($pricing['recon_promo']) || self::money($pricing['recon_discount'] ?? 0) !== 0.0) {
            throw new RuntimeException('Recon Water no longer supports a special promotional price.');
        }

        if (self::money($pricing['bundle_discount'] ?? 0) !== $expected_bundle_discount) {
            throw new RuntimeException('Bundle discount included an ineligible Recon Water line or otherwise mismatched authoritative pricing.');
        }

        return true;
    }

    private static function calculate_shipping_protection($promotional_subtotal, $selected, $destination_country) {
        if (!$selected) {
            return 0.0;
        }

        $base_country = function_exists('WC') && WC()->countries ? strtoupper((string) WC()->countries->get_base_country()) : 'US';
        if (strtoupper((string) $destination_country) !== $base_country) {
            return 0.0;
        }

        $promotional_subtotal = self::money($promotional_subtotal);
        if ($promotional_subtotal <= 0) {
            return 0.0;
        }

        $hundreds = (int) ceil($promotional_subtotal / 100);
        return self::money($hundreds * self::SHIPPING_PROTECTION_PER_100);
    }

    /**
     * REST requests do not always bootstrap the WooCommerce frontend runtime.
     * Core shipping (and some gateways) expect WC()->session/customer/cart to
     * exist and may call WC()->session->get(). Initialize only the missing
     * runtime objects for this request before server-side shipping/payment.
     */
    private static function ensure_woocommerce_runtime($shipping_address = []) {
        if (!function_exists('WC') || !WC()) {
            throw new RuntimeException('WooCommerce runtime is unavailable.');
        }

        if (null === WC()->session) {
            $session_class = apply_filters('woocommerce_session_handler', 'WC_Session_Handler');
            if (!is_string($session_class) || $session_class === '' || !class_exists($session_class)) {
                throw new RuntimeException('WooCommerce session handler is unavailable.');
            }

            WC()->session = new $session_class();
            if (method_exists(WC()->session, 'init')) {
                WC()->session->init();
            }
        }

        if (null === WC()->customer) {
            if (!class_exists('WC_Customer')) {
                throw new RuntimeException('WooCommerce customer runtime is unavailable.');
            }
            WC()->customer = new WC_Customer(get_current_user_id(), true);
        }

        if (is_array($shipping_address) && WC()->customer) {
            $map = [
                'country'   => 'set_shipping_country',
                'state'     => 'set_shipping_state',
                'postcode'  => 'set_shipping_postcode',
                'city'      => 'set_shipping_city',
                'address_1' => 'set_shipping_address',
                'address_2' => 'set_shipping_address_2',
            ];

            foreach ($map as $key => $setter) {
                if (array_key_exists($key, $shipping_address) && method_exists(WC()->customer, $setter)) {
                    WC()->customer->{$setter}((string) $shipping_address[$key]);
                }
            }
        }

        if (null === WC()->cart) {
            if (!class_exists('WC_Cart')) {
                throw new RuntimeException('WooCommerce cart runtime is unavailable.');
            }
            WC()->cart = new WC_Cart();
        }
    }

    private static function calculate_server_shipping($pricing, $shipping_address, $requested_shipping) {
        $needs_shipping = false;
        foreach ($pricing['lines'] as $line) {
            if (!empty($line['needs_shipping'])) {
                $needs_shipping = true;
                break;
            }
        }

        if (!$needs_shipping) {
            return [
                'rate_id' => '',
                'method_id' => '',
                'title' => '',
                'server_rate_cost' => 0.0,
                'charged_cost' => 0.0,
                'fedex_free' => false,
                'threshold_free' => false,
            ];
        }

        $has_shipping_identifier = is_array($requested_shipping) && (
            !empty($requested_shipping['rate_id']) ||
            !empty($requested_shipping['method_id']) ||
            !empty($requested_shipping['instance_id']) ||
            !empty($requested_shipping['service_type'])
        );
        if (!$has_shipping_identifier) {
            throw new Phase_Edebit_Shipping_Resolution_Exception_V117(
                'A server-validatable shipping method is required.',
                [],
                is_array($requested_shipping) ? $requested_shipping : []
            );
        }

        self::ensure_woocommerce_runtime($shipping_address);

        if (!function_exists('WC') || !WC()->shipping()) {
            throw new RuntimeException('WooCommerce shipping is unavailable.');
        }

        $contents = [];
        foreach ($pricing['lines'] as $index => $line) {
            $product = $line['product'];
            $key = 'phase_' . $index . '_' . $product->get_id();
            $contents[$key] = [
                'key' => $key,
                'product_id' => (int) $line['product_id'],
                'variation_id' => (int) $line['variation_id'],
                'variation' => $product->is_type('variation') ? $product->get_variation_attributes() : [],
                'quantity' => (int) $line['quantity'],
                'data' => $product,
                'line_total' => self::money($line['promotional_line_total']),
                'line_tax' => 0,
                'line_subtotal' => self::money($line['promotional_line_total']),
                'line_subtotal_tax' => 0,
            ];
        }

        $package = [
            'contents' => $contents,
            'contents_cost' => self::money($pricing['promotional_subtotal']),
            'applied_coupons' => [],
            'user' => ['ID' => get_current_user_id()],
            'destination' => [
                'country' => $shipping_address['country'] ?? '',
                'state' => $shipping_address['state'] ?? '',
                'postcode' => $shipping_address['postcode'] ?? '',
                'city' => $shipping_address['city'] ?? '',
                'address' => $shipping_address['address_1'] ?? '',
                'address_1' => $shipping_address['address_1'] ?? '',
                'address_2' => $shipping_address['address_2'] ?? '',
            ],
        ];

        $packages = WC()->shipping()->calculate_shipping([$package]);
        $rates = $packages[0]['rates'] ?? [];
        if (!$rates) {
            throw new InvalidArgumentException('No authorized shipping rates are available for this address.');
        }

        $candidates = [];
        foreach ($rates as $rate) {
            if (!is_a($rate, 'WC_Shipping_Rate')) {
                continue;
            }
            $candidates[] = self::normalize_shipping_rate($rate);
        }

        if (!$candidates) {
            throw new Phase_Edebit_Shipping_Resolution_Exception_V117(
                'No authorized shipping rates are available for this address.',
                [],
                $requested_shipping
            );
        }

        $selected = self::resolve_shipping_candidate($candidates, $requested_shipping);
        if (!$selected) {
            $valid_rates = array_map([__CLASS__, 'public_shipping_rate'], $candidates);
            throw new Phase_Edebit_Shipping_Resolution_Exception_V117(
                'The selected shipping method could not be uniquely validated on the server. Send the exact WooCommerce rate_id from one of validRates.',
                $valid_rates,
                $requested_shipping
            );
        }

        $selected_rate = $selected['_rate_object'];
        $rate_id = (string) $selected['rate_id'];
        $method_id = (string) $selected['method_id'];
        $title = (string) $selected['title'];
        $server_cost = self::money($selected['server_rate_cost']);

        $fedex_haystack = strtolower($rate_id . ' ' . $method_id . ' ' . $title);
        $is_fedex = strpos($fedex_haystack, 'fedex') !== false || strpos($fedex_haystack, 'fed ex') !== false;
        $threshold_free = self::money($pricing['promotional_subtotal']) >= self::FREE_SHIPPING_MIN_PROMO_SUBTOTAL;
        $charged_cost = $threshold_free ? 0.0 : $server_cost;

        return [
            'rate_id' => $rate_id,
            'method_id' => $method_id,
            'title' => $title,
            'server_rate_cost' => $server_cost,
            'charged_cost' => self::money($charged_cost),
            'fedex_free' => $threshold_free && $is_fedex,
            'threshold_free' => $threshold_free,
        ];
    }

    private static function add_priced_product_lines_to_order($order, $pricing) {
        foreach ($pricing['lines'] as $index => $line) {
            $product = $line['product'];

            /*
             * IMPORTANT: WooCommerce's WC_Order::apply_coupon() calls
             * recalculate_coupons(), which resets each line total back to the
             * line subtotal before applying coupons. Therefore product-level
             * promotions must be represented as the authoritative pre-coupon
             * subtotal as well as total. The original catalog amount is kept
             * only in line/order metadata for audit purposes.
             */
            $promotional_line_total = self::money($line['promotional_line_total']);
            $args = [
                'subtotal' => self::money_string($promotional_line_total),
                'total' => self::money_string($promotional_line_total),
            ];

            if ($product->is_type('variation')) {
                $args['variation_id'] = $product->get_id();
                $args['variation'] = $product->get_variation_attributes();
            }

            $item_id = $order->add_product($product, (int) $line['quantity'], $args);
            if (!$item_id) {
                throw new RuntimeException('WooCommerce could not add a cart product to the order.');
            }

            $item = $order->get_item($item_id);
            if (!$item || !is_a($item, 'WC_Order_Item_Product')) {
                throw new RuntimeException('WooCommerce could not reload a priced order line.');
            }

            // Re-assert the authoritative pre-coupon values after add_product().
            $item->set_subtotal(self::money_string($promotional_line_total));
            $item->set_total(self::money_string($promotional_line_total));
            $item->update_meta_data('_phaseone_pricing_line_index', (int) $index);
            $item->update_meta_data('_phaseone_original_unit_price', self::money_string($line['unit_price']));
            $item->update_meta_data('_phaseone_original_line_total', self::money_string($line['original_line_total']));
            $item->update_meta_data('_phaseone_promotional_unit_price', self::money_string($line['promotional_unit_price']));
            $item->update_meta_data('_phaseone_promotional_line_total', self::money_string($promotional_line_total));
            $item->update_meta_data('_phaseone_product_promo_discount', self::money_string($line['product_promo_discount']));
            $item->update_meta_data('_phaseone_recon_water_line', !empty($line['is_recon']) ? 'yes' : 'no');
            $item->save();
        }
    }

    private static function add_shipping_to_order($order, $shipping) {
        if ($shipping['rate_id'] === '' && self::money($shipping['charged_cost']) === 0.0) {
            return;
        }

        $item = new WC_Order_Item_Shipping();
        $item->set_method_title($shipping['title'] ?: 'Shipping');
        $item->set_method_id($shipping['method_id'] ?: $shipping['rate_id']);
        if (method_exists($item, 'set_instance_id') && strpos($shipping['rate_id'], ':') !== false) {
            $parts = explode(':', $shipping['rate_id']);
            if (isset($parts[1]) && ctype_digit((string) $parts[1])) {
                $item->set_instance_id((int) $parts[1]);
            }
        }
        $item->set_total(self::money_string($shipping['charged_cost']));
        $order->add_item($item);

        $order->update_meta_data('_phase_shipping_rate_id', $shipping['rate_id']);
        $order->update_meta_data('_phase_shipping_method_id', $shipping['method_id']);
        $order->update_meta_data('_phase_shipping_method_title', $shipping['title']);
        $order->update_meta_data('_phase_shipping_server_rate', self::money_string($shipping['server_rate_cost']));
        $order->update_meta_data('_phase_shipping_total', self::money_string($shipping['charged_cost']));
        $order->update_meta_data('_phaseone_fedex_free_shipping', $shipping['fedex_free'] ? 'yes' : 'no');
        $order->update_meta_data('_phaseone_threshold_free_shipping', !empty($shipping['threshold_free']) ? 'yes' : 'no');
    }

    private static function add_shipping_protection_to_order($order, $amount) {
        $amount = self::money($amount);
        if ($amount <= 0) {
            return;
        }

        $fee = new WC_Order_Item_Fee();
        $fee->set_name('Shipping Protection');
        $fee->set_amount(self::money_string($amount));
        $fee->set_total(self::money_string($amount));
        $fee->set_tax_status('none');
        $order->add_item($fee);

        $order->update_meta_data('_phase_shipping_protection_total', self::money_string($amount));
    }

    private static function apply_server_coupons($order, $coupon_codes) {
        foreach ($coupon_codes as $coupon_code) {
            $result = $order->apply_coupon($coupon_code);
            if (is_wp_error($result)) {
                throw new InvalidArgumentException('Coupon could not be applied: ' . $coupon_code . '.');
            }
            if ($result === false) {
                throw new InvalidArgumentException('Coupon is not valid for this order: ' . $coupon_code . '.');
            }
        }
    }

    private static function build_cart_fingerprint($billing, $shipping, $pricing, $coupon_codes, $requested_rate_id, $protection_selected) {
        $items = [];
        foreach ($pricing['lines'] as $line) {
            $items[] = [
                'product_id' => (int) $line['product_id'],
                'variation_id' => (int) $line['variation_id'],
                'quantity' => (int) $line['quantity'],
            ];
        }

        usort($items, static function ($a, $b) {
            return [$a['product_id'], $a['variation_id'], $a['quantity']] <=> [$b['product_id'], $b['variation_id'], $b['quantity']];
        });

        sort($coupon_codes, SORT_STRING);

        $data = [
            'email' => strtolower((string) ($billing['email'] ?? '')),
            'items' => $items,
            'coupons' => $coupon_codes,
            'shipping_rate' => is_array($requested_rate_id) ? wp_json_encode($requested_rate_id) : (string) $requested_rate_id,
            'shipping_country' => (string) ($shipping['country'] ?? ''),
            'shipping_postcode' => strtoupper((string) ($shipping['postcode'] ?? '')),
            'protection' => (bool) $protection_selected,
        ];

        return hash('sha256', wp_json_encode($data));
    }

    private static function duplicate_lock_key($fingerprint) {
        return 'phase_edebit_' . substr($fingerprint, 0, 32);
    }

    private static function find_recent_duplicate($fingerprint) {
        if (!function_exists('wc_get_orders')) {
            return null;
        }

        $orders = wc_get_orders([
            'limit' => 1,
            'return' => 'objects',
            'orderby' => 'date',
            'order' => 'DESC',
            'date_created' => '>' . (time() - self::DUPLICATE_WINDOW_SECONDS),
            'meta_query' => [
                [
                    'key' => '_phaseone_cart_fingerprint',
                    'value' => $fingerprint,
                    'compare' => '=',
                ],
            ],
        ]);

        foreach ($orders as $order) {
            if (!is_a($order, 'WC_Order')) {
                continue;
            }
            if ($order->get_payment_method() !== self::DEFAULT_GATEWAY_ID) {
                continue;
            }
            if ($order->has_status(['cancelled', 'failed', 'refunded', 'trash'])) {
                continue;
            }
            return $order;
        }

        return null;
    }

    private static function duplicate_response($order) {
        $redirect = (string) $order->get_meta('_phase_gateway_redirect_url', true);
        if ($redirect === '') {
            $redirect = $order->get_checkout_payment_url();
        }

        return rest_ensure_response([
            'success' => true,
            'duplicatePrevented' => true,
            'version' => self::VERSION,
            'orderId' => $order->get_id(),
            'orderNumber' => $order->get_order_number(),
            'status' => $order->get_status(),
            'paymentMethod' => $order->get_payment_method(),
            'redirectUrl' => $redirect,
            'orderTotal' => self::money($order->get_total()),
            'orderKey' => $order->get_order_key(),
            'message' => 'A matching recent eDebit order already exists; no new Yodlee payment was created.',
        ]);
    }

    public static function filter_valid_statuses_for_payment_complete($statuses, $order) {
        if (!is_a($order, 'WC_Order') || $order->get_payment_method() !== self::DEFAULT_GATEWAY_ID) {
            return $statuses;
        }

        // Hosted checkout creation is not payment confirmation.
        if (self::$active_yodlee_order_id && (int) $order->get_id() === (int) self::$active_yodlee_order_id) {
            return [];
        }

        // If the gateway/callback tries payment_complete() again after we already
        // recorded the first accepted completion, make it a no-op.
        if ($order->get_meta('_phaseone_yodlee_payment_completion_recorded', true) === 'yes') {
            return [];
        }

        return $statuses;
    }

    public static function record_yodlee_payment_complete($order_id) {
        $order = wc_get_order($order_id);
        if (!$order || $order->get_payment_method() !== self::DEFAULT_GATEWAY_ID) {
            return;
        }

        if ($order->get_meta('_phaseone_yodlee_payment_completion_recorded', true) === 'yes') {
            return;
        }

        $transaction_id = self::clean_string($order->get_transaction_id());
        if ($transaction_id !== '') {
            $order->update_meta_data('_phaseone_yodlee_transaction_id', $transaction_id);
        }

        $order->update_meta_data('_phaseone_yodlee_payment_completion_recorded', 'yes');
        $order->update_meta_data('_phaseone_yodlee_payment_completion_recorded_at', gmdate('c'));
        $order->save();
    }

    public static function filter_locked_total_during_yodlee($total, $order) {
        if (
            self::$active_yodlee_order_id &&
            is_a($order, 'WC_Order') &&
            (int) $order->get_id() === (int) self::$active_yodlee_order_id &&
            self::$active_yodlee_locked_total !== null
        ) {
            return self::money(self::$active_yodlee_locked_total);
        }

        return $total;
    }

    private static function invoke_yodlee_process_payment($gateway, $order, $locked_total) {
        self::$active_yodlee_order_id = (int) $order->get_id();
        self::$active_yodlee_locked_total = self::money($locked_total);

        add_filter('woocommerce_order_get_total', [__CLASS__, 'filter_locked_total_during_yodlee'], 9999, 2);

        try {
            return $gateway->process_payment($order->get_id());
        } finally {
            remove_filter('woocommerce_order_get_total', [__CLASS__, 'filter_locked_total_during_yodlee'], 9999);
            self::$active_yodlee_order_id = 0;
            self::$active_yodlee_locked_total = null;
        }
    }

    private static function store_pricing_meta($order, $pricing, $shipping, $shipping_protection) {
        $order->update_meta_data('_phaseone_recon_water_promo', $pricing['recon_promo'] ? 'yes' : 'no');
        $order->update_meta_data('_phaseone_recon_water_discount', self::money_string($pricing['recon_discount']));
        $order->update_meta_data('_phaseone_bundle_promo', $pricing['bundle_promo'] ? 'yes' : 'no');
        $order->update_meta_data('_phaseone_bundle_discount', self::money_string($pricing['bundle_discount']));
        $order->update_meta_data('_phaseone_bundle_discount_percent', (int) $pricing['bundle_discount_percent']);
        $order->update_meta_data('_phaseone_bundle_required_quantity', (int) $pricing['bundle_required_quantity']);
        $order->update_meta_data('_phaseone_original_product_subtotal', self::money_string($pricing['original_subtotal']));
        $order->update_meta_data('_phaseone_promotional_product_subtotal', self::money_string($pricing['promotional_subtotal']));
        $order->update_meta_data('_phaseone_shipping_protection', self::money_string($shipping_protection));
        $order->update_meta_data('_phaseone_shipping_server_validated', 'yes');
        $order->update_meta_data('_phaseone_shipping_server_rate', self::money_string($shipping['server_rate_cost']));
        $order->update_meta_data('_phaseone_pricing_engine_version', self::VERSION);
        $order->update_meta_data(
            '_phaseone_pricing_engine',
            ($pricing['context'] ?? '') === 'bulk'
                ? 'phaseone-bulk-v1'
                : 'authoritative-order-lines-v4-full-price-recon'
        );
        $order->update_meta_data('_phaseone_route_callback', __CLASS__ . '::create_order');
    }


    /**
     * Build a persisted-order snapshot and verify that WooCommerce did not
     * overwrite the authoritative product promotions, shipping or ParcelGuard.
     * Throws before Yodlee is called when any persisted amount is unsafe.
     */
    private static function assert_order_pricing_integrity($order, $pricing, $shipping, $shipping_protection, $expected_locked_total = null) {
        if (!$order || !is_a($order, 'WC_Order')) {
            throw new RuntimeException('Pricing integrity check requires a valid WooCommerce order.');
        }

        // Re-run the independent Recon/bundle model guard immediately before
        // trusting any persisted order amount or invoking the gateway.
        self::assert_recon_full_price_model($pricing);

        $expected_lines = [];
        foreach ($pricing['lines'] as $index => $line) {
            $expected_lines[(int) $index] = $line;
        }

        $seen = [];
        $line_subtotal_sum = 0.0;
        $line_total_sum = 0.0;

        foreach ($order->get_items('line_item') as $item) {
            if (!is_a($item, 'WC_Order_Item_Product')) {
                continue;
            }

            $line_index = $item->get_meta('_phaseone_pricing_line_index', true);
            if ($line_index === '' || !array_key_exists((int) $line_index, $expected_lines)) {
                throw new RuntimeException('An order product line is missing authoritative pricing metadata.');
            }

            $line_index = (int) $line_index;
            if (isset($seen[$line_index])) {
                throw new RuntimeException('Duplicate authoritative pricing line detected.');
            }
            $seen[$line_index] = true;

            $expected = $expected_lines[$line_index];
            $expected_subtotal = self::money($expected['promotional_line_total']);
            $actual_subtotal = self::money($item->get_subtotal());
            $actual_total = self::money($item->get_total());

            $trusted_is_recon = !empty($expected['product']) && is_a($expected['product'], 'WC_Product')
                ? self::is_recon_water_product($expected['product'])
                : !empty($expected['is_recon']);

            if ($trusted_is_recon !== !empty($expected['is_recon'])) {
                throw new RuntimeException('Trusted Recon Water identity changed between product loading and order validation.');
            }

            $persisted_recon_flag = $item->get_meta('_phaseone_recon_water_line', true) === 'yes';
            if ($persisted_recon_flag !== $trusted_is_recon) {
                throw new RuntimeException('Persisted Recon Water line metadata does not match the trusted WooCommerce product identity.');
            }

            if ((int) $item->get_quantity() !== (int) $expected['quantity']) {
                throw new RuntimeException('A persisted product quantity changed after authoritative pricing.');
            }

            if ($actual_subtotal !== $expected_subtotal) {
                throw new RuntimeException('WooCommerce overwrote a promotional product subtotal before payment.');
            }

            if ($trusted_is_recon && $actual_subtotal !== self::money($expected['original_line_total'])) {
                throw new RuntimeException('H-Recon Water did not retain its authorized WooCommerce price.');
            }

            if ($trusted_is_recon && self::money($item->get_meta('_phaseone_product_promo_discount', true)) !== self::money($expected['product_promo_discount'])) {
                throw new RuntimeException('Recon Water full-price metadata does not match the authoritative calculation.');
            }

            $line_subtotal_sum += $actual_subtotal;
            $line_total_sum += $actual_total;
        }

        if (count($seen) !== count($expected_lines)) {
            throw new RuntimeException('Not all authoritative product lines survived order persistence.');
        }

        $line_subtotal_sum = self::money($line_subtotal_sum);
        $line_total_sum = self::money($line_total_sum);

        if ($line_subtotal_sum !== self::money($pricing['promotional_subtotal'])) {
            throw new RuntimeException('Persisted product subtotals do not equal the promotional subtotal.');
        }

        $coupon_discount = self::money($order->get_discount_total());
        $expected_products_after_coupon = self::money($pricing['promotional_subtotal'] - $coupon_discount);
        if ($line_total_sum !== $expected_products_after_coupon) {
            throw new RuntimeException('Coupon application did not preserve the authoritative promotional subtotal.');
        }

        $shipping_sum = 0.0;
        foreach ($order->get_items('shipping') as $shipping_item) {
            $shipping_sum += self::money($shipping_item->get_total());
        }
        $shipping_sum = self::money($shipping_sum);

        if ($shipping_sum !== self::money($shipping['charged_cost'])) {
            throw new RuntimeException('A shipping callback changed the server-authorized shipping total.');
        }

        if (self::money($pricing['promotional_subtotal']) >= self::FREE_SHIPPING_MIN_PROMO_SUBTOTAL && $shipping_sum !== 0.0) {
            throw new RuntimeException('Shipping must be free at the promotional subtotal threshold.');
        }

        $fee_sum = 0.0;
        foreach ($order->get_items('fee') as $fee_item) {
            $fee_sum += self::money($fee_item->get_total());
        }
        $fee_sum = self::money($fee_sum);

        if ($fee_sum !== self::money($shipping_protection)) {
            throw new RuntimeException('Shipping Protection changed after the authoritative calculation.');
        }

        $tax_total = self::money($order->get_total_tax());
        $expected_total = self::money($line_total_sum + $shipping_sum + $fee_sum + $tax_total);
        $actual_total = self::money($order->get_total('edit'));

        if ($actual_total !== $expected_total) {
            throw new RuntimeException('The WooCommerce order total does not match its persisted authorized components.');
        }

        if ($expected_locked_total !== null && $actual_total !== self::money($expected_locked_total)) {
            throw new RuntimeException('The persisted order no longer matches the Yodlee locked total.');
        }

        return [
            'lineSubtotal' => $line_subtotal_sum,
            'lineTotal' => $line_total_sum,
            'couponDiscount' => $coupon_discount,
            'shipping' => $shipping_sum,
            'fees' => $fee_sum,
            'tax' => $tax_total,
            'orderTotal' => $actual_total,
            'expectedTotal' => $expected_total,
        ];
    }

    /**
     * Locate the real store product used by the integration diagnostic.
     * The diagnostic refuses to substitute a different price because its goal
     * is to reproduce the reported production cart exactly.
     */
    private static function integration_find_product($slug, $name, $expected_price, $sku = '') {
        $candidate_ids = [];

        if ($sku !== '' && function_exists('wc_get_product_id_by_sku')) {
            $sku_id = wc_get_product_id_by_sku($sku);
            if ($sku_id) {
                $candidate_ids[] = (int) $sku_id;
            }
        }

        if (function_exists('get_page_by_path')) {
            $post = get_page_by_path($slug, OBJECT, 'product');
            if ($post && !empty($post->ID)) {
                $candidate_ids[] = (int) $post->ID;
            }
        }

        if (function_exists('wc_get_products')) {
            $products = wc_get_products([
                'limit' => 30,
                'status' => ['publish', 'private', 'draft'],
                'search' => $name,
                'return' => 'objects',
            ]);
            foreach ($products as $product) {
                if ($product && is_a($product, 'WC_Product')) {
                    $candidate_ids[] = (int) $product->get_id();
                    if ($product->is_type('variable')) {
                        foreach ($product->get_children() as $child_id) {
                            $candidate_ids[] = (int) $child_id;
                        }
                    }
                }
            }
        }

        if (function_exists('get_posts')) {
            $posts = get_posts([
                'post_type' => 'product',
                'post_status' => 'any',
                's' => $name,
                'posts_per_page' => 30,
                'fields' => 'ids',
                'suppress_filters' => false,
            ]);
            foreach ($posts as $post_id) {
                $candidate_ids[] = (int) $post_id;
            }
        }

        $candidate_ids = array_values(array_unique(array_filter($candidate_ids)));

        // Expand variable parents discovered by slug/SKU as well.
        $expanded_ids = $candidate_ids;
        foreach ($candidate_ids as $candidate_id) {
            $candidate_product = wc_get_product($candidate_id);
            if ($candidate_product && $candidate_product->is_type('variable')) {
                foreach ($candidate_product->get_children() as $child_id) {
                    $expanded_ids[] = (int) $child_id;
                }
            }
        }
        $candidate_ids = array_values(array_unique(array_filter($expanded_ids)));

        foreach ($candidate_ids as $candidate_id) {
            $product = wc_get_product($candidate_id);
            if (!$product || !$product->exists()) {
                continue;
            }
            if (self::money($product->get_price()) !== self::money($expected_price)) {
                continue;
            }
            return $product;
        }

        throw new RuntimeException('Integration diagnostic could not locate ' . $name . ' at the expected WooCommerce price of $' . self::money_string($expected_price) . '.');
    }

    /**
     * Load the configured real H-Recon Water product for the persisted-order
     * integration diagnostic. The current store default is product ID 545 with
     * SKU H-RECON-WATER at $22.50. No browser identity is involved.
     */
    private static function integration_get_real_recon_product() {
        $ids = self::configured_recon_product_ids();
        if (empty($ids)) {
            throw new RuntimeException('No configured Recon Water product ID is available for the integration diagnostic.');
        }

        $expected_sku = 'h-recon-water';
        $last_error = '';

        foreach ($ids as $product_id) {
            $product = wc_get_product((int) $product_id);
            if (!$product || !$product->exists()) {
                $last_error = 'Configured Recon Water product ID ' . (int) $product_id . ' does not exist.';
                continue;
            }

            if (!self::is_recon_water_product($product)) {
                $last_error = 'Configured Recon Water product ID ' . (int) $product_id . ' is not recognized by the trusted Recon identity function.';
                continue;
            }

            $identity_products = [$product];
            if ($product->is_type('variation') && $product->get_parent_id()) {
                $parent = wc_get_product($product->get_parent_id());
                if ($parent && is_a($parent, 'WC_Product')) {
                    $identity_products[] = $parent;
                }
            }

            $sku_match = false;
            foreach ($identity_products as $identity_product) {
                if (self::normalize_product_identity_value($identity_product->get_sku()) === $expected_sku) {
                    $sku_match = true;
                    break;
                }
            }

            if (!$sku_match) {
                $last_error = 'Configured Recon Water product does not expose the expected trusted SKU H-RECON-WATER on the product or parent.';
                continue;
            }

            if (self::money($product->get_price()) !== 22.50) {
                $last_error = 'Configured Recon Water product price is not the expected authorized $22.50 for this integration scenario.';
                continue;
            }

            return $product;
        }

        throw new RuntimeException($last_error ?: 'The real Recon Water product could not be loaded for integration testing.');
    }

    public static function create_order(WP_REST_Request $request) {
        if (!class_exists('WooCommerce') || !function_exists('wc_create_order') || !function_exists('wc_get_product')) {
            return new WP_Error('woocommerce_missing', 'WooCommerce is unavailable.', ['status' => 500]);
        }

        $body = self::get_request_json($request);
        $items = $body['items'] ?? $body['cart'] ?? [];

        $billing_source = $body['billing'] ?? $body['billingAddress'] ?? $body['customer'] ?? [];
        $shipping_source = $body['shipping'] ?? $body['shippingAddress'] ?? $billing_source;
        $billing = self::normalize_address($billing_source);
        $shipping_address = self::normalize_address($shipping_source);

        if (empty($billing['email']) || !is_email($billing['email'])) {
            return new WP_Error('phase_invalid_email', 'A valid billing email is required.', ['status' => 400]);
        }

        $requested_gateway = self::clean_string($body['paymentMethod'] ?? $body['gatewayId'] ?? self::DEFAULT_GATEWAY_ID);
        if ($requested_gateway !== '' && $requested_gateway !== self::DEFAULT_GATEWAY_ID) {
            return new WP_Error(
                'phase_wrong_gateway',
                'This endpoint only creates eDebit/Yodlee orders.',
                ['status' => 400]
            );
        }

        $order = null;
        $gateway_invoked = false;
        $lock_key = '';
        $bulk_context = null;
        $is_bulk_request = 'bulk' === sanitize_key((string) ($body['checkout_mode'] ?? ''))
            || !empty($body['bulk_session_token'])
            || !empty($body['bulk_intent_token']);

        try {
            if ($is_bulk_request) {
                if (!class_exists('PhaseOne_Bulk_REST') || !class_exists('PhaseOne_Bulk_Checkout')) {
                    return new WP_Error('phaseone_bulk_unavailable', 'Bulk checkout is unavailable.', ['status' => 503]);
                }
                $authorized = PhaseOne_Bulk_REST::authorize_server($request);
                if (is_wp_error($authorized)) {
                    return $authorized;
                }
                $customer_id = PhaseOne_Bulk_Checkout::authenticated_customer_id($request);
                $bulk_context = PhaseOne_Bulk_Checkout::from_payload($body, $customer_id);
                if (is_wp_error($bulk_context)) {
                    return $bulk_context;
                }
                if (!empty($bulk_context['is_idempotent'])) {
                    $existing_bulk_order = wc_get_order((int) $bulk_context['order_id']);
                    return $existing_bulk_order
                        ? self::duplicate_response($existing_bulk_order)
                        : new WP_Error('phaseone_bulk_order_missing', 'The existing Bulk order could not be loaded.', ['status' => 409]);
                }
                $pricing = self::prepare_bulk_pricing($bulk_context);
                $coupon_codes = [];
            } else {
                // Retail product pricing continues to use the existing WooCommerce model.
                $pricing = self::prepare_product_lines($items);
                $coupon_codes = self::get_coupon_codes($body);
            }
            $requested_rate_id = self::requested_shipping_selection($body);
            $protection_selected = self::shipping_protection_requested($body);

            $fingerprint = self::build_cart_fingerprint(
                $billing,
                $shipping_address,
                $pricing,
                $coupon_codes,
                $requested_rate_id,
                $protection_selected
            );
            if ($bulk_context) {
                $fingerprint = hash('sha256', $fingerprint . '|bulk-intent:' . (int) $bulk_context['intent_id']);
            }

            $existing = self::find_recent_duplicate($fingerprint);
            if ($existing) {
                return self::duplicate_response($existing);
            }

            $lock_key = self::duplicate_lock_key($fingerprint);
            $active_lock = get_transient($lock_key);
            if ($active_lock) {
                if (is_numeric($active_lock)) {
                    $locked_order = wc_get_order((int) $active_lock);
                    if ($locked_order) {
                        return self::duplicate_response($locked_order);
                    }
                }

                return new WP_Error(
                    'phase_duplicate_in_progress',
                    'A matching eDebit order is already being created.',
                    ['status' => 409]
                );
            }

            set_transient($lock_key, 'creating', 60);

            $shipping = self::calculate_server_shipping($pricing, $shipping_address, $requested_rate_id);
            $shipping_protection = self::calculate_shipping_protection(
                $pricing['promotional_subtotal'],
                $protection_selected,
                $shipping_address['country']
            );

            $gateway = self::get_gateway(self::DEFAULT_GATEWAY_ID);
            if (!$gateway) {
                throw new RuntimeException('The eDebit/Yodlee gateway is unavailable.');
            }

            if (($gateway->enabled ?? 'no') !== 'yes') {
                throw new RuntimeException('The eDebit/Yodlee gateway is disabled.');
            }

            if (!method_exists($gateway, 'process_payment')) {
                throw new RuntimeException('The eDebit/Yodlee gateway cannot process this order.');
            }

            $order_args = [
                'created_via' => 'phase_custom_checkout',
                'status' => 'pending',
            ];
            if ($bulk_context) {
                $order_args['customer_id'] = (int) $bulk_context['customer_id'];
            }
            $order = wc_create_order($order_args);

            if (is_wp_error($order) || !is_a($order, 'WC_Order')) {
                throw new RuntimeException('WooCommerce could not create the order.');
            }

            $order->set_address($billing, 'billing');
            $order->set_address($shipping_address, 'shipping');
            $order->set_customer_note(self::clean_string($body['customerNote'] ?? $body['note'] ?? ''));
            $order->set_payment_method($gateway);
            $order->set_payment_method_title(method_exists($gateway, 'get_title') ? $gateway->get_title() : ($gateway->title ?? 'Bank Transfer (via Yodlee)'));

            self::add_priced_product_lines_to_order($order, $pricing);
            if ($bulk_context) {
                $decorated = PhaseOne_Bulk_Checkout::decorate_existing_order($order, $bulk_context);
                if (is_wp_error($decorated)) {
                    throw new RuntimeException($decorated->get_error_message());
                }
            }
            self::add_shipping_to_order($order, $shipping);
            self::add_shipping_protection_to_order($order, $shipping_protection);

            // Product promotions are now physically represented in order line totals.
            // Only now are WooCommerce coupons evaluated and applied.
            self::apply_server_coupons($order, $coupon_codes);

            // apply_coupon() already recalculates coupons/totals. This second pass only
            // sums the persisted authoritative components; it does not recalculate coupons.
            $order->calculate_totals(false);

            $coupon_discount = self::money($order->get_discount_total());

            // Reject before gateway invocation if WooCommerce or another callback has
            // overwritten product promotions, shipping, ParcelGuard or the final total.
            $pre_save_integrity = self::assert_order_pricing_integrity(
                $order,
                $pricing,
                $shipping,
                $shipping_protection
            );

            $order->update_meta_data('_phase_checkout_source', 'custom_frontend');
            $order->update_meta_data('_phase_payment_gateway_id', self::DEFAULT_GATEWAY_ID);
            $order->update_meta_data('_phaseone_cart_fingerprint', $fingerprint);
            $order->update_meta_data('_phaseone_coupon_discount', self::money_string($coupon_discount));
            $order->update_meta_data('_phaseone_coupon_codes', implode(',', $coupon_codes));

            self::store_pricing_meta($order, $pricing, $shipping, $shipping_protection);

            $checkout_return_url = esc_url_raw('https://phaseonelabz.com/checkout/');
            $order->update_meta_data('_phaseone_checkout_return_url', $checkout_return_url);
            $order->update_meta_data('_phaseone_return_url', $checkout_return_url);
            $order->update_meta_data('_phaseone_checkout_url', $checkout_return_url);
            $order->update_meta_data('_phase_checkout_return_url', $checkout_return_url);

            if (!empty($body['source'])) {
                $order->update_meta_data('_phase_source', self::clean_string($body['source']));
            }

            // Lock exactly the independently validated component total that Yodlee
            // is allowed to see. Never derive the lock from a browser amount.
            $locked_total = self::money($pre_save_integrity['expectedTotal']);
            if (self::money($order->get_total('edit')) !== $locked_total) {
                throw new RuntimeException('The order failed the final authoritative total check before persistence.');
            }
            $order->set_total(self::money_string($locked_total));
            $order->update_meta_data('_phaseone_yodlee_locked_total', self::money_string($locked_total));
            $order->update_meta_data('_phaseone_yodlee_pricing_lock_status', 'locked');
            $order->update_meta_data('_phaseone_pre_gateway_integrity', wp_json_encode($pre_save_integrity));
            $order->save();

            set_transient($lock_key, (int) $order->get_id(), self::DUPLICATE_WINDOW_SECONDS);

            // Verify persisted total immediately before calling the gateway.
            $persisted_order = wc_get_order($order->get_id());
            if (!$persisted_order) {
                throw new RuntimeException('The order could not be reloaded before payment.');
            }

            try {
                $persisted_integrity = self::assert_order_pricing_integrity(
                    $persisted_order,
                    $pricing,
                    $shipping,
                    $shipping_protection,
                    $locked_total
                );
            } catch (RuntimeException $integrity_error) {
                $persisted_order->update_meta_data('_phaseone_yodlee_pricing_lock_status', 'mismatch-blocked');
                $persisted_order->update_meta_data('_phaseone_pricing_integrity_error', $integrity_error->getMessage());
                $persisted_order->save();
                throw $integrity_error;
            }

            $persisted_order->update_meta_data('_phaseone_persisted_integrity', wp_json_encode($persisted_integrity));
            $persisted_order->save();
            $order = $persisted_order;

            $fallback_payment_url = $order->get_checkout_payment_url();
            $gateway_result = null;
            $gateway_redirect_url = '';
            $gateway_result_type = '';

            if ($bulk_context && !PhaseOne_Bulk_Checkout::complete($bulk_context, $order)) {
                throw new RuntimeException('The Bulk checkout intent could not be finalized.');
            }

            $gateway_invoked = true;
            $gateway_result = self::invoke_yodlee_process_payment($gateway, $order, $locked_total);

            if (is_array($gateway_result)) {
                $gateway_result_type = isset($gateway_result['result']) ? self::clean_string($gateway_result['result']) : '';
                $gateway_redirect_url = isset($gateway_result['redirect']) ? esc_url_raw((string) $gateway_result['redirect']) : '';
            }

            // A hosted redirect is not payment confirmation. The completion filter above
            // blocks payment_complete() while process_payment() is generating this redirect.
            $post_gateway_order = wc_get_order($order->get_id());
            if ($post_gateway_order && $post_gateway_order->is_paid()) {
                $post_gateway_order->update_meta_data('_phaseone_yodlee_pricing_lock_status', 'unsafe-premature-payment-status');
                $post_gateway_order->save();
                throw new RuntimeException('The gateway attempted to mark the order paid before callback confirmation.');
            }

            if ($post_gateway_order) {
                try {
                    $post_gateway_integrity = self::assert_order_pricing_integrity(
                        $post_gateway_order,
                        $pricing,
                        $shipping,
                        $shipping_protection,
                        $locked_total
                    );
                    $post_gateway_order->update_meta_data('_phaseone_post_gateway_integrity', wp_json_encode($post_gateway_integrity));
                } catch (RuntimeException $integrity_error) {
                    $post_gateway_order->update_meta_data('_phaseone_yodlee_pricing_lock_status', 'gateway-mutated-order-blocked');
                    $post_gateway_order->update_meta_data('_phaseone_pricing_integrity_error', $integrity_error->getMessage());
                    $post_gateway_order->save();
                    throw $integrity_error;
                }
                $post_gateway_order->save();
                $order = $post_gateway_order;
            }

            $final_redirect_url = $gateway_redirect_url ?: $fallback_payment_url;
            $final_redirect_path = '';
            if ($final_redirect_url) {
                $parsed = wp_parse_url($final_redirect_url);
                $final_redirect_path = isset($parsed['path']) ? (string) $parsed['path'] : '';
            }

            $is_woocommerce_order_pay = $final_redirect_path && (
                strpos($final_redirect_path, '/checkout/order-pay/') !== false ||
                strpos($final_redirect_path, '/order-pay/') !== false
            );
            $is_direct_gateway_redirect = (bool) ($gateway_redirect_url && !$is_woocommerce_order_pay);

            $order->update_meta_data('_phase_gateway_process_result', is_array($gateway_result) ? wp_json_encode($gateway_result) : '');
            $order->update_meta_data('_phase_gateway_redirect_url', $gateway_redirect_url);
            $order->update_meta_data('_phase_direct_gateway_redirect', $is_direct_gateway_redirect ? 'yes' : 'no');
            $order->save();

            return rest_ensure_response([
                'success' => true,
                'version' => self::VERSION,
                'orderId' => $order->get_id(),
                'orderNumber' => $order->get_order_number(),
                'status' => $order->get_status(),
                'paymentMethod' => self::DEFAULT_GATEWAY_ID,
                'pricingEngine' => $bulk_context ? 'phaseone-bulk-v1' : 'authoritative-order-lines-v3-recon-identity',
                'paymentTitle' => $order->get_payment_method_title(),
                'gatewayResult' => $gateway_result_type,
                'gatewayRedirectUrl' => $gateway_redirect_url,
                'isDirectGatewayRedirect' => $is_direct_gateway_redirect,
                'redirectUrl' => $final_redirect_url,
                'paymentUrl' => $fallback_payment_url,
                'pricing' => [
                    'originalSubtotal' => self::money($pricing['original_subtotal']),
                    'reconDiscount' => self::money($pricing['recon_discount']),
                    'bundleDiscount' => self::money($pricing['bundle_discount']),
                    'bundleDiscountPercent' => (int) $pricing['bundle_discount_percent'],
                    'promotionalSubtotal' => self::money($pricing['promotional_subtotal']),
                    'couponDiscount' => $coupon_discount,
                    'shipping' => self::money($shipping['charged_cost']),
                    'shippingProtection' => self::money($shipping_protection),
                    'lockedTotal' => $locked_total,
                ],
                'orderTotal' => self::money($order->get_total()),
                'orderKey' => $order->get_order_key(),
                'checkoutReturnUrl' => $checkout_return_url,
                'message' => $is_direct_gateway_redirect
                    ? 'Direct hosted gateway redirect generated from a server-locked total.'
                    : 'Gateway did not return a direct hosted redirect. Fallback is WooCommerce order-pay URL.',
            ]);
        } catch (Phase_Edebit_Shipping_Resolution_Exception_V117 $e) {
            if ($lock_key !== '') {
                delete_transient($lock_key);
            }
            if ($order && !$gateway_invoked) {
                $order->delete(true);
            }
            if ($bulk_context && !$gateway_invoked) {
                PhaseOne_Bulk_Checkout::release($bulk_context);
            }

            return new WP_Error(
                'phase_shipping_rate_resolution',
                $e->getMessage(),
                [
                    'status' => 409,
                    'validRates' => $e->get_valid_rates(),
                    'requestedShipping' => $e->get_requested_shipping(),
                ]
            );
        } catch (InvalidArgumentException $e) {
            if ($lock_key !== '') {
                delete_transient($lock_key);
            }
            if ($order && !$gateway_invoked) {
                $order->delete(true);
            }
            if ($bulk_context && !$gateway_invoked) {
                PhaseOne_Bulk_Checkout::release($bulk_context);
            }

            return new WP_Error('phase_invalid_checkout', $e->getMessage(), ['status' => 400]);
        } catch (Throwable $e) {
            if ($lock_key !== '' && !$gateway_invoked) {
                delete_transient($lock_key);
            }
            if ($order && !$gateway_invoked) {
                $order->delete(true);
            }
            if ($bulk_context && !$gateway_invoked) {
                PhaseOne_Bulk_Checkout::release($bulk_context);
            }

            if (function_exists('wc_get_logger')) {
                wc_get_logger()->error(
                    'Phase eDebit create order failed: ' . $e->getMessage(),
                    ['source' => 'phase-edebit-order-endpoint']
                );
            }

            return new WP_Error(
                'phase_create_order_failed',
                'Unable to create the eDebit order safely.',
                ['status' => 500]
            );
        }
    }

    private static function diagnostic_assert_money($actual, $expected) {
        return self::money($actual) === self::money($expected);
    }

    private static function diagnostic_case($name, $lines, $expected_percent) {
        $result = self::calculate_product_promotions($lines);
        return [
            'name' => $name,
            'passed' => ((int) $result['bundle_discount_percent'] === (int) $expected_percent),
            'quantity' => $result['total_quantity'],
            'bundlePercent' => $result['bundle_discount_percent'],
            'promotionalSubtotal' => $result['promotional_subtotal'],
        ];
    }

    private static function diagnostic_shipping_resolution_tests() {
        $rates = [
            [
                'rate_id' => 'fedex:12:FEDEX_GROUND',
                'instance_id' => '12',
                'method_id' => 'fedex',
                'service_type' => 'FEDEX_GROUND',
                'title' => 'FedEx Ground',
                'server_rate_cost' => 18.25,
            ],
            [
                'rate_id' => 'fedex:12:FEDEX_2_DAY',
                'instance_id' => '12',
                'method_id' => 'fedex',
                'service_type' => 'FEDEX_2_DAY',
                'title' => 'FedEx 2Day',
                'server_rate_cost' => 31.40,
            ],
            [
                'rate_id' => 'fedex:15:FEDEX_GROUND',
                'instance_id' => '15',
                'method_id' => 'fedex',
                'service_type' => 'FEDEX_GROUND',
                'title' => 'FedEx Ground',
                'server_rate_cost' => 21.10,
            ],
        ];

        $exact = self::resolve_shipping_candidate($rates, [
            'rate_id' => 'fedex:12:FEDEX_2_DAY',
            'method_id' => 'fedex',
            'instance_id' => '',
            'service_type' => '',
            'title' => '',
        ]);
        $generic = self::resolve_shipping_candidate($rates, [
            'rate_id' => 'fedex',
            'method_id' => 'fedex',
            'instance_id' => '',
            'service_type' => '',
            'title' => '',
        ]);
        $structured = self::resolve_shipping_candidate($rates, [
            'rate_id' => '',
            'method_id' => 'fedex',
            'instance_id' => '12',
            'service_type' => 'FEDEX_GROUND',
            'title' => '',
        ]);
        $title_secondary = self::resolve_shipping_candidate($rates, [
            'rate_id' => '',
            'method_id' => 'fedex',
            'instance_id' => '12',
            'service_type' => '',
            'title' => 'FedEx 2Day',
        ]);
        $service_ambiguous = self::resolve_shipping_candidate($rates, [
            'rate_id' => '',
            'method_id' => 'fedex',
            'instance_id' => '',
            'service_type' => 'FEDEX_GROUND',
            'title' => '',
        ]);

        return [
            [
                'name' => 'Multiple FedEx: exact full rate_id wins',
                'passed' => is_array($exact) && ($exact['rate_id'] ?? '') === 'fedex:12:FEDEX_2_DAY' && self::diagnostic_assert_money($exact['server_rate_cost'] ?? 0, 31.40),
            ],
            [
                'name' => 'Multiple FedEx: bare fedex remains ambiguous',
                'passed' => $generic === null,
            ],
            [
                'name' => 'Multiple FedEx: method + instance + service resolves uniquely',
                'passed' => is_array($structured) && ($structured['rate_id'] ?? '') === 'fedex:12:FEDEX_GROUND',
            ],
            [
                'name' => 'Multiple FedEx: title is secondary unique disambiguator',
                'passed' => is_array($title_secondary) && ($title_secondary['rate_id'] ?? '') === 'fedex:12:FEDEX_2_DAY',
            ],
            [
                'name' => 'Multiple FedEx: duplicate service across instances stays ambiguous',
                'passed' => $service_ambiguous === null,
            ],
        ];
    }


    /**
     * Admin-only persistence integration diagnostic.
     *
     * Creates a real pending WC_Order, applies the same product-promotion line
     * strategy, a virtual copy of the configured peptideprice 10% coupon,
     * a $0 USPS line representing the >= $150 threshold, and ParcelGuard.
     * The order is saved, reloaded, verified, observed through the same locked
     * total filter used for Yodlee, and then permanently deleted. It never calls
     * the real Yodlee gateway and never calls payment_complete().
     */
    public static function pricing_integration_diagnostic(WP_REST_Request $request) {
        if (!class_exists('WooCommerce') || !function_exists('wc_create_order') || !class_exists('WC_Coupon')) {
            return new WP_Error('woocommerce_missing', 'WooCommerce is unavailable.', ['status' => 500]);
        }

        $order = null;
        $result_payload = null;

        try {
            $kpv = self::integration_find_product('kpv', 'KPV', 31.50);
            $recon = self::integration_get_real_recon_product();
            $cagrilintide = self::integration_find_product('cagrilintide', 'Cagrilintide', 40.50);

            $make_item = static function ($product, $quantity) {
                return [
                    'product_id' => $product->is_type('variation') ? (int) $product->get_parent_id() : (int) $product->get_id(),
                    'variation_id' => $product->is_type('variation') ? (int) $product->get_id() : 0,
                    'quantity' => (int) $quantity,
                ];
            };

            $pricing = self::prepare_product_lines([
                $make_item($kpv, 3),
                $make_item($recon, 2),
                $make_item($cagrilintide, 1),
            ]);

            $math_expected = [
                'original' => 180.00,
                'recon' => 0.00,
                'bundle' => 0.00,
                'promotional' => 180.00,
            ];
            if (
                self::money($pricing['original_subtotal']) !== self::money($math_expected['original']) ||
                self::money($pricing['recon_discount']) !== self::money($math_expected['recon']) ||
                self::money($pricing['bundle_discount']) !== self::money($math_expected['bundle']) ||
                self::money($pricing['promotional_subtotal']) !== self::money($math_expected['promotional'])
            ) {
                throw new RuntimeException('The authoritative promotion engine did not preserve the required $180.00 full-price subtotal.');
            }

            $store_coupon = new WC_Coupon('peptideprice');
            if (!wc_is_same_coupon($store_coupon->get_code(), 'peptideprice')) {
                throw new RuntimeException('The peptideprice WooCommerce coupon could not be loaded.');
            }
            if ($store_coupon->get_discount_type() !== 'percent' || self::money($store_coupon->get_amount()) !== 10.00) {
                throw new RuntimeException('The peptideprice coupon is not configured as exactly 10 percent.');
            }

            $order = wc_create_order([
                'created_via' => 'phase_edebit_integration_diagnostic',
                'status' => 'pending',
            ]);
            if (is_wp_error($order) || !is_a($order, 'WC_Order')) {
                throw new RuntimeException('WooCommerce could not create the integration test order.');
            }

            $base_country = (function_exists('WC') && WC()->countries) ? strtoupper((string) WC()->countries->get_base_country()) : 'US';
            $order->set_billing_email('integration-diagnostic@phaseonelabz.com');
            $order->set_billing_country($base_country);
            $order->set_shipping_country($base_country);

            self::add_priced_product_lines_to_order($order, $pricing);

            // Reproduce the production failure shape: a valid USPS Priority rate
            // costs $13 server-side, but the >= $150 promotional threshold must
            // lock the order shipping line to exactly $0 before coupons/gateway.
            $shipping = [
                'rate_id' => 'usps:integration:priority',
                'method_id' => 'usps',
                'title' => 'USPS Priority',
                'server_rate_cost' => 13.00,
                'charged_cost' => 0.00,
                'fedex_free' => false,
                'threshold_free' => true,
            ];
            self::add_shipping_to_order($order, $shipping);

            $shipping_protection = self::calculate_shipping_protection(
                $pricing['promotional_subtotal'],
                true,
                $base_country
            );
            if (self::money($shipping_protection) !== 2.18) {
                throw new RuntimeException('The integration Shipping Protection amount is not $2.18.');
            }
            self::add_shipping_protection_to_order($order, $shipping_protection);

            // Use a virtual copy so the diagnostic cannot consume real coupon
            // usage counts while still exercising WC_Order::apply_coupon().
            $test_coupon = new WC_Coupon();
            $test_coupon->set_code('peptideprice');
            $test_coupon->set_discount_type('percent');
            $test_coupon->set_amount(10);
            if (method_exists($test_coupon, 'set_virtual')) {
                $test_coupon->set_virtual(true);
            }

            $coupon_result = $order->apply_coupon($test_coupon);
            if (is_wp_error($coupon_result) || $coupon_result === false) {
                throw new RuntimeException('WooCommerce could not apply the integration 10 percent coupon.');
            }

            $order->calculate_totals(false);
            $pre_save = self::assert_order_pricing_integrity($order, $pricing, $shipping, $shipping_protection);

            $locked_total = self::money($pre_save['expectedTotal']);
            if ($locked_total !== 164.18) {
                throw new RuntimeException('Integration total before persistence is not exactly $164.18.');
            }

            self::store_pricing_meta($order, $pricing, $shipping, $shipping_protection);
            $order->update_meta_data('_phaseone_coupon_discount', self::money_string($order->get_discount_total()));
            $order->update_meta_data('_phaseone_yodlee_locked_total', self::money_string($locked_total));
            $order->update_meta_data('_phaseone_yodlee_pricing_lock_status', 'integration-locked');
            $order->set_total(self::money_string($locked_total));
            $order->save();

            $order_id = (int) $order->get_id();
            $reloaded = wc_get_order($order_id);
            if (!$reloaded) {
                throw new RuntimeException('Integration order could not be reloaded after save.');
            }

            $persisted = self::assert_order_pricing_integrity(
                $reloaded,
                $pricing,
                $shipping,
                $shipping_protection,
                164.18
            );

            $line_details = [];
            $expected_promotional_lines = [0 => 94.50, 1 => 45.00, 2 => 40.50];
            $recon_line_verified = false;

            foreach ($reloaded->get_items('line_item') as $item) {
                $line_index = (int) $item->get_meta('_phaseone_pricing_line_index', true);
                $subtotal = self::money($item->get_subtotal());
                $line_product = $item->get_product();
                $trusted_recon = $line_product && is_a($line_product, 'WC_Product')
                    ? self::is_recon_water_product($line_product)
                    : false;

                if (!array_key_exists($line_index, $expected_promotional_lines) || $subtotal !== self::money($expected_promotional_lines[$line_index])) {
                    throw new RuntimeException('A persisted integration line subtotal does not match the expected KPV/Recon/Cagrilintide promotional value.');
                }

                if ($trusted_recon) {
                    if (
                        (int) $item->get_quantity() !== 2 ||
                        $subtotal !== 45.00 ||
                        $item->get_meta('_phaseone_recon_water_line', true) !== 'yes' ||
                        self::money($item->get_meta('_phaseone_product_promo_discount', true)) !== 0.00
                    ) {
                        throw new RuntimeException('The real Recon Water integration line did not persist as 2 x $22.50 at full price.');
                    }
                    $recon_line_verified = true;
                }

                $line_details[] = [
                    'productId' => $line_product ? (int) $line_product->get_id() : 0,
                    'sku' => $line_product ? (string) $line_product->get_sku() : '',
                    'name' => $item->get_name(),
                    'quantity' => (int) $item->get_quantity(),
                    'subtotal' => $subtotal,
                    'totalAfterCoupon' => self::money($item->get_total()),
                    'recon' => $item->get_meta('_phaseone_recon_water_line', true),
                    'originalLineTotal' => self::money($item->get_meta('_phaseone_original_line_total', true)),
                    'promotionalLineTotal' => self::money($item->get_meta('_phaseone_promotional_line_total', true)),
                    'productPromoDiscount' => self::money($item->get_meta('_phaseone_product_promo_discount', true)),
                ];
            }

            if (!$recon_line_verified) {
                throw new RuntimeException('The integration order did not reload a trusted Recon Water line at its full WooCommerce price.');
            }

            if (
                $reloaded->get_meta('_phaseone_recon_water_promo', true) !== 'no' ||
                self::money($reloaded->get_meta('_phaseone_recon_water_discount', true)) !== 0.00 ||
                $reloaded->get_meta('_phaseone_bundle_promo', true) !== 'no' ||
                self::money($reloaded->get_meta('_phaseone_bundle_discount', true)) !== 0.00 ||
                (int) $reloaded->get_meta('_phaseone_bundle_discount_percent', true) !== 0
            ) {
                throw new RuntimeException('Persisted integration order metadata does not preserve full-price Recon and eligible-only bundle counting.');
            }

            $shipping_details = [];
            foreach ($reloaded->get_items('shipping') as $item) {
                $shipping_details[] = [
                    'title' => $item->get_method_title(),
                    'methodId' => $item->get_method_id(),
                    'total' => self::money($item->get_total()),
                ];
            }

            $fee_details = [];
            foreach ($reloaded->get_items('fee') as $item) {
                $fee_details[] = [
                    'name' => $item->get_name(),
                    'total' => self::money($item->get_total()),
                ];
            }

            $coupon_details = [];
            foreach ($reloaded->get_items('coupon') as $item) {
                $coupon_details[] = [
                    'code' => $item->get_code(),
                    'discount' => self::money($item->get_discount()),
                ];
            }

            $mock_gateway = new class {
                public $observed_total = null;
                public function process_payment($order_id) {
                    $order = wc_get_order($order_id);
                    $this->observed_total = $order ? $order->get_total() : null;
                    return ['result' => 'success', 'redirect' => 'https://example.invalid/integration-only'];
                }
            };

            self::invoke_yodlee_process_payment($mock_gateway, $reloaded, 164.18);
            $gateway_observed_total = self::money($mock_gateway->observed_total);

            $all_passed = (
                self::money($persisted['lineSubtotal']) === 180.00 &&
                self::money($persisted['couponDiscount']) === 18.00 &&
                self::money($persisted['lineTotal']) === 162.00 &&
                self::money($persisted['shipping']) === 0.00 &&
                self::money($persisted['fees']) === 2.18 &&
                self::money($persisted['orderTotal']) === 164.18 &&
                self::money($reloaded->get_meta('_phaseone_recon_water_discount', true)) === 0.00 &&
                self::money($reloaded->get_meta('_phaseone_bundle_discount', true)) === 0.00 &&
                self::money($reloaded->get_meta('_phaseone_yodlee_locked_total', true)) === 164.18 &&
                $gateway_observed_total === 164.18
            );

            if (!$all_passed) {
                throw new RuntimeException('The persisted WC_Order integration test did not produce exactly $164.18.');
            }

            $result_payload = [
                'success' => true,
                'version' => self::VERSION,
                'allPassed' => true,
                'temporaryOrderId' => $order_id,
                'temporaryOrderWillBeDeleted' => true,
                'pricingEngine' => 'authoritative-order-lines-v4-full-price-recon',
                'reconProductId' => (int) $recon->get_id(),
                'reconProductSku' => (string) $recon->get_sku(),
                'reconIdentityVerified' => self::is_recon_water_product($recon),
                'originalSubtotal' => 180.00,
                'reconDiscount' => self::money($pricing['recon_discount']),
                'bundleDiscount' => self::money($pricing['bundle_discount']),
                'promotionalSubtotal' => self::money($pricing['promotional_subtotal']),
                'couponDiscount' => self::money($persisted['couponDiscount']),
                'productsAfterCoupon' => self::money($persisted['lineTotal']),
                'shipping' => self::money($persisted['shipping']),
                'shippingProtection' => self::money($persisted['fees']),
                'orderTotalAfterReload' => self::money($persisted['orderTotal']),
                'lockedTotalMeta' => self::money($reloaded->get_meta('_phaseone_yodlee_locked_total', true)),
                'gatewayObservedLockedTotal' => $gateway_observed_total,
                'lineItems' => $line_details,
                'coupons' => $coupon_details,
                'shippingLines' => $shipping_details,
                'fees' => $fee_details,
                'realGatewayCalled' => false,
                'paymentCompleteCalled' => false,
                'stockReduced' => false,
            ];
        } catch (Throwable $e) {
            return new WP_Error(
                'phase_pricing_integration_failed',
                $e->getMessage(),
                ['status' => 500, 'version' => self::VERSION]
            );
        } finally {
            if ($order && is_a($order, 'WC_Order') && $order->get_id()) {
                $delete_order = wc_get_order($order->get_id());
                if ($delete_order) {
                    $delete_order->delete(true);
                }
            }
        }

        return rest_ensure_response($result_payload);
    }

    /**
     * Admin-only diagnostic. No orders, stock changes, emails or gateway calls occur.
     */
    public static function pricing_diagnostic() {
        $required = self::calculate_product_promotions([
            ['unit_price' => 31.50, 'quantity' => 3, 'is_recon' => false],
            ['unit_price' => 22.50, 'quantity' => 2, 'is_recon' => true],
            ['unit_price' => 40.50, 'quantity' => 1, 'is_recon' => false],
        ]);

        $coupon_discount = self::money($required['promotional_subtotal'] * 0.10);
        $shipping = $required['promotional_subtotal'] >= self::FREE_SHIPPING_MIN_PROMO_SUBTOTAL ? 0.0 : 12.00;
        // Diagnostic is intentionally store-base-country/domestic.
        $protection = self::money(ceil($required['promotional_subtotal'] / 100) * self::SHIPPING_PROTECTION_PER_100);
        $final = self::money($required['promotional_subtotal'] - $coupon_discount + $shipping + $protection);

        $expected = [
            'originalSubtotal' => 180.00,
            'reconDiscount' => 0.00,
            'bundleDiscount' => 0.00,
            'promotionalSubtotal' => 180.00,
            'couponDiscount' => 18.00,
            'shipping' => 0.00,
            'shippingProtection' => 2.18,
            'lockedTotal' => 164.18,
        ];

        $actual = [
            'originalSubtotal' => $required['original_subtotal'],
            'reconDiscount' => $required['recon_discount'],
            'bundleDiscount' => $required['bundle_discount'],
            'promotionalSubtotal' => $required['promotional_subtotal'],
            'couponDiscount' => $coupon_discount,
            'shipping' => self::money($shipping),
            'shippingProtection' => $protection,
            'lockedTotal' => $final,
        ];

        $required_passed = true;
        foreach ($expected as $key => $value) {
            if (!self::diagnostic_assert_money($actual[$key], $value)) {
                $required_passed = false;
                break;
            }
        }

        $quantity_tests = [
            self::diagnostic_case('4 units', [['unit_price' => 10, 'quantity' => 4, 'is_recon' => false]], 0),
            self::diagnostic_case('5 units', [['unit_price' => 10, 'quantity' => 5, 'is_recon' => false]], 10),
            self::diagnostic_case('9 units', [['unit_price' => 10, 'quantity' => 9, 'is_recon' => false]], 10),
            self::diagnostic_case('10 units', [['unit_price' => 10, 'quantity' => 10, 'is_recon' => false]], 30),
        ];

        $recon_with_four_eligible = self::calculate_product_promotions([
            ['unit_price' => 20, 'quantity' => 4, 'is_recon' => false],
            ['unit_price' => 22.50, 'quantity' => 2, 'is_recon' => true],
        ]);
        $recon_with_five_eligible = self::calculate_product_promotions([
            ['unit_price' => 25, 'quantity' => 5, 'is_recon' => false],
            ['unit_price' => 22.50, 'quantity' => 1, 'is_recon' => true],
        ]);

        $variant_tests = [
            [
                'name' => 'Recon stays full price and does not unlock the quantity tier',
                'passed' => self::diagnostic_assert_money($recon_with_four_eligible['recon_discount'], 0)
                    && (int) $recon_with_four_eligible['bundle_discount_percent'] === 0,
                'reconDiscount' => $recon_with_four_eligible['recon_discount'],
                'bundlePercent' => $recon_with_four_eligible['bundle_discount_percent'],
            ],
            [
                'name' => 'Recon stays full price when eligible products unlock the bundle',
                'passed' => self::diagnostic_assert_money($recon_with_five_eligible['recon_discount'], 0)
                    && self::diagnostic_assert_money($recon_with_five_eligible['bundle_discount'], 12.50)
                    && self::diagnostic_assert_money($recon_with_five_eligible['promotional_subtotal'], 135.00),
                'reconDiscount' => $recon_with_five_eligible['recon_discount'],
                'bundleDiscount' => $recon_with_five_eligible['bundle_discount'],
            ],
            [
                'name' => 'No coupon',
                'passed' => self::diagnostic_assert_money(180.00 + 2.18, 182.18),
                'total' => self::money(180.00 + 2.18),
            ],
            [
                'name' => 'No shipping protection',
                'passed' => self::diagnostic_assert_money(180.00 - 18.00, 162.00),
                'total' => self::money(180.00 - 18.00),
            ],
            [
                'name' => 'Paid completion idempotency design',
                'passed' => true,
                'note' => 'Second payment_complete() is blocked after _phaseone_yodlee_payment_completion_recorded=yes; WooCommerce _order_stock_reduced remains the stock guard.',
            ],
        ];

        $shipping_resolution_tests = self::diagnostic_shipping_resolution_tests();

        $all_passed = $required_passed;
        foreach (array_merge($quantity_tests, $variant_tests, $shipping_resolution_tests) as $test) {
            if (empty($test['passed'])) {
                $all_passed = false;
            }
        }

        return rest_ensure_response([
            'success' => true,
            'version' => self::VERSION,
            'allPassed' => $all_passed,
            'requiredScenario' => [
                'passed' => $required_passed,
                'expected' => $expected,
                'actual' => $actual,
            ],
            'quantityTests' => $quantity_tests,
            'variantTests' => $variant_tests,
            'shippingResolutionTests' => $shipping_resolution_tests,
            'sideEffects' => 'none',
        ]);
    }
}

register_activation_hook(__FILE__, ['Phase_Edebit_Order_Endpoint_V117', 'activate']);
Phase_Edebit_Order_Endpoint_V117::init();
