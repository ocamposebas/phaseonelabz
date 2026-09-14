<?php
/**
 * Plugin Name: Phase One Labz - Order COAs
 * Description: Preserves purchase-time WooCommerce COA snapshots and supports confirmed fulfillment corrections.
 * Version: 1.1.0
 * Author: Phase One Labz
 * Requires Plugins: woocommerce
 * Requires PHP: 7.4
 */

defined( 'ABSPATH' ) || exit;

define( 'PHASEONE_ORDER_COAS_VERSION', '1.1.0' );
define( 'PHASEONE_ORDER_COAS_DATA_VERSION', '1.0.0' );
define( 'PHASEONE_ORDER_COAS_META_KEY', '_phaseone_fulfillment_coas' );
define( 'PHASEONE_ORDER_COAS_CATALOG_CACHE_KEY', 'phaseone_order_coas_catalog_v1' );
define( 'PHASEONE_ORDER_COAS_DATA_VERSION_OPTION', 'phaseone_order_coas_data_version' );
define( 'PHASEONE_ORDER_COAS_BACKFILL_OPTION', 'phaseone_order_coas_backfill_v1' );
define( 'PHASEONE_ORDER_COAS_BACKFILL_LOCK_OPTION', 'phaseone_order_coas_backfill_lock_v1' );
define( 'PHASEONE_ORDER_COAS_BACKFILL_HOOK', 'phaseone_order_coas_backfill_batch' );

function phaseone_order_coas_invalidate_catalog_cache() {
	delete_transient( PHASEONE_ORDER_COAS_CATALOG_CACHE_KEY );
}

// The COA Manager post type is intentionally not duplicated or hard-coded here.
// Invalidating on admin content/media changes keeps the short-lived normalized
// catalog fresh regardless of the custom post type name used by that plugin.
add_action( 'save_post', 'phaseone_order_coas_invalidate_catalog_cache', 99 );
add_action( 'deleted_post', 'phaseone_order_coas_invalidate_catalog_cache', 99 );
add_action( 'add_attachment', 'phaseone_order_coas_invalidate_catalog_cache', 99 );
add_action( 'edit_attachment', 'phaseone_order_coas_invalidate_catalog_cache', 99 );
add_action( 'delete_attachment', 'phaseone_order_coas_invalidate_catalog_cache', 99 );

add_action(
	'before_woocommerce_init',
	static function () {
		$features_class = '\\Automattic\\WooCommerce\\Utilities\\FeaturesUtil';
		if ( class_exists( $features_class ) ) {
			$features_class::declare_compatibility( 'custom_order_tables', __FILE__, true );
		}
	}
);

function phaseone_order_coas_json_error( $code, $message, $status ) {
	return new WP_Error( $code, $message, array( 'status' => $status ) );
}

function phaseone_order_coas_first( $record, $keys, $fallback = '' ) {
	foreach ( $keys as $key ) {
		if ( isset( $record[ $key ] ) && '' !== trim( (string) $record[ $key ] ) ) {
			return $record[ $key ];
		}
	}
	return $fallback;
}

function phaseone_order_coas_flat_values( $value ) {
	$values = is_array( $value ) ? $value : array( $value );
	$result = array();
	foreach ( $values as $entry ) {
		$parts = is_string( $entry ) ? preg_split( '/[,|]/', $entry ) : array( $entry );
		foreach ( $parts as $part ) {
			$part = trim( (string) $part );
			if ( '' !== $part ) {
				$result[] = $part;
			}
		}
	}
	return array_values( array_unique( $result ) );
}

function phaseone_order_coas_values( $record, $keys ) {
	$values = array();
	foreach ( $keys as $key ) {
		if ( isset( $record[ $key ] ) ) {
			$values = array_merge( $values, phaseone_order_coas_flat_values( $record[ $key ] ) );
		}
	}
	return array_values( array_unique( $values ) );
}

function phaseone_order_coas_ids( $record, $keys ) {
	return array_values(
		array_unique(
			array_filter(
				array_map( 'absint', phaseone_order_coas_values( $record, $keys ) )
			)
		)
	);
}

function phaseone_order_coas_bool( $value ) {
	if ( is_bool( $value ) ) {
		return $value;
	}
	return in_array( strtolower( trim( (string) $value ) ), array( '1', 'true', 'yes', 'on' ), true );
}

function phaseone_order_coas_file_kind( $url ) {
	$path = strtolower( (string) wp_parse_url( $url, PHP_URL_PATH ) );
	if ( preg_match( '/\.pdf$/', $path ) ) {
		return 'pdf';
	}
	if ( preg_match( '/\.(?:jpe?g|png|webp|gif)$/', $path ) ) {
		return 'image';
	}
	return 'external';
}

function phaseone_order_coas_normalize_record( $record ) {
	if ( ! is_array( $record ) ) {
		return array();
	}

	$id      = sanitize_text_field( (string) phaseone_order_coas_first( $record, array( 'id', 'coaId', 'coa_id', 'wpPostId' ) ) );
	$post_id = absint( phaseone_order_coas_first( $record, array( 'wpPostId', 'postId', 'post_id' ), 0 ) );
	if ( '' === $id && $post_id ) {
		$id = (string) $post_id;
	}
	if ( '' === $id ) {
		return array();
	}

	$url = esc_url_raw(
		(string) phaseone_order_coas_first(
			$record,
			array( 'fileUrl', 'coaUrl', 'verifyUrl', 'url', 'file_url', 'coa_url', 'verify_url' )
		)
	);

	return array(
		'id'                  => $id,
		'post_id'             => $post_id,
		'coa_number'          => sanitize_text_field( (string) phaseone_order_coas_first( $record, array( 'coaNumber', 'coa_number', 'number' ) ) ),
		'product_name'        => sanitize_text_field( (string) phaseone_order_coas_first( $record, array( 'productName', 'product_name', 'name', 'compound' ) ) ),
		'product_ids'         => phaseone_order_coas_ids( $record, array( 'productIds', 'product_ids', 'productId', 'product_id', 'wooIds', 'woo_ids', 'matchedProductId' ) ),
		'parent_product_ids'  => phaseone_order_coas_ids( $record, array( 'parentProductIds', 'parent_product_ids' ) ),
		'variation_ids'       => phaseone_order_coas_ids( $record, array( 'variationIds', 'variation_ids', 'variationId', 'variation_id', 'matchedVariationId' ) ),
		'skus'                => array_map( 'sanitize_text_field', phaseone_order_coas_values( $record, array( 'skus', 'sku' ) ) ),
		'strength'            => sanitize_text_field( (string) phaseone_order_coas_first( $record, array( 'strength', 'dose' ) ) ),
		'lot'                 => sanitize_text_field( (string) phaseone_order_coas_first( $record, array( 'batch', 'lot', 'batchNumber', 'lotNumber', 'batch_number', 'lot_number' ) ) ),
		'testing_date'        => sanitize_text_field( (string) phaseone_order_coas_first( $record, array( 'date', 'testingDate', 'testing_date', 'testedAt', 'tested_at' ) ) ),
		'laboratory'          => sanitize_text_field( (string) phaseone_order_coas_first( $record, array( 'laboratory', 'lab' ) ) ),
		'test_method'         => sanitize_text_field( (string) phaseone_order_coas_first( $record, array( 'method', 'tested' ) ) ),
		'purity'              => sanitize_text_field( (string) phaseone_order_coas_first( $record, array( 'purity' ) ) ),
		'status'              => sanitize_text_field( (string) phaseone_order_coas_first( $record, array( 'status' ), 'Available' ) ),
		'current_shipping_lot'=> phaseone_order_coas_bool( phaseone_order_coas_first( $record, array( 'currentShippingLot', 'activeShippingLot' ), false ) ),
		'file_attachment_id'  => absint( phaseone_order_coas_first( $record, array( 'fileAttachmentId', 'file_attachment_id' ), 0 ) ),
		'view_url'            => $url,
		'file_kind'           => phaseone_order_coas_file_kind( $url ),
	);
}

/**
 * Store the customer-facing certificate facts on the order item. The COA
 * Manager remains the library, while this snapshot preserves what was active
 * when the order was created even if that library record changes later.
 */
function phaseone_order_coas_snapshot_record( $record, $captured_at = '' ) {
	if ( ! is_array( $record ) || empty( $record['id'] ) ) {
		return array();
	}

	$view_url  = esc_url_raw( isset( $record['view_url'] ) ? $record['view_url'] : '' );
	$file_kind = sanitize_key( isset( $record['file_kind'] ) ? $record['file_kind'] : '' );
	if ( ! in_array( $file_kind, array( 'pdf', 'image', 'external' ), true ) ) {
		$file_kind = phaseone_order_coas_file_kind( $view_url );
	}
	return array(
		'snapshot_version'     => 1,
		'captured_at'          => sanitize_text_field( $captured_at ? $captured_at : gmdate( 'c' ) ),
		'id'                   => sanitize_text_field( (string) $record['id'] ),
		'post_id'              => absint( isset( $record['post_id'] ) ? $record['post_id'] : 0 ),
		'coa_number'           => sanitize_text_field( isset( $record['coa_number'] ) ? $record['coa_number'] : '' ),
		'product_name'         => sanitize_text_field( isset( $record['product_name'] ) ? $record['product_name'] : '' ),
		'product_ids'          => array_values( array_unique( array_filter( array_map( 'absint', (array) ( isset( $record['product_ids'] ) ? $record['product_ids'] : array() ) ) ) ) ),
		'parent_product_ids'   => array_values( array_unique( array_filter( array_map( 'absint', (array) ( isset( $record['parent_product_ids'] ) ? $record['parent_product_ids'] : array() ) ) ) ) ),
		'variation_ids'        => array_values( array_unique( array_filter( array_map( 'absint', (array) ( isset( $record['variation_ids'] ) ? $record['variation_ids'] : array() ) ) ) ) ),
		'skus'                 => array_values( array_unique( array_filter( array_map( 'sanitize_text_field', (array) ( isset( $record['skus'] ) ? $record['skus'] : array() ) ) ) ) ),
		'strength'             => sanitize_text_field( isset( $record['strength'] ) ? $record['strength'] : '' ),
		'lot'                  => sanitize_text_field( isset( $record['lot'] ) ? $record['lot'] : '' ),
		'testing_date'         => sanitize_text_field( isset( $record['testing_date'] ) ? $record['testing_date'] : '' ),
		'laboratory'           => sanitize_text_field( isset( $record['laboratory'] ) ? $record['laboratory'] : '' ),
		'test_method'          => sanitize_text_field( isset( $record['test_method'] ) ? $record['test_method'] : '' ),
		'purity'               => sanitize_text_field( isset( $record['purity'] ) ? $record['purity'] : '' ),
		'status'               => sanitize_text_field( isset( $record['status'] ) ? $record['status'] : 'Available' ),
		'current_shipping_lot' => ! empty( $record['current_shipping_lot'] ),
		'file_attachment_id'   => absint( isset( $record['file_attachment_id'] ) ? $record['file_attachment_id'] : 0 ),
		'view_url'             => $view_url,
		'file_kind'            => $file_kind,
	);
}

function phaseone_order_coas_build_assignment( $record, $quantity, $source, $assigned_by = 0 ) {
	$captured_at = gmdate( 'c' );
	return array(
		'assignment_id' => wp_generate_uuid4(),
		'coa_id'        => sanitize_text_field( (string) $record['id'] ),
		'coa_post_id'   => absint( isset( $record['post_id'] ) ? $record['post_id'] : 0 ),
		'lot'           => sanitize_text_field( isset( $record['lot'] ) ? $record['lot'] : '' ),
		'quantity'      => max( 0, (float) $quantity ),
		'assigned_at'   => $captured_at,
		'assigned_by'   => absint( $assigned_by ),
		'source'        => sanitize_key( $source ),
		'coa_snapshot'  => phaseone_order_coas_snapshot_record( $record, $captured_at ),
	);
}

/**
 * Read the existing COA Manager REST collection. It remains the only COA library.
 */
function phaseone_order_coas_catalog( $force = false ) {
	static $request_cache = null;
	if ( ! $force && null !== $request_cache ) {
		return $request_cache;
	}

	if ( ! $force ) {
		$cached = get_transient( PHASEONE_ORDER_COAS_CATALOG_CACHE_KEY );
		if ( is_array( $cached ) ) {
			$request_cache = $cached;
			return $cached;
		}
	}

	$request  = new WP_REST_Request( 'GET', '/phaseone/v1/coas' );
	$response = rest_do_request( $request );
	if ( is_wp_error( $response ) || $response->get_status() >= 400 ) {
		return phaseone_order_coas_json_error( 'coa_catalog_unavailable', 'The COA library is temporarily unavailable.', 503 );
	}

	$data = $response->get_data();
	if ( isset( $data['records'] ) && is_array( $data['records'] ) ) {
		$data = $data['records'];
	} elseif ( isset( $data['coas'] ) && is_array( $data['coas'] ) ) {
		$data = $data['coas'];
	} elseif ( isset( $data['data'] ) && is_array( $data['data'] ) ) {
		$data = $data['data'];
	}

	if ( ! is_array( $data ) ) {
		return phaseone_order_coas_json_error( 'invalid_coa_catalog', 'The COA library returned an invalid response.', 503 );
	}

	$records = array_values( array_filter( array_map( 'phaseone_order_coas_normalize_record', $data ) ) );
	set_transient( PHASEONE_ORDER_COAS_CATALOG_CACHE_KEY, $records, 5 * MINUTE_IN_SECONDS );
	$request_cache = $records;
	return $records;
}

function phaseone_order_coas_record_id_matches( $record, $id ) {
	return hash_equals( (string) $record['id'], (string) $id ) || ( $record['post_id'] && (string) $record['post_id'] === (string) $id );
}

function phaseone_order_coas_item_sku( $item ) {
	$product = $item instanceof WC_Order_Item_Product ? $item->get_product() : false;
	return $product instanceof WC_Product ? (string) $product->get_sku() : '';
}

/**
 * Match only authoritative WooCommerce identifiers. Names and aliases are never
 * used to claim that a certificate belongs to an order item.
 */
function phaseone_order_coas_candidates_for_item( $item, $catalog ) {
	if ( ! $item instanceof WC_Order_Item_Product ) {
		return array();
	}

	$product_id   = absint( $item->get_product_id() );
	$variation_id = absint( $item->get_variation_id() );
	$sku          = strtolower( trim( phaseone_order_coas_item_sku( $item ) ) );
	$variation    = array();
	$sku_matches  = array();
	$product      = array();

	foreach ( $catalog as $record ) {
		$record_variations = isset( $record['variation_ids'] ) ? $record['variation_ids'] : array();
		if ( $variation_id && in_array( $variation_id, $record_variations, true ) ) {
			$variation[] = $record;
			continue;
		}

		// A record tied to another explicit variation cannot fall back to its parent.
		if ( $variation_id && ! empty( $record_variations ) ) {
			continue;
		}

		$record_skus = array_map( 'strtolower', isset( $record['skus'] ) ? $record['skus'] : array() );
		if ( $sku && in_array( $sku, $record_skus, true ) ) {
			$sku_matches[] = $record;
			continue;
		}

		$record_products = array_merge(
			isset( $record['product_ids'] ) ? $record['product_ids'] : array(),
			isset( $record['parent_product_ids'] ) ? $record['parent_product_ids'] : array()
		);
		if ( $product_id && in_array( $product_id, $record_products, true ) ) {
			$product[] = $record;
		}
	}

	$candidates = ! empty( $variation ) ? $variation : ( ! empty( $sku_matches ) ? $sku_matches : $product );
	usort(
		$candidates,
		static function ( $left, $right ) {
			if ( $left['current_shipping_lot'] !== $right['current_shipping_lot'] ) {
				return $left['current_shipping_lot'] ? -1 : 1;
			}
			$left_time  = ! empty( $left['testing_date'] ) ? strtotime( $left['testing_date'] ) : false;
			$right_time = ! empty( $right['testing_date'] ) ? strtotime( $right['testing_date'] ) : false;
			if ( $left_time !== $right_time ) {
				return ( $right_time ? (int) $right_time : 0 ) <=> ( $left_time ? (int) $left_time : 0 );
			}
			return strnatcasecmp( (string) $right['id'], (string) $left['id'] );
		}
	);
	return $candidates;
}

function phaseone_order_coas_preferred_candidate( $item, $catalog ) {
	$candidates = phaseone_order_coas_candidates_for_item( $item, $catalog );
	return empty( $candidates ) ? null : $candidates[0];
}

function phaseone_order_coas_assignments( $item ) {
	if ( ! $item instanceof WC_Order_Item_Product ) {
		return array();
	}
	$records = $item->get_meta( PHASEONE_ORDER_COAS_META_KEY, true );
	if ( ! is_array( $records ) ) {
		return array();
	}
	return array_values(
		array_filter(
			$records,
			static function ( $record ) {
				return is_array( $record ) && ! empty( $record['coa_id'] ) && ! empty( $record['assignment_id'] );
			}
		)
	);
}

function phaseone_order_coas_assignment_record( $assignment, $catalog ) {
	$live_record = null;
	foreach ( $catalog as $candidate ) {
		if ( phaseone_order_coas_record_id_matches( $candidate, $assignment['coa_id'] ) ) {
			$live_record = $candidate;
			break;
		}
	}

	if ( empty( $assignment['coa_snapshot'] ) || ! is_array( $assignment['coa_snapshot'] ) ) {
		return $live_record;
	}

	$snapshot = phaseone_order_coas_snapshot_record(
		$assignment['coa_snapshot'],
		isset( $assignment['coa_snapshot']['captured_at'] ) ? $assignment['coa_snapshot']['captured_at'] : ( isset( $assignment['assigned_at'] ) ? $assignment['assigned_at'] : '' )
	);
	if ( empty( $snapshot ) ) {
		return $live_record;
	}

	// Only hydrate facts that were genuinely absent at capture time. Existing
	// snapshot values, especially the lot and file URL, are never overwritten.
	if ( is_array( $live_record ) ) {
		foreach ( $live_record as $key => $value ) {
			if ( ! array_key_exists( $key, $snapshot ) || '' === $snapshot[ $key ] || array() === $snapshot[ $key ] || 0 === $snapshot[ $key ] ) {
				$snapshot[ $key ] = $value;
			}
		}
	}
	return $snapshot;
}

function phaseone_order_coas_public_assignment( $assignment ) {
	return array(
		'assignment_id' => sanitize_text_field( isset( $assignment['assignment_id'] ) ? $assignment['assignment_id'] : '' ),
		'coa_id'        => sanitize_text_field( isset( $assignment['coa_id'] ) ? $assignment['coa_id'] : '' ),
		'lot'           => sanitize_text_field( isset( $assignment['lot'] ) ? $assignment['lot'] : '' ),
		'quantity'      => (float) ( isset( $assignment['quantity'] ) ? $assignment['quantity'] : 0 ),
		'assigned_at'   => sanitize_text_field( isset( $assignment['assigned_at'] ) ? $assignment['assigned_at'] : '' ),
		'source'        => sanitize_key( isset( $assignment['source'] ) ? $assignment['source'] : 'legacy' ),
		'has_snapshot'  => ! empty( $assignment['coa_snapshot'] ) && is_array( $assignment['coa_snapshot'] ),
	);
}

function phaseone_order_coas_remaining_quantity( $order, $item ) {
	$ordered  = max( 0, (float) $item->get_quantity() );
	$refunded = abs( (float) $order->get_qty_refunded_for_item( $item->get_id() ) );
	return max( 0, $ordered - $refunded );
}

function phaseone_order_coas_product_image( $item ) {
	$product = $item instanceof WC_Order_Item_Product ? $item->get_product() : false;
	if ( ! $product instanceof WC_Product ) {
		return wc_placeholder_img_src( 'woocommerce_thumbnail' );
	}
	$image_id = $product->get_image_id();
	$image    = $image_id ? wp_get_attachment_image_url( $image_id, 'woocommerce_thumbnail' ) : '';
	return $image ? esc_url_raw( $image ) : wc_placeholder_img_src( 'woocommerce_thumbnail' );
}

function phaseone_order_coas_item_options( $item ) {
	$options = array();
	foreach ( $item->get_formatted_meta_data( '' ) as $meta ) {
		$key   = trim( wp_strip_all_tags( (string) $meta->display_key ) );
		$value = trim( wp_strip_all_tags( (string) $meta->display_value ) );
		if ( $key && $value && 0 !== strpos( $key, '_' ) ) {
			$options[] = sanitize_text_field( $key . ': ' . $value );
		}
	}
	return array_values( array_unique( $options ) );
}

function phaseone_order_coas_extract_identity( $node, $depth = 0 ) {
	if ( ! is_array( $node ) || $depth > 5 ) {
		return array();
	}

	$id    = 0;
	$email = '';
	foreach ( array( 'id', 'user_id', 'customer_id' ) as $key ) {
		if ( ! empty( $node[ $key ] ) && is_numeric( $node[ $key ] ) ) {
			$id = absint( $node[ $key ] );
			break;
		}
	}
	foreach ( array( 'email', 'user_email', 'billing_email' ) as $key ) {
		if ( ! empty( $node[ $key ] ) && is_email( $node[ $key ] ) ) {
			$email = sanitize_email( $node[ $key ] );
			break;
		}
	}

	$is_user = $email || isset( $node['first_name'] ) || isset( $node['display_name'] ) || isset( $node['username'] );
	if ( $is_user && ( $id || $email ) ) {
		return array( 'id' => $id, 'email' => $email );
	}

	foreach ( array( 'user', 'account', 'customer', 'profile', 'data' ) as $key ) {
		if ( isset( $node[ $key ] ) ) {
			$identity = phaseone_order_coas_extract_identity( $node[ $key ], $depth + 1 );
			if ( ! empty( $identity ) ) {
				return $identity;
			}
		}
	}
	return array();
}

function phaseone_order_coas_customer_identity( $request ) {
	$authorization = (string) $request->get_header( 'authorization' );
	if ( ! preg_match( '/^Bearer\s+\S+$/i', $authorization ) ) {
		return phaseone_order_coas_json_error( 'not_authenticated', 'Your session has expired. Please sign in again.', 401 );
	}

	$account_request = new WP_REST_Request( 'GET', '/lab/v1/account-token' );
	$account_request->set_header( 'authorization', $authorization );
	$response = rest_do_request( $account_request );
	if ( is_wp_error( $response ) || $response->get_status() >= 400 ) {
		return phaseone_order_coas_json_error( 'not_authenticated', 'Your session has expired. Please sign in again.', 401 );
	}
	$identity = phaseone_order_coas_extract_identity( $response->get_data() );
	if ( empty( $identity['id'] ) && empty( $identity['email'] ) ) {
		return phaseone_order_coas_json_error( 'not_authenticated', 'Your session has expired. Please sign in again.', 401 );
	}
	return $identity;
}

function phaseone_order_coas_query_orders( $args ) {
	$orders = array();
	$page   = 1;
	do {
		$result = wc_get_orders(
			array_merge(
				$args,
				array(
					'status'   => array( 'wc-processing', 'wc-completed' ),
					'limit'    => 50,
					'page'     => $page,
					'paginate' => true,
					'orderby'  => 'date',
					'order'    => 'DESC',
				)
			)
		);
		if ( ! is_object( $result ) || ! isset( $result->orders ) ) {
			break;
		}
		$orders = array_merge( $orders, $result->orders );
		$page++;
	} while ( $page <= (int) $result->max_num_pages );
	return $orders;
}

function phaseone_order_coas_customer_orders( $identity ) {
	$by_id    = ! empty( $identity['id'] ) ? phaseone_order_coas_query_orders( array( 'customer_id' => absint( $identity['id'] ) ) ) : array();
	$by_email = ! empty( $identity['email'] ) ? phaseone_order_coas_query_orders( array( 'billing_email' => sanitize_email( $identity['email'] ) ) ) : array();
	$unique   = array();
	foreach ( array_merge( $by_id, $by_email ) as $order ) {
		if ( $order instanceof WC_Order ) {
			$unique[ $order->get_id() ] = $order;
		}
	}
	usort(
		$unique,
		static function ( $left, $right ) {
			$left_date  = $left->get_date_created();
			$right_date = $right->get_date_created();
			return ( $right_date ? $right_date->getTimestamp() : 0 ) <=> ( $left_date ? $left_date->getTimestamp() : 0 );
		}
	);
	return array_values( $unique );
}

function phaseone_order_coas_is_fully_refunded( $order ) {
	if ( 'refunded' === $order->get_status() ) {
		return true;
	}
	$total = (float) $order->get_total();
	return $total > 0 && (float) $order->get_total_refunded() >= $total - 0.01;
}

function phaseone_order_coas_customer_record( $record ) {
	return array(
		'id'                   => $record['id'],
		'number'               => $record['coa_number'],
		'strength'             => $record['strength'],
		'lot'                  => $record['lot'],
		'testing_date'         => $record['testing_date'],
		'laboratory'           => $record['laboratory'],
		'method'               => $record['test_method'],
		'purity'               => $record['purity'],
		'availability'         => $record['status'],
		'view_url'             => $record['view_url'],
		'download_url'         => 'pdf' === $record['file_kind'] ? $record['view_url'] : '',
		'file_kind'            => $record['file_kind'],
		'current_shipping_lot' => $record['current_shipping_lot'],
	);
}

function phaseone_order_coas_track_available_record( $record, &$available_ids, &$latest_date, &$latest_time ) {
	$available_ids[ $record['id'] ] = true;
	$tested_time = $record['testing_date'] ? strtotime( $record['testing_date'] ) : false;
	if ( $tested_time && $tested_time > $latest_time ) {
		$latest_time = $tested_time;
		$latest_date = $record['testing_date'];
	}
}

function phaseone_order_coas_customer_payload( $request ) {
	$identity = phaseone_order_coas_customer_identity( $request );
	if ( is_wp_error( $identity ) ) {
		return $identity;
	}
	$catalog = phaseone_order_coas_catalog();
	if ( is_wp_error( $catalog ) ) {
		// Saved order-item snapshots remain usable even when COA Manager is
		// temporarily unavailable. Legacy unsnapshotted assignments will show a
		// clear unavailable state until the source recovers.
		$catalog = array();
	}

	$requested_order = ltrim( sanitize_text_field( (string) $request->get_param( 'order' ) ), '#' );
	$items           = array();
	$product_keys    = array();
	$available_ids   = array();
	$latest_date     = '';
	$latest_time     = 0;

	foreach ( phaseone_order_coas_customer_orders( $identity ) as $order ) {
		if ( phaseone_order_coas_is_fully_refunded( $order ) ) {
			continue;
		}
		if ( $requested_order && (string) $order->get_id() !== $requested_order && (string) $order->get_order_number() !== $requested_order ) {
			continue;
		}

		$order_date = $order->get_date_created();
		foreach ( $order->get_items( 'line_item' ) as $item_id => $item ) {
			$remaining = phaseone_order_coas_remaining_quantity( $order, $item );
			if ( $remaining <= 0 ) {
				continue;
			}

			$product_id   = absint( $item->get_product_id() );
			$variation_id = absint( $item->get_variation_id() );
			$candidates  = phaseone_order_coas_candidates_for_item( $item, $catalog );
			$assignments = phaseone_order_coas_assignments( $item );
			if ( empty( $assignments ) && empty( $candidates ) ) {
				continue;
			}
			$product_keys[ $product_id . ':' . $variation_id ] = true;

			$base = array(
				'key'               => $order->get_id() . ':' . $item_id,
				'product_id'        => $product_id,
				'variation_id'      => $variation_id,
				'product_name'      => sanitize_text_field( $item->get_name() ),
				'sku'               => sanitize_text_field( phaseone_order_coas_item_sku( $item ) ),
				'product_image'     => esc_url_raw( phaseone_order_coas_product_image( $item ) ),
				'product_options'   => phaseone_order_coas_item_options( $item ),
				'quantity'          => $remaining,
				'order_id'          => $order->get_id(),
				'order_number'      => sanitize_text_field( (string) $order->get_order_number() ),
				'order_status'      => sanitize_text_field( $order->get_status() ),
				'purchase_date'     => $order_date ? $order_date->date( 'c' ) : '',
			);

			if ( empty( $assignments ) ) {
				if ( ! empty( $candidates ) ) {
					$items[] = array_merge(
						$base,
						array(
							'status'      => 'pending',
							'association' => 'pending_fulfillment',
							'message'     => 'COA pending - a matching certificate has not been captured for this order.',
							'coa'         => null,
						)
					);
				}
				continue;
			}

			foreach ( $assignments as $assignment ) {
				$record = phaseone_order_coas_assignment_record( $assignment, $catalog );

				if ( ! $record || empty( $record['view_url'] ) ) {
					$items[] = array_merge(
						$base,
						array(
							'key'         => $base['key'] . ':' . sanitize_key( $assignment['assignment_id'] ),
							'quantity'    => min( $remaining, (float) $assignment['quantity'] ),
							'status'      => 'pending',
							'association' => 'fulfillment',
							'message'     => 'The confirmed certificate is temporarily unavailable.',
							'lot'         => sanitize_text_field( isset( $assignment['lot'] ) ? $assignment['lot'] : '' ),
							'coa'         => null,
						)
					);
					continue;
				}

				phaseone_order_coas_track_available_record( $record, $available_ids, $latest_date, $latest_time );

				$items[] = array_merge(
					$base,
					array(
						'key'         => $base['key'] . ':' . sanitize_key( $assignment['assignment_id'] ),
						'quantity'    => min( $remaining, (float) $assignment['quantity'] ),
						'status'      => 'available',
						'association' => 'fulfillment',
						'message'     => '',
						'lot'         => $record['lot'] ? $record['lot'] : sanitize_text_field( $assignment['lot'] ),
						'coa'         => phaseone_order_coas_customer_record( $record ),
					)
				);
			}
		}
	}

	$response = new WP_REST_Response(
		array(
			'items'   => $items,
			'summary' => array(
				'available_coas'          => count( $available_ids ),
				'products_purchased'      => count( $product_keys ),
				'most_recent_testing_date'=> $latest_date,
			),
		),
		200
	);
	$response->header( 'Cache-Control', 'private, no-store, max-age=0' );
	$response->header( 'X-Content-Type-Options', 'nosniff' );
	return $response;
}

function phaseone_order_coas_staff_permission() {
	return current_user_can( 'manage_woocommerce' );
}

function phaseone_order_coas_admin_candidate( $record ) {
	return array(
		'id'                   => $record['id'],
		'number'               => $record['coa_number'],
		'product_name'         => $record['product_name'],
		'strength'             => $record['strength'],
		'lot'                  => $record['lot'],
		'testing_date'         => $record['testing_date'],
		'laboratory'           => $record['laboratory'],
		'current_shipping_lot' => $record['current_shipping_lot'],
	);
}

function phaseone_order_coas_admin_order_payload( $order ) {
	$catalog = phaseone_order_coas_catalog();
	if ( is_wp_error( $catalog ) ) {
		return $catalog;
	}

	$items = array();
	foreach ( $order->get_items( 'line_item' ) as $item_id => $item ) {
		$items[] = array(
			'id'                 => $item_id,
			'name'               => sanitize_text_field( $item->get_name() ),
			'sku'                => sanitize_text_field( phaseone_order_coas_item_sku( $item ) ),
			'quantity'           => (float) $item->get_quantity(),
			'remaining_quantity' => phaseone_order_coas_remaining_quantity( $order, $item ),
			'assignments'        => array_map( 'phaseone_order_coas_public_assignment', phaseone_order_coas_assignments( $item ) ),
			'candidates'         => array_map( 'phaseone_order_coas_admin_candidate', phaseone_order_coas_candidates_for_item( $item, $catalog ) ),
		);
	}

	return array(
		'id'       => $order->get_id(),
		'number'   => sanitize_text_field( (string) $order->get_order_number() ),
		'status'   => sanitize_text_field( $order->get_status() ),
		'date'     => $order->get_date_created() ? $order->get_date_created()->date( 'c' ) : '',
		'customer' => sanitize_text_field( trim( $order->get_formatted_billing_full_name() ) ),
		'email'    => sanitize_email( $order->get_billing_email() ),
		'items'    => $items,
	);
}

function phaseone_order_coas_search_orders( $request ) {
	$search = trim( sanitize_text_field( (string) $request->get_param( 'search' ) ) );
	if ( '' === $search ) {
		return phaseone_order_coas_json_error( 'search_required', 'Enter an order number or customer email.', 400 );
	}

	$orders = array();
	if ( ctype_digit( ltrim( $search, '#' ) ) ) {
		$order = wc_get_order( absint( ltrim( $search, '#' ) ) );
		if ( $order instanceof WC_Order ) {
			$orders[] = $order;
		}
	} elseif ( is_email( $search ) ) {
		$orders = wc_get_orders(
			array(
				'billing_email' => sanitize_email( $search ),
				'limit'         => 12,
				'orderby'       => 'date',
				'order'         => 'DESC',
			)
		);
	}

	$payload = array();
	foreach ( $orders as $order ) {
		$value = phaseone_order_coas_admin_order_payload( $order );
		if ( is_wp_error( $value ) ) {
			return $value;
		}
		$payload[] = $value;
	}
	return rest_ensure_response( $payload );
}

function phaseone_order_coas_get_admin_order( $request ) {
	$order = wc_get_order( absint( $request['id'] ) );
	if ( ! $order instanceof WC_Order ) {
		return phaseone_order_coas_json_error( 'order_not_found', 'Order not found.', 404 );
	}
	$payload = phaseone_order_coas_admin_order_payload( $order );
	return is_wp_error( $payload ) ? $payload : rest_ensure_response( $payload );
}

function phaseone_order_coas_get_item( $order, $item_id ) {
	$item = $order instanceof WC_Order ? $order->get_item( absint( $item_id ) ) : false;
	return $item instanceof WC_Order_Item_Product ? $item : false;
}

function phaseone_order_coas_assign( $request ) {
	$order = wc_get_order( absint( $request['id'] ) );
	$item  = phaseone_order_coas_get_item( $order, $request['item'] );
	if ( ! $order instanceof WC_Order || ! $item ) {
		return phaseone_order_coas_json_error( 'order_item_not_found', 'Order item not found.', 404 );
	}
	if ( ! in_array( $order->get_status(), array( 'processing', 'completed' ), true ) ) {
		return phaseone_order_coas_json_error( 'order_not_fulfillable', 'COAs can only be assigned to processing or completed orders.', 409 );
	}
	if ( true !== filter_var( $request->get_param( 'confirmed' ), FILTER_VALIDATE_BOOLEAN ) ) {
		return phaseone_order_coas_json_error( 'confirmation_required', 'Confirm that the selected lot was physically packed.', 400 );
	}

	$coa_id   = sanitize_text_field( (string) $request->get_param( 'coa_id' ) );
	$quantity = (float) wc_stock_amount( $request->get_param( 'quantity' ) );
	if ( '' === $coa_id || $quantity <= 0 ) {
		return phaseone_order_coas_json_error( 'invalid_assignment', 'Choose a COA and enter a valid quantity.', 400 );
	}

	$catalog = phaseone_order_coas_catalog();
	if ( is_wp_error( $catalog ) ) {
		return $catalog;
	}
	$record = null;
	foreach ( phaseone_order_coas_candidates_for_item( $item, $catalog ) as $candidate ) {
		if ( phaseone_order_coas_record_id_matches( $candidate, $coa_id ) ) {
			$record = $candidate;
			break;
		}
	}
	if ( ! $record ) {
		return phaseone_order_coas_json_error( 'coa_mismatch', 'That certificate is not associated with this product or variation.', 400 );
	}

	$remaining   = phaseone_order_coas_remaining_quantity( $order, $item );
	$assignments = phaseone_order_coas_assignments( $item );
	$assigned    = 0;
	$existing    = null;
	foreach ( $assignments as $index => $assignment ) {
		$assigned += (float) $assignment['quantity'];
		if ( (string) $assignment['coa_id'] === (string) $record['id'] ) {
			$existing = $index;
		}
	}
	if ( $assigned + $quantity > $remaining + 0.0001 ) {
		return phaseone_order_coas_json_error( 'quantity_exceeded', 'Assigned lot quantities cannot exceed the unrefunded item quantity.', 409 );
	}

	if ( null !== $existing ) {
		$assignments[ $existing ]['quantity'] = (float) $assignments[ $existing ]['quantity'] + $quantity;
		$assignments[ $existing ]['source'] = 'fulfillment_confirmed';
		if ( empty( $assignments[ $existing ]['coa_snapshot'] ) ) {
			$assignments[ $existing ]['coa_snapshot'] = phaseone_order_coas_snapshot_record( $record, isset( $assignments[ $existing ]['assigned_at'] ) ? $assignments[ $existing ]['assigned_at'] : '' );
		}
	} else {
		$assignments[] = phaseone_order_coas_build_assignment( $record, $quantity, 'fulfillment_confirmed', get_current_user_id() );
	}

	$item->update_meta_data( PHASEONE_ORDER_COAS_META_KEY, array_values( $assignments ) );
	$item->save();
	$order->add_order_note( sprintf( 'Fulfillment COA confirmed for %1$s: lot %2$s, quantity %3$s.', $item->get_name(), $record['lot'], wc_format_decimal( $quantity ) ) );
	$order->save();

	$payload = phaseone_order_coas_admin_order_payload( $order );
	return is_wp_error( $payload ) ? $payload : rest_ensure_response( $payload );
}

function phaseone_order_coas_remove_assignment( $request ) {
	$order = wc_get_order( absint( $request['id'] ) );
	$item  = phaseone_order_coas_get_item( $order, $request['item'] );
	if ( ! $order instanceof WC_Order || ! $item ) {
		return phaseone_order_coas_json_error( 'order_item_not_found', 'Order item not found.', 404 );
	}

	$target      = sanitize_text_field( (string) $request['assignment'] );
	$remaining   = array();
	$removed_lot = '';
	foreach ( phaseone_order_coas_assignments( $item ) as $assignment ) {
		if ( ! empty( $assignment['assignment_id'] ) && hash_equals( (string) $assignment['assignment_id'], $target ) ) {
			$removed_lot = isset( $assignment['lot'] ) ? sanitize_text_field( $assignment['lot'] ) : '';
			continue;
		}
		$remaining[] = $assignment;
	}
	if ( '' === $removed_lot ) {
		return phaseone_order_coas_json_error( 'assignment_not_found', 'COA assignment not found.', 404 );
	}

	if ( empty( $remaining ) ) {
		$item->delete_meta_data( PHASEONE_ORDER_COAS_META_KEY );
	} else {
		$item->update_meta_data( PHASEONE_ORDER_COAS_META_KEY, array_values( $remaining ) );
	}
	$item->save();
	$order->add_order_note( sprintf( 'Fulfillment COA assignment removed from %1$s: lot %2$s.', $item->get_name(), $removed_lot ) );
	$order->save();

	$payload = phaseone_order_coas_admin_order_payload( $order );
	return is_wp_error( $payload ) ? $payload : rest_ensure_response( $payload );
}

/**
 * Idempotently attach the preferred COA to an order item. Existing manual or
 * automatic assignments are never replaced; legacy assignments are only
 * enriched with an immutable snapshot of their already-selected COA.
 */
function phaseone_order_coas_capture_item_snapshot( $item, $catalog, $source, $quantity = null ) {
	$result = array( 'assigned' => 0, 'enriched' => 0, 'matched' => 0 );
	if ( ! $item instanceof WC_Order_Item_Product || ! is_array( $catalog ) ) {
		return $result;
	}

	$assignments = phaseone_order_coas_assignments( $item );
	if ( ! empty( $assignments ) ) {
		$changed = false;
		foreach ( $assignments as $index => $assignment ) {
			if ( ! empty( $assignment['coa_snapshot'] ) ) {
				continue;
			}
			foreach ( $catalog as $record ) {
				if ( phaseone_order_coas_record_id_matches( $record, $assignment['coa_id'] ) ) {
					$assignments[ $index ]['coa_snapshot'] = phaseone_order_coas_snapshot_record( $record, isset( $assignment['assigned_at'] ) ? $assignment['assigned_at'] : '' );
					if ( empty( $assignments[ $index ]['source'] ) ) {
						$assignments[ $index ]['source'] = 'legacy_assignment';
					}
					$changed = true;
					$result['enriched']++;
					break;
				}
			}
		}
		if ( $changed ) {
			$item->update_meta_data( PHASEONE_ORDER_COAS_META_KEY, array_values( $assignments ) );
			$item->save();
		}
		return $result;
	}

	$record = phaseone_order_coas_preferred_candidate( $item, $catalog );
	if ( ! is_array( $record ) ) {
		return $result;
	}
	$result['matched'] = 1;
	$quantity = null === $quantity ? (float) $item->get_quantity() : (float) $quantity;
	if ( $quantity <= 0 ) {
		return $result;
	}

	$item->update_meta_data(
		PHASEONE_ORDER_COAS_META_KEY,
		array( phaseone_order_coas_build_assignment( $record, $quantity, $source, 0 ) )
	);
	$item->save();
	$result['assigned'] = 1;
	return $result;
}

function phaseone_order_coas_capture_order_snapshots( $order_or_id, $source = 'purchase_snapshot', $catalog = null ) {
	$order = $order_or_id instanceof WC_Order ? $order_or_id : wc_get_order( absint( $order_or_id ) );
	if ( ! $order instanceof WC_Order ) {
		return phaseone_order_coas_json_error( 'order_not_found', 'Order not found.', 404 );
	}
	if ( null === $catalog ) {
		$catalog = phaseone_order_coas_catalog();
	}
	if ( is_wp_error( $catalog ) ) {
		return $catalog;
	}

	$totals = array( 'assigned' => 0, 'enriched' => 0, 'matched' => 0 );
	foreach ( $order->get_items( 'line_item' ) as $item ) {
		$quantity = phaseone_order_coas_remaining_quantity( $order, $item );
		$captured = phaseone_order_coas_capture_item_snapshot( $item, $catalog, $source, $quantity );
		foreach ( $totals as $key => $value ) {
			$totals[ $key ] += isset( $captured[ $key ] ) ? (int) $captured[ $key ] : 0;
		}
	}

	if ( 'historical_backfill' === $source && $totals['assigned'] > 0 ) {
		$order->add_order_note(
			sprintf(
				'Historical COA snapshot assigned automatically to %1$d order item(s) from the COA Manager catalog on %2$s.',
				$totals['assigned'],
				gmdate( 'Y-m-d H:i \U\T\C' )
			)
		);
		$order->save();
	}
	return $totals;
}

function phaseone_order_coas_capture_new_order_item( $item_id, $item, $order_id ) {
	if ( ! $item instanceof WC_Order_Item_Product || ! $order_id ) {
		return;
	}
	$catalog = phaseone_order_coas_catalog();
	if ( is_wp_error( $catalog ) ) {
		return;
	}
	phaseone_order_coas_capture_item_snapshot( $item, $catalog, 'purchase_snapshot' );
}

function phaseone_order_coas_retry_order_snapshot( $order_id ) {
	phaseone_order_coas_capture_order_snapshots( $order_id, 'purchase_snapshot' );
}

add_action( 'woocommerce_new_order_item', 'phaseone_order_coas_capture_new_order_item', 20, 3 );
add_action( 'woocommerce_payment_complete', 'phaseone_order_coas_retry_order_snapshot', 20 );
add_action( 'woocommerce_order_status_processing', 'phaseone_order_coas_retry_order_snapshot', 20 );
add_action( 'woocommerce_order_status_completed', 'phaseone_order_coas_retry_order_snapshot', 20 );

function phaseone_order_coas_schedule_backfill( $delay = 10 ) {
	if ( ! wp_next_scheduled( PHASEONE_ORDER_COAS_BACKFILL_HOOK ) ) {
		wp_schedule_single_event( time() + max( 1, absint( $delay ) ), PHASEONE_ORDER_COAS_BACKFILL_HOOK );
	}
}

function phaseone_order_coas_initialize_backfill( $force = false ) {
	$current = (string) get_option( PHASEONE_ORDER_COAS_DATA_VERSION_OPTION, '0.0.0' );
	$state   = get_option( PHASEONE_ORDER_COAS_BACKFILL_OPTION, array() );
	if ( ! $force && version_compare( $current, PHASEONE_ORDER_COAS_DATA_VERSION, '>=' ) ) {
		return is_array( $state ) ? $state : array();
	}
	if ( ! $force && is_array( $state ) && in_array( isset( $state['status'] ) ? $state['status'] : '', array( 'pending', 'running', 'waiting' ), true ) ) {
		phaseone_order_coas_schedule_backfill();
		return $state;
	}

	$state = array(
		'schema'           => 1,
		'status'           => 'pending',
		'page'             => 1,
		'cutoff'           => time(),
		'scanned_orders'   => 0,
		'assigned_items'   => 0,
		'enriched_items'   => 0,
		'matched_items'    => 0,
		'started_at'       => gmdate( 'c' ),
		'completed_at'     => '',
		'last_error'       => '',
	);
	update_option( PHASEONE_ORDER_COAS_BACKFILL_OPTION, $state, false );
	phaseone_order_coas_schedule_backfill();
	return $state;
}

function phaseone_order_coas_maybe_initialize_backfill() {
	if ( version_compare( (string) get_option( PHASEONE_ORDER_COAS_DATA_VERSION_OPTION, '0.0.0' ), PHASEONE_ORDER_COAS_DATA_VERSION, '<' ) ) {
		phaseone_order_coas_initialize_backfill();
	}
}
add_action( 'init', 'phaseone_order_coas_maybe_initialize_backfill', 30 );

function phaseone_order_coas_acquire_backfill_lock() {
	$locked_at = absint( get_option( PHASEONE_ORDER_COAS_BACKFILL_LOCK_OPTION, 0 ) );
	if ( $locked_at && $locked_at > time() - 300 ) {
		return false;
	}
	if ( $locked_at ) {
		delete_option( PHASEONE_ORDER_COAS_BACKFILL_LOCK_OPTION );
	}
	return add_option( PHASEONE_ORDER_COAS_BACKFILL_LOCK_OPTION, time(), '', 'no' );
}

function phaseone_order_coas_run_backfill_batch() {
	if ( ! phaseone_order_coas_acquire_backfill_lock() ) {
		return;
	}
	try {
		phaseone_order_coas_run_backfill_batch_unlocked();
	} finally {
		delete_option( PHASEONE_ORDER_COAS_BACKFILL_LOCK_OPTION );
	}
}

function phaseone_order_coas_run_backfill_batch_unlocked() {
	$state = get_option( PHASEONE_ORDER_COAS_BACKFILL_OPTION, array() );
	if ( ! is_array( $state ) || 'complete' === ( isset( $state['status'] ) ? $state['status'] : '' ) ) {
		return;
	}
	if ( ! function_exists( 'wc_get_orders' ) ) {
		$state['status'] = 'waiting';
		$state['last_error'] = 'WooCommerce is not available.';
		update_option( PHASEONE_ORDER_COAS_BACKFILL_OPTION, $state, false );
		phaseone_order_coas_schedule_backfill( 300 );
		return;
	}

	$catalog = phaseone_order_coas_catalog();
	if ( is_wp_error( $catalog ) ) {
		$state['status'] = 'waiting';
		$state['last_error'] = $catalog->get_error_message();
		update_option( PHASEONE_ORDER_COAS_BACKFILL_OPTION, $state, false );
		phaseone_order_coas_schedule_backfill( 300 );
		return;
	}

	$page   = max( 1, absint( isset( $state['page'] ) ? $state['page'] : 1 ) );
	$result = wc_get_orders(
		array(
			'status'   => array( 'wc-processing', 'wc-completed' ),
			'limit'    => 20,
			'page'     => $page,
			'paginate' => true,
			'orderby'  => 'ID',
			'order'    => 'ASC',
		)
	);
	if ( ! is_object( $result ) || ! isset( $result->orders ) ) {
		$state['status'] = 'waiting';
		$state['last_error'] = 'WooCommerce did not return a paginated order result.';
		update_option( PHASEONE_ORDER_COAS_BACKFILL_OPTION, $state, false );
		phaseone_order_coas_schedule_backfill( 300 );
		return;
	}

	$state['status'] = 'running';
	$state['last_error'] = '';
	foreach ( $result->orders as $order ) {
		if ( ! $order instanceof WC_Order ) {
			continue;
		}
		$created = $order->get_date_created();
		if ( $created && $created->getTimestamp() > absint( $state['cutoff'] ) ) {
			continue;
		}
		$state['scanned_orders']++;
		if ( phaseone_order_coas_is_fully_refunded( $order ) ) {
			continue;
		}
		$captured = phaseone_order_coas_capture_order_snapshots( $order, 'historical_backfill', $catalog );
		if ( is_wp_error( $captured ) ) {
			continue;
		}
		$state['assigned_items'] += (int) $captured['assigned'];
		$state['enriched_items'] += (int) $captured['enriched'];
		$state['matched_items']  += (int) $captured['matched'];
	}

	$max_pages = max( 1, absint( isset( $result->max_num_pages ) ? $result->max_num_pages : 1 ) );
	if ( $page < $max_pages ) {
		$state['page'] = $page + 1;
		update_option( PHASEONE_ORDER_COAS_BACKFILL_OPTION, $state, false );
		phaseone_order_coas_schedule_backfill( 5 );
		return;
	}

	$state['status'] = 'complete';
	$state['completed_at'] = gmdate( 'c' );
	update_option( PHASEONE_ORDER_COAS_BACKFILL_OPTION, $state, false );
	update_option( PHASEONE_ORDER_COAS_DATA_VERSION_OPTION, PHASEONE_ORDER_COAS_DATA_VERSION, false );
}
add_action( PHASEONE_ORDER_COAS_BACKFILL_HOOK, 'phaseone_order_coas_run_backfill_batch' );

function phaseone_order_coas_start_backfill_admin() {
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		wp_die( esc_html__( 'You are not allowed to manage order COAs.', 'phaseone-order-coas' ) );
	}
	check_admin_referer( 'phaseone_order_coas_start_backfill' );
	$restart = ! empty( $_POST['restart'] );
	phaseone_order_coas_initialize_backfill( $restart );
	phaseone_order_coas_run_backfill_batch();
	wp_safe_redirect( add_query_arg( array( 'page' => 'phaseone-order-coas', 'backfill' => 'started' ), admin_url( 'admin.php' ) ) );
	exit;
}
add_action( 'admin_post_phaseone_order_coas_start_backfill', 'phaseone_order_coas_start_backfill_admin' );

add_action(
	'rest_api_init',
	static function () {
		register_rest_route(
			'phaseone/v1',
			'/account/coas',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => '__return_true',
				'callback'            => 'phaseone_order_coas_customer_payload',
				'args'                => array(
					'order' => array( 'sanitize_callback' => 'sanitize_text_field' ),
				),
			)
		);
		register_rest_route(
			'phaseone/v1',
			'/order-coas/orders',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => 'phaseone_order_coas_staff_permission',
				'callback'            => 'phaseone_order_coas_search_orders',
			)
		);
		register_rest_route(
			'phaseone/v1',
			'/order-coas/orders/(?P<id>\d+)',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => 'phaseone_order_coas_staff_permission',
				'callback'            => 'phaseone_order_coas_get_admin_order',
			)
		);
		register_rest_route(
			'phaseone/v1',
			'/order-coas/orders/(?P<id>\d+)/items/(?P<item>\d+)/assign',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'permission_callback' => 'phaseone_order_coas_staff_permission',
				'callback'            => 'phaseone_order_coas_assign',
			)
		);
		register_rest_route(
			'phaseone/v1',
			'/order-coas/orders/(?P<id>\d+)/items/(?P<item>\d+)/assignments/(?P<assignment>[a-f0-9-]+)',
			array(
				'methods'             => WP_REST_Server::DELETABLE,
				'permission_callback' => 'phaseone_order_coas_staff_permission',
				'callback'            => 'phaseone_order_coas_remove_assignment',
			)
		);
	}
);

add_action(
	'admin_menu',
	static function () {
		add_submenu_page(
			'woocommerce',
			'Order COAs',
			'Order COAs',
			'manage_woocommerce',
			'phaseone-order-coas',
			'phaseone_order_coas_render_admin'
		);
	}
);

add_action(
	'admin_enqueue_scripts',
	static function ( $hook ) {
		if ( 'woocommerce_page_phaseone-order-coas' !== $hook ) {
			return;
		}
		wp_enqueue_style( 'phaseone-order-coas', plugin_dir_url( __FILE__ ) . 'assets/admin.css', array(), PHASEONE_ORDER_COAS_VERSION );
		wp_enqueue_script( 'phaseone-order-coas', plugin_dir_url( __FILE__ ) . 'assets/admin.js', array(), PHASEONE_ORDER_COAS_VERSION, true );
		wp_localize_script(
			'phaseone-order-coas',
			'PhaseOneOrderCoas',
			array(
				'restRoot' => esc_url_raw( rest_url( 'phaseone/v1/order-coas' ) ),
				'nonce'    => wp_create_nonce( 'wp_rest' ),
			)
		);
	}
);

function phaseone_order_coas_render_admin() {
	if ( ! current_user_can( 'manage_woocommerce' ) ) {
		return;
	}
	$backfill        = get_option( PHASEONE_ORDER_COAS_BACKFILL_OPTION, array() );
	$backfill        = is_array( $backfill ) ? $backfill : array();
	$backfill_status = sanitize_key( isset( $backfill['status'] ) ? $backfill['status'] : 'pending' );
	$backfill_active = in_array( $backfill_status, array( 'pending', 'running', 'waiting' ), true );
	?>
	<div class="wrap poco-shell">
		<header class="poco-header">
			<div>
				<span class="poco-kicker">PHASE ONE FULFILLMENT</span>
				<h1>Order COA assignment</h1>
				<p>Orders automatically preserve the COA active at purchase. Fulfillment can still correct the assignment when the physical lot differs.</p>
			</div>
			<span class="poco-source">COA Manager is the certificate source</span>
		</header>

		<main class="poco-layout">
			<section class="poco-panel poco-backfill">
				<div>
					<span class="poco-kicker">HISTORICAL ORDERS</span>
					<h2><?php echo 'complete' === $backfill_status ? 'Historical assignment complete' : 'Historical assignment in progress'; ?></h2>
					<p><?php echo 'complete' === $backfill_status ? 'Existing processing and completed orders now retain the current matching COA as a historical snapshot.' : 'The migration is processing eligible orders in small background batches without delaying this page.'; ?></p>
					<?php if ( ! empty( $backfill['last_error'] ) ) : ?><p class="poco-backfill-error"><?php echo esc_html( $backfill['last_error'] ); ?></p><?php endif; ?>
				</div>
				<div class="poco-backfill-stats" aria-label="Historical COA migration status">
					<span><strong><?php echo esc_html( (string) absint( isset( $backfill['scanned_orders'] ) ? $backfill['scanned_orders'] : 0 ) ); ?></strong>orders checked</span>
					<span><strong><?php echo esc_html( (string) absint( isset( $backfill['assigned_items'] ) ? $backfill['assigned_items'] : 0 ) ); ?></strong>items assigned</span>
					<span><strong><?php echo esc_html( (string) absint( isset( $backfill['enriched_items'] ) ? $backfill['enriched_items'] : 0 ) ); ?></strong>existing saved</span>
				</div>
				<form action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post">
					<input type="hidden" name="action" value="phaseone_order_coas_start_backfill">
					<input type="hidden" name="restart" value="<?php echo $backfill_active ? '0' : '1'; ?>">
					<?php wp_nonce_field( 'phaseone_order_coas_start_backfill' ); ?>
					<button type="submit"><?php echo $backfill_active ? 'Process next batch now' : 'Run historical assignment again'; ?></button>
				</form>
			</section>
			<section class="poco-panel">
				<label class="poco-label" for="poco-search">Find an order</label>
				<form id="poco-search-form" class="poco-search">
					<input id="poco-search" type="search" autocomplete="off" placeholder="Order # or customer email" required>
					<button type="submit">Find order</button>
				</form>
				<div id="poco-search-status" class="poco-status" aria-live="polite"></div>
				<div id="poco-results" class="poco-results"></div>
			</section>

			<section id="poco-workspace" class="poco-panel poco-workspace" hidden>
				<div id="poco-order"></div>
				<div id="poco-save-status" class="poco-status" aria-live="polite"></div>
			</section>
		</main>
	</div>
	<?php
}
