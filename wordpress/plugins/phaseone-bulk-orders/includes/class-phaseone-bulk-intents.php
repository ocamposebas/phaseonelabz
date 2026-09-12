<?php

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Bulk_Intents {
	private static function lookup( string $token ): string {
		return hash_hmac( 'sha256', $token, wp_salt( 'auth' ) );
	}

	public static function create( array $session, array $quote ): array|WP_Error {
		global $wpdb;
		$token      = bin2hex( random_bytes( 32 ) );
		$settings   = PhaseOne_Bulk_Installer::settings();
		$expires_ts = min(
			time() + ( (int) $settings['intent_minutes'] * MINUTE_IN_SECONDS ),
			(int) strtotime( $session['expires_at'] . ' UTC' )
		);
		$now        = gmdate( 'Y-m-d H:i:s' );
		$payload    = wp_json_encode(
			array_map(
				static fn( array $line ): array => array(
					'product_id'   => (int) $line['product_id'],
					'variation_id' => (int) $line['variation_id'],
					'quantity'     => (int) $line['quantity'],
				),
				$quote['lines']
			)
		);

		$inserted = $wpdb->insert(
			PhaseOne_Bulk_Installer::intents_table(),
			array(
				'token_lookup'      => self::lookup( $token ),
				'session_id'       => (int) $session['id'],
				'access_id'        => (int) $session['access_id'],
				'customer_id'      => 0,
				'cart_payload'     => $payload,
				'quote_fingerprint' => (string) $quote['fingerprint'],
				'status'           => 'open',
				'order_id'         => 0,
				'expires_at'       => gmdate( 'Y-m-d H:i:s', $expires_ts ),
				'created_at'       => $now,
				'updated_at'       => $now,
			),
			array( '%s', '%d', '%d', '%d', '%s', '%s', '%s', '%d', '%s', '%s', '%s' )
		);

		if ( false === $inserted ) {
			return new WP_Error( 'phaseone_bulk_intent_failed', 'The Bulk checkout could not be prepared.', array( 'status' => 503 ) );
		}

		return array(
			'token'      => $token,
			'intent_id'  => (int) $wpdb->insert_id,
			'expires_at' => gmdate( DATE_ATOM, $expires_ts ),
			'max_age'    => max( 1, $expires_ts - time() ),
		);
	}

	public static function resolve( string $token, array $session ): array|WP_Error {
		global $wpdb;
		if ( strlen( $token ) !== 64 || ! ctype_xdigit( $token ) ) {
			return self::invalid();
		}
		$table = PhaseOne_Bulk_Installer::intents_table();
		$row   = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$table} WHERE token_lookup = %s LIMIT 1", self::lookup( $token ) ), ARRAY_A );
		$now   = gmdate( 'Y-m-d H:i:s' );
		if ( ! is_array( $row ) || ! in_array( $row['status'], array( 'open', 'processing', 'ordered' ), true ) || $row['expires_at'] <= $now || (int) $row['session_id'] !== (int) $session['id'] || (int) $row['access_id'] !== (int) $session['access_id'] ) {
			return self::invalid();
		}
		$items = json_decode( (string) $row['cart_payload'], true );
		if ( ! is_array( $items ) ) {
			return self::invalid();
		}
		$row['items'] = $items;
		return $row;
	}

	public static function bind_customer( int $intent_id, int $customer_id ): bool {
		global $wpdb;
		$current = $wpdb->get_var( $wpdb->prepare( 'SELECT customer_id FROM ' . PhaseOne_Bulk_Installer::intents_table() . ' WHERE id = %d', $intent_id ) );
		if ( (int) $current === $customer_id && $customer_id > 0 ) {
			return true;
		}
		$updated = $wpdb->query(
			$wpdb->prepare(
				'UPDATE ' . PhaseOne_Bulk_Installer::intents_table() . ' SET customer_id = %d, updated_at = %s WHERE id = %d AND status = %s AND (customer_id = 0 OR customer_id = %d)',
				$customer_id,
				gmdate( 'Y-m-d H:i:s' ),
				$intent_id,
				'open',
				$customer_id
			)
		);
		return 1 === $updated;
	}

	public static function claim( int $intent_id ): true|WP_Error {
		global $wpdb;
		$updated = $wpdb->query(
			$wpdb->prepare(
				'UPDATE ' . PhaseOne_Bulk_Installer::intents_table() . ' SET status = %s, updated_at = %s WHERE id = %d AND status = %s AND expires_at > %s',
				'processing',
				gmdate( 'Y-m-d H:i:s' ),
				$intent_id,
				'open',
				gmdate( 'Y-m-d H:i:s' )
			)
		);
		return 1 === $updated ? true : new WP_Error( 'phaseone_bulk_intent_claimed', 'This Bulk checkout is already being processed.', array( 'status' => 409 ) );
	}

	public static function release( int $intent_id ): void {
		global $wpdb;
		$wpdb->update(
			PhaseOne_Bulk_Installer::intents_table(),
			array( 'status' => 'open', 'updated_at' => gmdate( 'Y-m-d H:i:s' ) ),
			array( 'id' => $intent_id, 'status' => 'processing', 'order_id' => 0 ),
			array( '%s', '%s' ),
			array( '%d', '%s', '%d' )
		);
	}

	public static function mark_order( int $intent_id, int $order_id ): bool {
		global $wpdb;
		$updated = $wpdb->update(
			PhaseOne_Bulk_Installer::intents_table(),
			array(
				'status'     => 'ordered',
				'order_id'   => $order_id,
				'updated_at' => gmdate( 'Y-m-d H:i:s' ),
			),
			array( 'id' => $intent_id, 'status' => 'processing' ),
			array( '%s', '%d', '%s' ),
			array( '%d', '%s' )
		);
		return 1 === $updated;
	}

	private static function invalid(): WP_Error {
		return new WP_Error( 'phaseone_bulk_intent_invalid', 'This Bulk checkout session is invalid or expired.', array( 'status' => 401 ) );
	}
}
