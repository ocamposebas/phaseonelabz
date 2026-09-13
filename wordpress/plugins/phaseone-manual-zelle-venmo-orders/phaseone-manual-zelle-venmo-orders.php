<?php
/**
 * Plugin Name: Phase One Manual Zelle / Venmo Orders
 * Description: Creates WooCommerce on-hold Zelle/Venmo orders, sends dedicated branded payment instructions, prevents duplicate WooCommerce notifications, and cancels unpaid manual orders after 24 hours.
 * Version: 5.5.0
 * Author: Phase One Labz
 */

if (!defined('ABSPATH')) {
  exit;
}

const PHASEONE_MZV_FREE_SHIPPING_MINIMUM = 50;
const PHASEONE_MZV_STANDARD_SHIPPING_COST = 13;
const PHASEONE_MZV_CANCEL_HOURS = 24;
const PHASEONE_MZV_VENMO_URL = 'https://venmo.com/code?user_id=4599396356327117666&created=1782763350.789482&printed=1';
const PHASEONE_MZV_ZELLE_RECIPIENT = 'Info@phaseonelabz.com';
const PHASEONE_MZV_BRAND_NAME = 'Phase One Labz';

add_action('before_woocommerce_init', static function () {
  if (class_exists(Automattic\WooCommerce\Utilities\FeaturesUtil::class)) {
    Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility('custom_order_tables', __FILE__, true);
  }
});

add_action('rest_api_init', function () {
  register_rest_route('phase/v1', '/manual-payment-order', array(
    'methods'             => WP_REST_Server::CREATABLE,
    'callback'            => 'phaseone_mzv_manual_payment_order_endpoint',
    'permission_callback' => '__return_true',
  ));

  register_rest_route('phase/v1', '/manual-payment-order-details', array(
    'methods'             => WP_REST_Server::READABLE,
    'callback'            => 'phaseone_mzv_manual_payment_order_details_endpoint',
    'permission_callback' => '__return_true',
  ));
});

function phaseone_mzv_clean_text($value) {
  return sanitize_text_field(wp_unslash($value ?? ''));
}

function phaseone_mzv_clean_email($value) {
  return sanitize_email(wp_unslash($value ?? ''));
}

function phaseone_mzv_get_param($params, $camel, $snake = '') {
  if (isset($params[$camel])) {
    return $params[$camel];
  }

  if ($snake && isset($params[$snake])) {
    return $params[$snake];
  }

  return null;
}

/**
 * Read coupon codes sent by the custom checkout.
 *
 * Older checkout builds send couponCodes[], while other builds send a single
 * couponCode or coupon value. Supporting all of them keeps the REST endpoint
 * backwards compatible.
 */
function phaseone_mzv_get_coupon_codes($params) {
  $raw_codes = phaseone_mzv_get_param($params, 'couponCodes', 'coupon_codes');

  if ($raw_codes === null || $raw_codes === '' || $raw_codes === array()) {
    foreach (array('couponCode', 'coupon_code', 'coupon') as $key) {
      if (isset($params[$key]) && $params[$key] !== '') {
        $raw_codes = $params[$key];
        break;
      }
    }
  }

  if ($raw_codes === null || $raw_codes === '') {
    return array();
  }

  if (!is_array($raw_codes)) {
    $raw_codes = preg_split('/\s*,\s*/', (string) $raw_codes);
  }

  $coupon_codes = array();

  foreach ($raw_codes as $raw_code) {
    // Also accept objects such as { code: "vialtalk" } from the frontend.
    if (is_array($raw_code)) {
      $raw_code = $raw_code['code'] ?? $raw_code['couponCode'] ?? $raw_code['coupon'] ?? '';
    }

    if (!is_scalar($raw_code)) {
      continue;
    }

    $code = function_exists('wc_format_coupon_code')
      ? wc_format_coupon_code(wp_unslash((string) $raw_code))
      : sanitize_text_field(wp_unslash((string) $raw_code));

    if ($code !== '') {
      $coupon_codes[] = $code;
    }
  }

  return array_values(array_unique($coupon_codes));
}

/**
 * Apply coupons through WooCommerce so they are stored as real coupon lines.
 * Coupon Affiliates can only attribute the order when the coupon is stored
 * this way (a negative fee named "Coupon discount" is not a coupon).
 */
function phaseone_mzv_apply_real_coupons($order, $coupon_codes) {
  $result = array(
    'applied' => array(),
    'errors'  => array(),
  );

  foreach ((array) $coupon_codes as $coupon_code) {
    $applied = $order->apply_coupon($coupon_code);

    if (is_wp_error($applied)) {
      $result['errors'][$coupon_code] = $applied->get_error_message();
      continue;
    }

    $result['applied'][] = $coupon_code;
  }

  return $result;
}

function phaseone_mzv_allowed_method($method) {
  $method = sanitize_key((string) $method);
  return in_array($method, array('venmo', 'zelle'), true) ? $method : '';
}

function phaseone_mzv_payment_id($method) {
  $method = phaseone_mzv_allowed_method($method);
  return $method ? 'phaseone_' . $method : '';
}

function phaseone_mzv_manual_payment_ids() {
  return array('phaseone_venmo', 'phaseone_zelle');
}

function phaseone_mzv_is_manual_payment_order($order) {
  if (!$order || !is_a($order, 'WC_Order')) {
    return false;
  }

  return in_array($order->get_payment_method(), phaseone_mzv_manual_payment_ids(), true)
    || $order->get_meta('_phaseone_manual_payment_order') === 'yes';
}

function phaseone_mzv_method_title($method_or_payment_id) {
  $value = sanitize_key((string) $method_or_payment_id);
  return in_array($value, array('zelle', 'phaseone_zelle'), true) ? 'Zelle' : 'Venmo';
}

function phaseone_mzv_payment_details($payment_id_or_method) {
  $value = sanitize_key((string) $payment_id_or_method);

  if (in_array($value, array('zelle', 'phaseone_zelle'), true)) {
    return array(
      'method'          => 'zelle',
      'payment_id'      => 'phaseone_zelle',
      'title'           => 'Zelle',
      'recipient_label' => 'Send Zelle to',
      'recipient'       => PHASEONE_MZV_ZELLE_RECIPIENT,
      'recipient_extra' => PHASEONE_MZV_BRAND_NAME,
      'button_url'      => '',
      'button_label'    => '',
    );
  }

  return array(
    'method'          => 'venmo',
    'payment_id'      => 'phaseone_venmo',
    'title'           => 'Venmo',
    'recipient_label' => 'Open Venmo / send to',
    'recipient'       => PHASEONE_MZV_BRAND_NAME,
    'recipient_extra' => '',
    'button_url'      => PHASEONE_MZV_VENMO_URL,
    'button_label'    => 'Open Venmo',
  );
}

function phaseone_mzv_payment_reference($order) {
  if (!$order || !is_a($order, 'WC_Order')) {
    return '';
  }

  $existing = (string) $order->get_meta('_phaseone_payment_reference');
  if ($existing !== '') {
    return strtoupper(preg_replace('/[^A-Z0-9-]/', '', $existing));
  }

  $number = preg_replace('/[^0-9]/', '', (string) $order->get_order_number());
  if (!$number) {
    $number = (string) $order->get_id();
  }

  return 'PO-' . $number;
}

function phaseone_mzv_save_payment_reference($order) {
  if (!$order || !is_a($order, 'WC_Order')) {
    return '';
  }

  $reference = phaseone_mzv_payment_reference($order);
  if ($reference) {
    $order->update_meta_data('_phaseone_payment_reference', $reference);
    $order->update_meta_data('_phaseone_manual_payment_reference', $reference);
  }

  return $reference;
}

function phaseone_mzv_clear_order_items($order) {
  foreach (array('line_item', 'shipping', 'fee', 'coupon') as $type) {
    foreach ($order->get_items($type) as $item_id => $item) {
      $order->remove_item($item_id);
    }
  }
}

function phaseone_mzv_set_address($order, $data, $type) {
  $data = is_array($data) ? $data : array();

  $address = array(
    'first_name' => phaseone_mzv_clean_text($data['first_name'] ?? $data['firstName'] ?? ''),
    'last_name'  => phaseone_mzv_clean_text($data['last_name'] ?? $data['lastName'] ?? ''),
    'company'    => phaseone_mzv_clean_text($data['company'] ?? ''),
    'email'      => phaseone_mzv_clean_email($data['email'] ?? ''),
    'phone'      => phaseone_mzv_clean_text($data['phone'] ?? ''),
    'address_1'  => phaseone_mzv_clean_text($data['address_1'] ?? $data['address1'] ?? ''),
    'address_2'  => phaseone_mzv_clean_text($data['address_2'] ?? $data['address2'] ?? ''),
    'city'       => phaseone_mzv_clean_text($data['city'] ?? ''),
    'state'      => phaseone_mzv_clean_text($data['state'] ?? ''),
    'postcode'   => phaseone_mzv_clean_text($data['postcode'] ?? $data['postalCode'] ?? $data['zip'] ?? ''),
    'country'    => phaseone_mzv_clean_text($data['country'] ?? 'US'),
  );

  $order->set_address($address, $type);
}

function phaseone_mzv_export_address($order, $type = 'shipping') {
  if (!$order || !is_a($order, 'WC_Order')) {
    return array();
  }

  $prefix = $type === 'billing' ? 'billing' : 'shipping';

  return array(
    'first_name' => $order->{"get_{$prefix}_first_name"}(),
    'last_name'  => $order->{"get_{$prefix}_last_name"}(),
    'company'    => $order->{"get_{$prefix}_company"}(),
    'email'      => $prefix === 'billing' ? $order->get_billing_email() : '',
    'phone'      => $prefix === 'billing' ? $order->get_billing_phone() : $order->get_shipping_phone(),
    'address_1'  => $order->{"get_{$prefix}_address_1"}(),
    'address_2'  => $order->{"get_{$prefix}_address_2"}(),
    'city'       => $order->{"get_{$prefix}_city"}(),
    'state'      => $order->{"get_{$prefix}_state"}(),
    'postcode'   => $order->{"get_{$prefix}_postcode"}(),
    'country'    => $order->{"get_{$prefix}_country"}(),
  );
}

function phaseone_mzv_address_text($order, $type = 'shipping') {
  $address = phaseone_mzv_export_address($order, $type);
  $name = trim(($address['first_name'] ?? '') . ' ' . ($address['last_name'] ?? ''));
  $city_line = trim(implode(', ', array_filter(array(
    $address['city'] ?? '',
    $address['state'] ?? '',
    $address['postcode'] ?? '',
  ))));

  return array_values(array_filter(array(
    $name,
    $address['address_1'] ?? '',
    $address['address_2'] ?? '',
    $city_line,
    $address['country'] ?? '',
    $address['phone'] ?? '',
  )));
}

function phaseone_mzv_money($value, $fallback = 0) {
  if ($value === null || $value === '') {
    return (float) $fallback;
  }

  if (is_numeric($value)) {
    return (float) $value;
  }

  $clean = preg_replace('/[^0-9.\-]/', '', (string) $value);
  return is_numeric($clean) ? (float) $clean : (float) $fallback;
}

function phaseone_mzv_item_line_total($item, $quantity, $product = null) {
  foreach (array('line_total', 'lineTotal', 'total', 'subtotal', 'row_total', 'rowTotal') as $key) {
    if (isset($item[$key]) && phaseone_mzv_money($item[$key], 0) > 0) {
      return round(max(0, phaseone_mzv_money($item[$key], 0)), 2);
    }
  }

  $price = 0;
  foreach (array('price', 'unit_price', 'unitPrice', 'sale_price', 'salePrice', 'regular_price', 'regularPrice') as $key) {
    if (isset($item[$key]) && phaseone_mzv_money($item[$key], 0) > 0) {
      $price = phaseone_mzv_money($item[$key], 0);
      break;
    }
  }

  if ($price <= 0 && $product) {
    $price = phaseone_mzv_money($product->get_price(), 0);
  }

  return round(max(0, $price * max(1, $quantity)), 2);
}

function phaseone_mzv_add_products($order, $items) {
  $items = is_array($items) ? $items : array();

  foreach ($items as $item) {
    if (!is_array($item)) {
      continue;
    }

    $product_id   = absint($item['product_id'] ?? $item['productId'] ?? 0);
    $variation_id = absint($item['variation_id'] ?? $item['variationId'] ?? 0);
    $quantity     = max(1, absint($item['quantity'] ?? 1));
    $product      = wc_get_product($variation_id ?: $product_id);
    $line_total   = phaseone_mzv_item_line_total($item, $quantity, $product);

    $args = array(
      'subtotal' => $line_total,
      'total'    => $line_total,
    );

    if (!empty($item['variation']) && is_array($item['variation'])) {
      $args['variation'] = array_map('phaseone_mzv_clean_text', $item['variation']);
    }

    if ($product) {
      $order->add_product($product, $quantity, $args);
      continue;
    }

    $fallback_name = phaseone_mzv_clean_text($item['name'] ?? $item['title'] ?? $item['product_name'] ?? 'Custom item');

    if (!$fallback_name) {
      continue;
    }

    $order_item = new WC_Order_Item_Product();
    $order_item->set_name($fallback_name);
    $order_item->set_quantity($quantity);
    $order_item->set_subtotal($line_total);
    $order_item->set_total($line_total);
    $order->add_item($order_item);
  }
}

function phaseone_mzv_add_shipping($order, $params) {
  $shipping_total = (float) phaseone_mzv_get_param($params, 'shippingTotal', 'shipping_total');
  $shipping_total = max(0, round($shipping_total, 2));

  $free_applied = (bool) phaseone_mzv_get_param($params, 'freeShippingApplied', 'free_shipping_applied');

  if ($free_applied || $shipping_total <= 0) {
    $title = 'Free Shipping';
    $method_id = 'free_shipping';
    $shipping_total = 0;
  } else {
    $title = 'Standard Shipping';
    $method_id = 'flat_rate';
  }

  $shipping = new WC_Order_Item_Shipping();
  $shipping->set_method_title($title);
  $shipping->set_method_id($method_id);
  $shipping->set_total($shipping_total);
  $order->add_item($shipping);
}

/**
 * Preserve the current Zelle shipping behavior for Bulk while deriving the
 * decision exclusively from the authoritative Bulk merchandise subtotal.
 */
function phaseone_mzv_add_bulk_shipping($order, $bulk_subtotal) {
  $free_minimum = max(0, (float) apply_filters('phaseone_mzv_bulk_free_shipping_minimum', 150.0, $order));
  $standard_cost = max(0, (float) apply_filters('phaseone_mzv_bulk_standard_shipping_cost', PHASEONE_MZV_STANDARD_SHIPPING_COST, $order));
  $is_free = $free_minimum > 0 && (float) $bulk_subtotal >= $free_minimum;

  $shipping = new WC_Order_Item_Shipping();
  $shipping->set_method_title($is_free ? 'Free Shipping' : 'Standard Shipping');
  $shipping->set_method_id($is_free ? 'free_shipping' : 'flat_rate');
  $shipping->set_total($is_free ? 0 : round($standard_cost, 2));
  $order->add_item($shipping);

  $order->update_meta_data('_phaseone_manual_payment_free_shipping_minimum', $free_minimum);
  $order->update_meta_data('_phaseone_manual_payment_shipping_cost', $is_free ? 0 : round($standard_cost, 2));
}

function phaseone_mzv_add_negative_fee($order, $name, $amount) {
  $amount = round((float) $amount, 2);

  if ($amount <= 0) {
    return;
  }

  $fee = new WC_Order_Item_Fee();
  $fee->set_name($name);
  $fee->set_amount(-$amount);
  $fee->set_total(-$amount);
  $fee->set_tax_status('none');
  $order->add_item($fee);
}

function phaseone_mzv_schedule_cancel($order, $hours = PHASEONE_MZV_CANCEL_HOURS) {
  if (!$order || !is_a($order, 'WC_Order')) {
    return 0;
  }

  $hours = max(1, min(72, absint($hours ?: PHASEONE_MZV_CANCEL_HOURS)));
  $expires_at = time() + ($hours * HOUR_IN_SECONDS);
  $order_id = $order->get_id();

  $order->update_meta_data('_phaseone_manual_payment_expires_at', $expires_at);
  $order->update_meta_data('_phaseone_manual_payment_expires_at_iso', gmdate('c', $expires_at));

  wp_clear_scheduled_hook('phaseone_mzv_cancel_unpaid_manual_order', array($order_id));
  wp_schedule_single_event($expires_at, 'phaseone_mzv_cancel_unpaid_manual_order', array($order_id));

  return $expires_at;
}

function phaseone_mzv_get_reusable_order($order_id) {
  $order_id = absint($order_id);
  if (!$order_id) {
    return null;
  }

  $order = wc_get_order($order_id);
  if (!$order || !is_a($order, 'WC_Order')) {
    return null;
  }

  if ($order->get_meta('_phaseone_manual_payment_order') !== 'yes') {
    return null;
  }

  if (!in_array($order->get_status(), array('pending', 'on-hold'), true)) {
    return null;
  }

  return $order;
}


function phaseone_mzv_get_thanks_url_from_params($params) {
  $raw = phaseone_mzv_get_param($params, 'phaseThanksUrl', 'phase_thanks_url');
  $raw = is_string($raw) ? trim(wp_unslash($raw)) : '';

  if ($raw === '') {
    $raw = '/thanks';
  }

  return $raw;
}

function phaseone_mzv_build_phase_thanks_url($params, $order, $method = '') {
  if (!$order || !is_a($order, 'WC_Order')) {
    return '';
  }

  $base = phaseone_mzv_get_thanks_url_from_params($params);

  if (preg_match('#^https?://#i', $base)) {
    $url = $base;
  } else {
    $origin = '';

    if (!empty($_SERVER['HTTP_ORIGIN'])) {
      $origin = esc_url_raw(wp_unslash($_SERVER['HTTP_ORIGIN']));
    } elseif (!empty($_SERVER['HTTP_REFERER'])) {
      $referer_parts = wp_parse_url(esc_url_raw(wp_unslash($_SERVER['HTTP_REFERER'])));
      if (!empty($referer_parts['scheme']) && !empty($referer_parts['host'])) {
        $origin = $referer_parts['scheme'] . '://' . $referer_parts['host'];
      }
    }

    if (!$origin) {
      $origin = home_url();
    }

    $url = rtrim($origin, '/') . '/' . ltrim($base, '/');
  }

  return add_query_arg(array(
    'order_id'          => $order->get_id(),
    'order_key'         => $order->get_order_key(),
    'payment_method'    => $method ?: (string) $order->get_meta('_phaseone_manual_payment_method'),
    'payment_reference' => phaseone_mzv_payment_reference($order),
  ), $url);
}

function phaseone_mzv_export_order_items($order) {
  if (!$order || !is_a($order, 'WC_Order')) {
    return array();
  }

  $items = array();

  foreach ($order->get_items('line_item') as $item_id => $item) {
    $product = $item->get_product();
    $items[] = array(
      'id'           => $item_id,
      'product_id'   => $item->get_product_id(),
      'variation_id' => $item->get_variation_id(),
      'name'         => $item->get_name(),
      'quantity'     => $item->get_quantity(),
      'subtotal'     => (float) $item->get_subtotal(),
      'total'        => (float) $item->get_total(),
      'line_total'   => (float) $item->get_total(),
      'price'        => $item->get_quantity() > 0 ? (float) ($item->get_total() / $item->get_quantity()) : (float) $item->get_total(),
      'sku'          => $product ? $product->get_sku() : '',
      'image'        => $product && wp_get_attachment_image_url($product->get_image_id(), 'thumbnail')
        ? wp_get_attachment_image_url($product->get_image_id(), 'thumbnail')
        : '',
    );
  }

  return $items;
}

function phaseone_mzv_export_order_payload($order) {
  if (!$order || !is_a($order, 'WC_Order')) {
    return array();
  }

  $method = (string) $order->get_meta('_phaseone_manual_payment_method');
  if (!$method) {
    $method = str_replace('phaseone_', '', (string) $order->get_payment_method());
  }

  $details = phaseone_mzv_payment_details($method ?: $order->get_payment_method());
  $reference = phaseone_mzv_save_payment_reference($order);

  return array(
    'order_id'             => $order->get_id(),
    'order_key'            => $order->get_order_key(),
    'order_number'         => $order->get_order_number(),
    'payment_reference'    => $reference,
    'payment_method'       => $method,
    'payment_method_id'    => $order->get_payment_method(),
    'payment_method_title' => phaseone_mzv_method_title($method),
    'status'               => $order->get_status(),
    'total'                => (float) $order->get_total(),
    'formatted_total'      => wp_strip_all_tags($order->get_formatted_order_total()),
    'subtotal'             => (float) $order->get_subtotal(),
    'shipping_total'       => (float) $order->get_shipping_total(),
    'discount_total'       => (float) $order->get_discount_total(),
    'email'                => $order->get_billing_email(),
    'billing'              => phaseone_mzv_export_address($order, 'billing'),
    'shipping'             => phaseone_mzv_export_address($order, 'shipping'),
    'items'                => phaseone_mzv_export_order_items($order),
    'expires_at'           => $order->get_meta('_phaseone_manual_payment_expires_at_iso'),
    'payment_details'      => array(
      'title'           => $details['title'],
      'recipient_label' => $details['recipient_label'],
      'recipient'       => $details['recipient'],
      'recipient_extra' => $details['recipient_extra'],
      'button_url'      => $details['button_url'],
      'button_label'    => $details['button_label'],
    ),
  );
}

function phaseone_mzv_email_money($value) {
  if (function_exists('wc_price')) {
    return wp_strip_all_tags(wc_price((float) $value));
  }

  return '$' . number_format((float) $value, 2);
}

function phaseone_mzv_email_escape($value) {
  return esc_html((string) $value);
}

function phaseone_mzv_email_logo_url() {
  if (function_exists('pol_email_v6_logo_url')) {
    return pol_email_v6_logo_url();
  }

  $uploads = wp_upload_dir();
  $default = !empty($uploads['baseurl'])
    ? trailingslashit($uploads['baseurl']) . '2026/06/TRANSPARENCIA-01-1-scaled.png'
    : '';

  $url = apply_filters('phaseone_email_logo_url', $default);
  return $url ? esc_url($url) : '';
}

function phaseone_mzv_email_address_html($order, $type = 'shipping') {
  $lines = phaseone_mzv_address_text($order, $type);

  if (empty($lines)) {
    return '<p style="margin:0;color:#687d8e;font-size:14px;line-height:1.5;">No address available.</p>';
  }

  $html = '';
  foreach ($lines as $line) {
    $html .= '<p style="margin:0 0 4px;color:#33475b;font-size:14px;line-height:1.55;">' . phaseone_mzv_email_escape($line) . '</p>';
  }

  return $html;
}

function phaseone_mzv_email_items_html($order) {
  $rows = '';

  foreach ($order->get_items('line_item') as $item) {
    $name = $item->get_name();
    $qty = max(1, (int) $item->get_quantity());
    $total = phaseone_mzv_email_money($item->get_total());

    $rows .= '
      <tr>
        <td style="padding:13px 0;border-bottom:1px solid #e2eaf0;color:#243447;font-size:14px;line-height:1.45;">
          <strong style="font-weight:800;color:#102a43;">' . phaseone_mzv_email_escape($name) . '</strong><br>
          <span style="color:#687d8e;">Quantity: ' . phaseone_mzv_email_escape($qty) . '</span>
        </td>
        <td align="right" style="padding:13px 0;border-bottom:1px solid #e2eaf0;color:#102a43;font-size:14px;font-weight:800;white-space:nowrap;">' . phaseone_mzv_email_escape($total) . '</td>
      </tr>';
  }

  if ($rows === '') {
    $rows = '<tr><td colspan="2" style="padding:12px 0;color:#687d8e;font-size:14px;">No items found.</td></tr>';
  }

  return '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">' . $rows . '</table>';
}

function phaseone_mzv_email_totals_html($order) {
  $rows = array();
  $rows[] = array('Subtotal', phaseone_mzv_email_money($order->get_subtotal()));

  if ((float) $order->get_shipping_total() > 0) {
    $rows[] = array('Shipping', phaseone_mzv_email_money($order->get_shipping_total()));
  } else {
    $rows[] = array('Shipping', 'FREE');
  }

  foreach ($order->get_items('fee') as $fee) {
    $rows[] = array($fee->get_name(), phaseone_mzv_email_money($fee->get_total()));
  }

  $rows[] = array('Total due', wp_strip_all_tags($order->get_formatted_order_total()), true);

  $html = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">';
  foreach ($rows as $row) {
    $is_total = !empty($row[2]);
    $html .= '<tr>';
    $html .= '<td style="padding:' . ($is_total ? '15px 0 0' : '7px 0') . ';border-top:' . ($is_total ? '1px solid #d8e3eb' : '0') . ';color:' . ($is_total ? '#102a43' : '#687d8e') . ';font-size:' . ($is_total ? '16px' : '14px') . ';font-weight:' . ($is_total ? '800' : '500') . ';">' . phaseone_mzv_email_escape($row[0]) . '</td>';
    $html .= '<td align="right" style="padding:' . ($is_total ? '15px 0 0' : '7px 0') . ';border-top:' . ($is_total ? '1px solid #d8e3eb' : '0') . ';color:#102a43;font-size:' . ($is_total ? '18px' : '14px') . ';font-weight:800;white-space:nowrap;">' . phaseone_mzv_email_escape($row[1]) . '</td>';
    $html .= '</tr>';
  }
  $html .= '</table>';

  return $html;
}

function phaseone_mzv_policy_notice_html($reference, $context = 'email') {
  $reference = phaseone_mzv_email_escape($reference);
  $is_page = $context === 'thankyou';
  $outer_margin = $is_page ? '20px 0 0' : '20px 0 0';

  return '
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;margin:' . $outer_margin . ';background:#fff4f1;border:2px solid #d92d20;border-radius:14px;">
      <tr>
        <td style="padding:18px 18px 17px;">
          <p style="margin:0 0 7px;color:#b42318;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.2;font-weight:900;letter-spacing:1.7px;text-transform:uppercase;">Required payment memo</p>
          <p style="margin:0 0 11px;color:#7a271a;font-family:Arial,Helvetica,sans-serif;font-size:17px;line-height:1.35;font-weight:900;">Enter only <span style="display:inline-block;padding:3px 7px;background:#ffffff;border:1px solid #f0b7ae;border-radius:6px;color:#b42318;letter-spacing:.04em;">' . $reference . '</span></p>
          <p style="margin:0 0 8px;color:#7a271a;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;font-weight:700;">Do not include any peptide, compound, product, order-item name, or additional message. The generated memo above must be copied exactly.</p>
          <p style="margin:0;color:#7a271a;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.6;"><strong>Company policy:</strong> failure to use the exact generated memo will result in the account being permanently banned from future Zelle/Venmo orders, and the transferred funds will not be returned.</p>
        </td>
      </tr>
    </table>';
}

function phaseone_mzv_build_clean_email_html($order, $recipient_type = 'customer') {
  if (!$order || !is_a($order, 'WC_Order')) {
    return '';
  }

  $details = phaseone_mzv_payment_details($order->get_payment_method());
  $reference = phaseone_mzv_save_payment_reference($order);
  $order_number = $order->get_order_number();
  $amount = wp_strip_all_tags($order->get_formatted_order_total());
  $logo = phaseone_mzv_email_logo_url();
  $is_admin = $recipient_type === 'admin';

  $preheader = $is_admin
    ? 'A new manual payment order is awaiting confirmation.'
    : 'Use the exact generated payment memo to complete your order.';
  $headline = $is_admin
    ? 'New manual payment order'
    : 'Complete your payment';
  $intro = $is_admin
    ? 'A customer placed an order using ' . $details['title'] . '. Confirm the payment and exact memo before processing the order.'
    : 'Your order is reserved and awaiting payment confirmation. Send the exact total and copy the generated memo exactly as shown.';

  $logo_html = $logo
    ? '<img src="' . esc_url($logo) . '" width="170" alt="Phase One Labz" style="display:block;width:170px;max-width:170px;height:auto;border:0;outline:none;text-decoration:none;margin:0 0 24px;">'
    : '<p style="margin:0 0 24px;color:#ffffff;font-size:18px;line-height:1.2;font-weight:900;letter-spacing:.08em;text-transform:uppercase;">Phase One Labz</p>';

  $venmo_link = '';
  if (!empty($details['button_url'])) {
    $venmo_link = '
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 0;border-collapse:separate;">
        <tr>
          <td bgcolor="#1687c9" style="background:#1687c9;border-radius:10px;">
            <a href="' . esc_url($details['button_url']) . '" style="display:inline-block;padding:12px 18px;color:#ffffff;text-decoration:none;font-size:13px;font-weight:900;">Open Venmo</a>
          </td>
        </tr>
      </table>';
  }

  $admin_note = '';
  if ($is_admin) {
    $admin_note = '<div style="margin:18px 0 0;padding:14px 16px;background:#eef7fc;border:1px solid #c9e5f5;border-radius:12px;"><p style="margin:0;color:#244c66;font-size:13px;line-height:1.6;"><strong>Admin action:</strong> verify that the incoming payment contains memo <strong>' . phaseone_mzv_email_escape($reference) . '</strong>. After confirmation, move the order to Processing or Completed.</p></div>';
  }

  return '<!doctype html>
<html>
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light only" />
  <meta name="supported-color-schemes" content="light" />
  <title>' . phaseone_mzv_email_escape($headline) . '</title>
</head>
<body style="margin:0;padding:0;background:#eaf0f5;color:#243447;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;">
  <div style="display:none;max-height:0;overflow:hidden;color:#eaf0f5;line-height:1px;opacity:0;">' . phaseone_mzv_email_escape($preheader) . '</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#eaf0f5" style="width:100%;border-collapse:collapse;background:#eaf0f5;">
    <tr>
      <td align="center" style="padding:30px 12px 38px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;border-collapse:separate;background:#ffffff;border:1px solid #dce5ec;border-radius:22px;overflow:hidden;">
          <tr>
            <td bgcolor="#071421" style="padding:34px 38px 31px;background:#071421;">
              ' . $logo_html . '
              <p style="margin:0 0 9px;color:#72c7f4;font-size:10px;line-height:1.2;font-weight:900;letter-spacing:2.7px;text-transform:uppercase;">' . phaseone_mzv_email_escape($is_admin ? 'Operations notification' : 'Secure manual payment') . '</p>
              <h1 style="margin:0;color:#ffffff;font-size:30px;line-height:1.15;font-weight:900;letter-spacing:-.035em;">' . phaseone_mzv_email_escape($headline) . '</h1>
              <p style="margin:13px 0 0;color:#bdd2df;font-size:14px;line-height:1.65;">' . phaseone_mzv_email_escape($intro) . '</p>
            </td>
          </tr>
          <tr><td height="4" bgcolor="#1687c9" style="height:4px;line-height:4px;font-size:0;background:#1687c9;">&nbsp;</td></tr>

          <tr>
            <td style="padding:32px 38px 8px;background:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;background:#f5f9fc;border:1px solid #dbe6ee;border-radius:15px;">
                <tr>
                  <td style="padding:20px 21px;">
                    <p style="margin:0 0 12px;color:#31506a;font-size:11px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase;">Payment summary</p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
                      <tr><td style="padding:7px 0;color:#687d8e;font-size:14px;">Method</td><td align="right" style="padding:7px 0;color:#102a43;font-size:14px;font-weight:900;">' . phaseone_mzv_email_escape($details['title']) . '</td></tr>
                      <tr><td style="padding:7px 0;color:#687d8e;font-size:14px;">Order</td><td align="right" style="padding:7px 0;color:#102a43;font-size:14px;font-weight:900;">#' . phaseone_mzv_email_escape($order_number) . '</td></tr>
                      <tr><td style="padding:7px 0;color:#687d8e;font-size:14px;">Amount to send</td><td align="right" style="padding:7px 0;color:#071421;font-size:18px;font-weight:900;">' . phaseone_mzv_email_escape($amount) . '</td></tr>
                      <tr><td style="padding:7px 0;color:#687d8e;font-size:14px;">' . phaseone_mzv_email_escape($details['recipient_label']) . '</td><td align="right" style="padding:7px 0;color:#102a43;font-size:14px;font-weight:900;">' . phaseone_mzv_email_escape($details['recipient']) . '</td></tr>
                      ' . (!empty($details['recipient_extra']) ? '<tr><td style="padding:7px 0;color:#687d8e;font-size:14px;">Recipient name</td><td align="right" style="padding:7px 0;color:#102a43;font-size:14px;font-weight:900;">' . phaseone_mzv_email_escape($details['recipient_extra']) . '</td></tr>' : '') . '
                    </table>
                    ' . $venmo_link . '
                  </td>
                </tr>
              </table>

              ' . phaseone_mzv_policy_notice_html($reference, 'email') . '
              ' . $admin_note . '
            </td>
          </tr>

          <tr>
            <td style="padding:24px 38px 30px;background:#ffffff;">
              <h2 style="margin:0 0 10px;color:#102a43;font-size:18px;line-height:1.3;">Order details</h2>
              ' . phaseone_mzv_email_items_html($order) . '

              <div style="height:22px;line-height:22px;">&nbsp;</div>
              <h2 style="margin:0 0 10px;color:#102a43;font-size:18px;line-height:1.3;">Summary</h2>
              ' . phaseone_mzv_email_totals_html($order) . '

              <div style="height:22px;line-height:22px;">&nbsp;</div>
              <h2 style="margin:0 0 10px;color:#102a43;font-size:18px;line-height:1.3;">Shipping address</h2>
              <div style="padding:16px 18px;background:#f5f9fc;border:1px solid #dbe6ee;border-radius:14px;">' . phaseone_mzv_email_address_html($order, 'shipping') . '</div>
            </td>
          </tr>

          <tr>
            <td bgcolor="#f5f8fb" style="padding:22px 38px 24px;background:#f5f8fb;border-top:1px solid #dce5ec;">
              <p style="margin:0 0 7px;color:#31506a;font-size:11px;line-height:1.4;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;">Payment window</p>
              <p style="margin:0;color:#687d8e;font-size:12px;line-height:1.65;">Unpaid Zelle/Venmo orders are automatically cancelled after 24 hours. Products are intended strictly for in-vitro laboratory research use only.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>';
}

function phaseone_mzv_send_clean_html_mail($to, $subject, $html) {
  if (!$to || !$subject || !$html) {
    return false;
  }

  $headers = array('Content-Type: text/html; charset=UTF-8');
  return wp_mail($to, $subject, $html, $headers);
}

function phaseone_mzv_send_order_emails($order) {
  if (!$order || !is_a($order, 'WC_Order')) {
    return;
  }

  $order_no = $order->get_order_number();
  $details = phaseone_mzv_payment_details($order->get_payment_method());
  $customer_email = $order->get_billing_email();
  $admin_email = get_option('admin_email');
  $customer_sent = false;
  $admin_sent = false;

  if ($customer_email && is_email($customer_email)) {
    $customer_sent = phaseone_mzv_send_clean_html_mail(
      $customer_email,
      sprintf('Action required: payment memo for order #%s', $order_no),
      phaseone_mzv_build_clean_email_html($order, 'customer')
    );
  }

  if ($admin_email && is_email($admin_email)) {
    $admin_sent = phaseone_mzv_send_clean_html_mail(
      $admin_email,
      sprintf('New %s manual order #%s', $details['title'], $order_no),
      phaseone_mzv_build_clean_email_html($order, 'admin')
    );
  }

  $order->update_meta_data('_phaseone_clean_email_sent_at', gmdate('c'));
  $order->update_meta_data('_phaseone_customer_email_sent', $customer_sent ? 'yes' : 'no');
  $order->update_meta_data('_phaseone_admin_email_sent', $admin_sent ? 'yes' : 'no');
  $order->save();
}

/**
 * This plugin sends its own dedicated manual-payment emails. Disable the
 * equivalent automatic WooCommerce emails for these orders to prevent the
 * customer and admin from receiving duplicate notifications.
 */
function phaseone_mzv_disable_duplicate_wc_email($enabled, $order = null, $email = null) {
  if ($order instanceof WC_Order && phaseone_mzv_is_manual_payment_order($order)) {
    return false;
  }

  return $enabled;
}

add_filter('woocommerce_email_enabled_customer_on_hold_order', 'phaseone_mzv_disable_duplicate_wc_email', 10, 3);
add_filter('woocommerce_email_enabled_new_order', 'phaseone_mzv_disable_duplicate_wc_email', 10, 3);

function phaseone_mzv_bulk_requested($params) {
  return sanitize_key((string) ($params['checkout_mode'] ?? '')) === 'bulk'
    || !empty($params['bulk_session_token'])
    || !empty($params['bulk_intent_token']);
}

function phaseone_mzv_bulk_error_response($error) {
  $status = 400;
  $message = 'The Bulk checkout could not be validated.';
  if (is_wp_error($error)) {
    $message = $error->get_error_message() ?: $message;
    $data = $error->get_error_data();
    if (is_array($data) && !empty($data['status'])) {
      $status = max(400, min(599, (int) $data['status']));
    }
  }
  return new WP_REST_Response(array('success' => false, 'message' => $message), $status);
}

function phaseone_mzv_manual_payment_order_endpoint(WP_REST_Request $request) {
  if (!function_exists('wc_create_order') || !class_exists('WooCommerce')) {
    return new WP_REST_Response(array(
      'success' => false,
      'message' => 'WooCommerce is not available.',
    ), 500);
  }

  $params = $request->get_json_params();
  $params = is_array($params) ? $params : array();

  $method = phaseone_mzv_allowed_method(
    phaseone_mzv_get_param($params, 'paymentMethod', 'payment_method')
  );

  if (!$method) {
    return new WP_REST_Response(array(
      'success' => false,
      'message' => 'Invalid manual payment method.',
    ), 400);
  }

  $items = $params['items'] ?? array();
  if (!is_array($items) || empty($items)) {
    return new WP_REST_Response(array(
      'success' => false,
      'message' => 'No order items were received.',
    ), 400);
  }

  $billing = $params['billing'] ?? array();
  $email = phaseone_mzv_clean_email($billing['email'] ?? ($params['customer']['email'] ?? ''));
  if (!$email || !is_email($email)) {
    return new WP_REST_Response(array(
      'success' => false,
      'message' => 'A valid customer email is required.',
    ), 400);
  }

  $required_billing_fields = array(
    'first_name' => 'First name',
    'last_name'  => 'Last name',
    'address_1'  => 'Address',
    'city'       => 'City',
    'state'      => 'State',
    'postcode'   => 'Postal code',
    'phone'      => 'Phone number',
  );

  foreach ($required_billing_fields as $field_key => $field_label) {
    $value = $billing[$field_key] ?? '';
    if ($value === '' && $field_key === 'first_name') {
      $value = $billing['firstName'] ?? '';
    }
    if ($value === '' && $field_key === 'last_name') {
      $value = $billing['lastName'] ?? '';
    }
    if ($value === '' && $field_key === 'address_1') {
      $value = $billing['address1'] ?? '';
    }

    if (phaseone_mzv_clean_text($value) === '') {
      return new WP_REST_Response(array(
        'success' => false,
        'message' => $field_label . ' is required before creating the manual payment order.',
      ), 400);
    }
  }

  $bulk_context = null;
  if (phaseone_mzv_bulk_requested($params)) {
    if (!class_exists('PhaseOne_Bulk_REST') || !class_exists('PhaseOne_Bulk_Checkout')) {
      return new WP_REST_Response(array('success' => false, 'message' => 'Bulk checkout is not available.'), 503);
    }
    $server_authorized = PhaseOne_Bulk_REST::authorize_server($request);
    if (is_wp_error($server_authorized)) {
      return phaseone_mzv_bulk_error_response($server_authorized);
    }
    $customer_id = PhaseOne_Bulk_Checkout::authenticated_customer_id($request);
    $bulk_context = PhaseOne_Bulk_Checkout::from_payload($params, $customer_id);
    if (is_wp_error($bulk_context)) {
      return phaseone_mzv_bulk_error_response($bulk_context);
    }
    if (!empty($bulk_context['is_idempotent'])) {
      $existing_bulk_order = wc_get_order((int) $bulk_context['order_id']);
      if (!$existing_bulk_order instanceof WC_Order || $existing_bulk_order->get_customer_id() !== $customer_id) {
        return new WP_REST_Response(array('success' => false, 'message' => 'The existing Bulk order could not be verified.'), 409);
      }
      $payload = phaseone_mzv_export_order_payload($existing_bulk_order);
      $payload['success'] = true;
      $payload['reused'] = true;
      $payload['instructions_sent'] = false;
      return new WP_REST_Response($payload, 200);
    }
  }

  $store_credit_requested = !$bulk_context
    && class_exists('PhaseOne_Checkout_Store_Credit')
    && PhaseOne_Checkout_Store_Credit::requested($params);
  $store_credit_user_id = $store_credit_requested
    ? PhaseOne_Checkout_Store_Credit::authenticated_user_id($request)
    : 0;

  if (!$bulk_context && !class_exists('PhaseOne_Checkout_Store_Credit')
      && (!empty($params['store_credit']['apply']) || !empty($params['storeCredit']['apply']))) {
    return new WP_REST_Response(array(
      'success' => false,
      'message' => 'Store credit is temporarily unavailable.',
    ), 503);
  }

  if ($store_credit_requested && $store_credit_user_id <= 0) {
    return new WP_REST_Response(array(
      'success' => false,
      'message' => 'Sign in again to use store credit.',
    ), 401);
  }

  $existing_order_id = $bulk_context ? 0 : absint(phaseone_mzv_get_param($params, 'existingOrderId', 'existing_order_id'));
  $order = phaseone_mzv_get_reusable_order($existing_order_id);
  $is_new_order = false;

  if (!$order) {
    $order_args = array('status' => 'pending');
    if ($bulk_context) {
      $order_args['customer_id'] = (int) $bulk_context['customer_id'];
    } elseif ($store_credit_user_id > 0) {
      $order_args['customer_id'] = $store_credit_user_id;
    }
    $order = wc_create_order($order_args);
    $is_new_order = true;
  }

  if (!$order || is_wp_error($order)) {
    if ($bulk_context) {
      PhaseOne_Bulk_Checkout::release($bulk_context);
    }
    return new WP_REST_Response(array(
      'success' => false,
      'message' => 'Unable to create the WooCommerce order.',
    ), 500);
  }

  $previous_payment_id = $order->get_payment_method();

  if ($store_credit_requested) {
    $existing_customer_id = (int) $order->get_customer_id();
    if ($existing_customer_id > 0 && $existing_customer_id !== $store_credit_user_id) {
      return new WP_REST_Response(array(
        'success' => false,
        'message' => 'Store credit does not belong to this order.',
      ), 403);
    }
    $order->set_customer_id($store_credit_user_id);
  } elseif (class_exists('PhaseOne_Checkout_Store_Credit')) {
    PhaseOne_Checkout_Store_Credit::release_order((int) $order->get_id(), 'Store credit was removed before the manual order was submitted.');
  }

  $payment_id = phaseone_mzv_payment_id($method);
  $details = phaseone_mzv_payment_details($method);
  $payment_title = $details['title'];

  phaseone_mzv_clear_order_items($order);
  if ($bulk_context) {
    $bulk_applied = PhaseOne_Bulk_Checkout::apply_to_order($order, $bulk_context);
    if (is_wp_error($bulk_applied)) {
      PhaseOne_Bulk_Checkout::release($bulk_context);
      if ($is_new_order) {
        $order->delete(true);
      }
      return phaseone_mzv_bulk_error_response($bulk_applied);
    }
    phaseone_mzv_add_bulk_shipping($order, (float) $bulk_context['quote']['subtotal']);
  } else {
    phaseone_mzv_add_products($order, $items);
    phaseone_mzv_add_shipping($order, $params);
  }

  $coupon_discount = $bulk_context ? 0 : (float) phaseone_mzv_get_param($params, 'couponDiscountAmount', 'coupon_discount_amount');
  $payment_discount = $bulk_context
    ? round((float) $bulk_context['quote']['subtotal'] * max(0, (float) apply_filters('phaseone_mzv_bulk_payment_discount_rate', 0.05, $order)), 2)
    : (float) phaseone_mzv_get_param($params, 'paymentDiscountAmount', 'payment_discount_amount');
  $shipping = $params['shipping'] ?? $billing;
  phaseone_mzv_set_address($order, $billing, 'billing');
  phaseone_mzv_set_address($order, $shipping, 'shipping');

  $order->set_created_via('phaseone_custom_checkout');
  $order->set_customer_note('');
  $order->set_payment_method($payment_id);
  $order->set_payment_method_title($payment_title . ' Manual Payment');
  $order->update_meta_data('_phaseone_manual_payment_order', 'yes');
  $order->update_meta_data('_phaseone_manual_payment_method', $method);
  $order->update_meta_data('_phaseone_manual_payment_method_title', $payment_title);
  if (!$bulk_context) {
    $order->update_meta_data('_phaseone_manual_payment_free_shipping_minimum', (float) phaseone_mzv_get_param($params, 'freeShippingMinimum', 'free_shipping_minimum'));
    $order->update_meta_data('_phaseone_manual_payment_shipping_cost', (float) phaseone_mzv_get_param($params, 'shippingTotal', 'shipping_total'));
  }
  $order->update_meta_data('_phaseone_manual_payment_policy_acknowledged_at', phaseone_mzv_clean_text(phaseone_mzv_get_param($params, 'policyAcknowledgedAt', 'policy_acknowledged_at')));

  $coupon_codes = $bulk_context ? array() : phaseone_mzv_get_coupon_codes($params);
  $coupon_result = phaseone_mzv_apply_real_coupons($order, $coupon_codes);

  if (!empty($coupon_codes)) {
    $order->update_meta_data('_phaseone_coupon_codes', implode(', ', $coupon_codes));
  } else {
    $order->delete_meta_data('_phaseone_coupon_codes');
  }

  if (!empty($coupon_result['applied'])) {
    // Backup metadata is also understood by the Phase One affiliate bridge.
    $affiliate_coupon = reset($coupon_result['applied']);
    $order->update_meta_data('_phaseone_checkout_coupon', $affiliate_coupon);
    $order->update_meta_data('_phaseone_affiliate_coupon', $affiliate_coupon);
    $order->delete_meta_data('_phaseone_coupon_application_errors');
  } else {
    $order->delete_meta_data('_phaseone_checkout_coupon');
    $order->delete_meta_data('_phaseone_affiliate_coupon');
  }

  if (!empty($coupon_result['errors'])) {
    $order->update_meta_data('_phaseone_coupon_application_errors', wp_json_encode($coupon_result['errors']));
    $order->add_order_note(
      'Coupon application error: ' . implode(' | ', array_map(
        static function ($code, $message) {
          return $code . ': ' . $message;
        },
        array_keys($coupon_result['errors']),
        array_values($coupon_result['errors'])
      ))
    );
  }

  /*
   * Backwards-compatible fallback: preserve the checkout total only when an
   * older frontend sent a discount amount without sending any coupon code.
   * When a real coupon was received, never add this fee or it would discount
   * the order twice.
   */
  if (empty($coupon_codes) && $coupon_discount > 0) {
    phaseone_mzv_add_negative_fee($order, 'Coupon discount (code missing)', $coupon_discount);
  }

  phaseone_mzv_add_negative_fee($order, $payment_title . ' 5% discount', $payment_discount);
  $order->calculate_totals(false);

  $store_credit_amount = 0.0;
  if ($store_credit_requested) {
    $expires_hours = absint(phaseone_mzv_get_param($params, 'expiresInHours', 'expires_in_hours') ?: PHASEONE_MZV_CANCEL_HOURS);
    $reserved_credit = PhaseOne_Checkout_Store_Credit::reserve_for_order(
      $order,
      $store_credit_user_id,
      max(2, $expires_hours + 1) * HOUR_IN_SECONDS
    );

    if (is_wp_error($reserved_credit)) {
      if ($is_new_order) {
        $order->delete(true);
      }
      return new WP_REST_Response(array(
        'success' => false,
        'message' => $reserved_credit->get_error_message(),
      ), 409);
    }
    $store_credit_amount = (float) $reserved_credit;
  }

  if ($store_credit_amount > 0 && (float) $order->get_total() <= 0.01) {
    $order->set_payment_method('phaseone_store_credit');
    $order->set_payment_method_title('Store Credit');
    $order->add_order_note('Paid in full with reserved store credit. No manual transfer is required.');
    $order->save();
    $order->payment_complete('store-credit-' . $order->get_id());

    $payload = phaseone_mzv_export_order_payload($order);
    $payload['success'] = true;
    $payload['reused'] = !$is_new_order;
    $payload['instructions_sent'] = false;
    $payload['storeCreditApplied'] = $store_credit_amount;
    $payload['storeCreditOnly'] = true;
    $payload['redirectUrl'] = add_query_arg(array(
      'order_id' => $order->get_id(),
      'order_key' => $order->get_order_key(),
      'payment' => 'success',
      'gateway' => 'store-credit',
    ), '/checkout/thank-you');
    return new WP_REST_Response($payload, 200);
  }

  $order->set_status('on-hold');

  $reference = phaseone_mzv_save_payment_reference($order);
  $expires_hours = absint(phaseone_mzv_get_param($params, 'expiresInHours', 'expires_in_hours') ?: PHASEONE_MZV_CANCEL_HOURS);
  $expires_at = phaseone_mzv_schedule_cancel($order, $expires_hours);

  $order->add_order_note(sprintf(
    '%s manual payment pending. Payment reference: %s. Auto-cancel scheduled for %s UTC.',
    $payment_title,
    $reference,
    gmdate('Y-m-d H:i:s', $expires_at)
  ));
  $order->save();

  if ($bulk_context && !PhaseOne_Bulk_Checkout::complete($bulk_context, $order)) {
    $order->add_order_note('Bulk checkout intent could not be finalized automatically. Manual review is required.');
    $order->update_meta_data('_phaseone_bulk_intent_finalize_error', 'yes');
    $order->save();
  }

  $should_send_manual_email = $is_new_order || $previous_payment_id !== $payment_id;

  if ($should_send_manual_email) {
    phaseone_mzv_send_order_emails($order);
  }

  if ($is_new_order && function_exists('wc_reduce_stock_levels')) {
    wc_reduce_stock_levels($order->get_id());
  }

  $payload = phaseone_mzv_export_order_payload($order);
  $payload['success'] = true;
  $payload['reused'] = !$is_new_order;
  $payload['instructions_sent'] = $should_send_manual_email;
  $payload['storeCreditApplied'] = $store_credit_amount;

  return new WP_REST_Response($payload, 200);
}

function phaseone_mzv_manual_payment_order_details_endpoint(WP_REST_Request $request) {
  if (!function_exists('wc_get_order')) {
    return new WP_REST_Response(array(
      'success' => false,
      'message' => 'WooCommerce is not available.',
    ), 500);
  }

  $order_id = absint($request->get_param('order_id'));
  $order_key = phaseone_mzv_clean_text($request->get_param('order_key'));

  if (!$order_id || !$order_key) {
    return new WP_REST_Response(array(
      'success' => false,
      'message' => 'Order ID and order key are required.',
    ), 400);
  }

  $order = wc_get_order($order_id);

  if (!$order || !is_a($order, 'WC_Order')) {
    return new WP_REST_Response(array(
      'success' => false,
      'message' => 'Order was not found.',
    ), 404);
  }

  if (!hash_equals((string) $order->get_order_key(), (string) $order_key)) {
    return new WP_REST_Response(array(
      'success' => false,
      'message' => 'Invalid order key.',
    ), 403);
  }

  if (!phaseone_mzv_is_manual_payment_order($order)) {
    return new WP_REST_Response(array(
      'success' => false,
      'message' => 'This is not a Zelle/Venmo manual payment order.',
    ), 400);
  }

  $payload = phaseone_mzv_export_order_payload($order);
  $payload['success'] = true;

  return new WP_REST_Response($payload, 200);
}

add_action('phaseone_mzv_cancel_unpaid_manual_order', function ($order_id) {
  if (!function_exists('wc_get_order')) {
    return;
  }

  $order = wc_get_order(absint($order_id));
  if (!phaseone_mzv_is_manual_payment_order($order)) {
    return;
  }

  if (!in_array($order->get_status(), array('pending', 'on-hold'), true)) {
    return;
  }

  $expires_at = absint($order->get_meta('_phaseone_manual_payment_expires_at'));
  if ($expires_at && time() < $expires_at) {
    return;
  }

  $order->update_status('cancelled', 'Automatically cancelled after 24 hours without Zelle/Venmo payment.');
}, 10, 1);

function phaseone_mzv_instruction_html($order, $context = 'thankyou') {
  if (!phaseone_mzv_is_manual_payment_order($order)) {
    return '';
  }

  $details = phaseone_mzv_payment_details($order->get_payment_method());
  $reference = phaseone_mzv_save_payment_reference($order);
  $order_no = $order->get_order_number();
  $total = $order->get_formatted_order_total();
  $is_email = $context === 'email';

  ob_start();

  if ($is_email) : ?>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;margin:0 0 24px;background:#f5f9fc;border:1px solid #dbe6ee;border-radius:14px;">
      <tr>
        <td style="padding:18px;">
          <p style="margin:0 0 7px;color:#31506a;font-size:11px;font-weight:900;letter-spacing:1.5px;text-transform:uppercase;">Manual payment</p>
          <h2 style="margin:0 0 12px;color:#102a43;font-size:20px;line-height:1.25;">Payment instructions: <?php echo esc_html($details['title']); ?></h2>
          <p style="margin:0 0 7px;color:#33475b;"><strong>Order:</strong> #<?php echo esc_html($order_no); ?></p>
          <p style="margin:0 0 7px;color:#33475b;"><strong>Amount:</strong> <?php echo wp_kses_post($total); ?></p>
          <p style="margin:0;color:#33475b;"><strong><?php echo esc_html($details['recipient_label']); ?>:</strong> <?php echo esc_html($details['recipient']); ?></p>
          <?php if (!empty($details['recipient_extra'])) : ?>
            <p style="margin:7px 0 0;color:#33475b;"><strong>Recipient name:</strong> <?php echo esc_html($details['recipient_extra']); ?></p>
          <?php endif; ?>
          <?php if (!empty($details['button_url'])) : ?>
            <p style="margin:16px 0 0;"><a href="<?php echo esc_url($details['button_url']); ?>" style="display:inline-block;padding:11px 16px;border-radius:10px;background:#1687c9;color:#ffffff;text-decoration:none;font-weight:900;">Open Venmo</a></p>
          <?php endif; ?>
          <?php echo phaseone_mzv_policy_notice_html($reference, 'email'); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>
        </td>
      </tr>
    </table>
  <?php else : ?>
    <section class="phaseone-manual-payment-box" style="margin:28px 0;padding:24px;border:1px solid #dbe6ee;border-radius:18px;background:#f5f9fc;color:#243447;box-shadow:0 14px 36px rgba(15,35,55,.08);">
      <p style="margin:0 0 7px;font-size:11px;font-weight:900;letter-spacing:1.6px;text-transform:uppercase;color:#31506a;">Awaiting payment</p>
      <h2 style="margin:0 0 10px;font-size:27px;line-height:1.12;color:#102a43;">Pay with <?php echo esc_html($details['title']); ?></h2>
      <p style="margin:0 0 20px;color:#526b7d;line-height:1.65;">Your order is reserved and will remain on hold until payment is confirmed.</p>

      <div style="padding:17px 18px;background:#ffffff;border:1px solid #dbe6ee;border-radius:14px;">
        <div style="display:flex;justify-content:space-between;gap:14px;padding:9px 0;border-bottom:1px solid #e3ebf1;"><span style="color:#687d8e;">Order</span><strong style="color:#102a43;">#<?php echo esc_html($order_no); ?></strong></div>
        <div style="display:flex;justify-content:space-between;gap:14px;padding:9px 0;border-bottom:1px solid #e3ebf1;"><span style="color:#687d8e;">Amount</span><strong style="color:#071421;font-size:18px;"><?php echo wp_kses_post($total); ?></strong></div>
        <div style="display:flex;justify-content:space-between;gap:14px;padding:9px 0;border-bottom:1px solid #e3ebf1;"><span style="color:#687d8e;"><?php echo esc_html($details['recipient_label']); ?></span><strong style="color:#102a43;text-align:right;"><?php echo esc_html($details['recipient']); ?></strong></div>
        <?php if (!empty($details['recipient_extra'])) : ?>
          <div style="display:flex;justify-content:space-between;gap:14px;padding:9px 0;"><span style="color:#687d8e;">Recipient name</span><strong style="color:#102a43;"><?php echo esc_html($details['recipient_extra']); ?></strong></div>
        <?php endif; ?>
      </div>

      <?php echo phaseone_mzv_policy_notice_html($reference, 'thankyou'); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped ?>

      <?php if (!empty($details['button_url'])) : ?>
        <a href="<?php echo esc_url($details['button_url']); ?>" target="_blank" rel="noreferrer" style="display:inline-flex;align-items:center;justify-content:center;min-height:46px;margin-top:18px;padding:0 19px;border-radius:10px;background:#1687c9;color:#ffffff;font-weight:900;text-decoration:none;">Open Venmo</a>
      <?php endif; ?>

      <p style="margin:15px 0 0;color:#687d8e;font-size:13px;line-height:1.6;">Unpaid Zelle/Venmo orders are automatically cancelled after 24 hours.</p>
    </section>
  <?php endif;

  return ob_get_clean();
}

/**
 * Keep the payment block available when an administrator manually sends a
 * customer invoice. Automatic on-hold and new-order emails are disabled above
 * because this plugin already sends dedicated branded notifications.
 */
add_action('woocommerce_email_before_order_table', function ($order, $sent_to_admin, $plain_text, $email) {
  if (!phaseone_mzv_is_manual_payment_order($order)) {
    return;
  }

  $email_id = is_object($email) && isset($email->id) ? (string) $email->id : '';
  if ($email_id !== 'customer_invoice') {
    return;
  }

  $details = phaseone_mzv_payment_details($order->get_payment_method());
  $reference = phaseone_mzv_save_payment_reference($order);

  if ($plain_text) {
    echo "\nMANUAL PAYMENT INSTRUCTIONS\n";
    echo "Method: " . esc_html($details['title']) . "\n";
    echo "Order: #" . esc_html($order->get_order_number()) . "\n";
    echo "Amount: " . wp_strip_all_tags($order->get_formatted_order_total()) . "\n";
    echo esc_html($details['recipient_label']) . ': ' . esc_html($details['recipient']) . "\n";
    if (!empty($details['recipient_extra'])) {
      echo "Recipient name: " . esc_html($details['recipient_extra']) . "\n";
    }
    echo "REQUIRED MEMO: " . esc_html($reference) . "\n";
    echo "Use only the exact generated memo. Do not include peptide, compound, product, or order-item names.\n";
    echo "Company policy: failure to use the exact generated memo will result in a permanent ban from future Zelle/Venmo orders, and transferred funds will not be returned.\n\n";
    return;
  }

  echo phaseone_mzv_instruction_html($order, 'email'); // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
}, 8, 4);
