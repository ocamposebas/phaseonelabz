<?php

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Bulk_Access_Requests {
	private const STATUSES = array( 'pending', 'approved', 'rejected', 'archived' );

	public static function submit( int $customer_id, string $customer_note = '' ): array|WP_Error {
		global $wpdb;
		$status = PhaseOne_Bulk_Access::customer_status( $customer_id );
		if ( empty( $status['customer_id'] ) ) {
			return new WP_Error( 'phaseone_bulk_login_required', 'Sign in before requesting Bulk access.', array( 'status' => 401 ) );
		}
		if ( empty( $status['eligible'] ) ) {
			return new WP_Error( 'phaseone_bulk_not_eligible', 'At least one completed order is required before requesting Bulk access.', array( 'status' => 409 ) );
		}
		if ( 'special' === $status['tier'] ) {
			return new WP_Error( 'phaseone_bulk_already_approved', 'This account already has Special Bulk Tier.', array( 'status' => 409 ) );
		}

		$table = PhaseOne_Bulk_Installer::requests_table();
		$pending_id = absint(
			$wpdb->get_var(
				$wpdb->prepare(
					"SELECT id FROM {$table} WHERE customer_id = %d AND status = %s ORDER BY created_at DESC LIMIT 1",
					$customer_id,
					'pending'
				)
			)
		);
		$now = gmdate( 'Y-m-d H:i:s' );
		$values = array(
			'customer_name'   => sanitize_text_field( $status['name'] ),
			'customer_email'  => sanitize_email( $status['email'] ),
			'completed_orders' => (int) $status['completed_orders'],
			'eligible'        => 1,
			'customer_note'   => sanitize_textarea_field( $customer_note ),
			'updated_at'      => $now,
		);
		if ( $pending_id > 0 ) {
			$wpdb->update( $table, $values, array( 'id' => $pending_id ), array( '%s', '%s', '%d', '%d', '%s', '%s' ), array( '%d' ) );
			return self::get( $pending_id );
		}
		$values += array(
			'customer_id' => $customer_id,
			'status'      => 'pending',
			'created_at'  => $now,
		);
		$inserted = $wpdb->insert(
			$table,
			$values,
			array( '%s', '%s', '%d', '%d', '%s', '%s', '%d', '%s', '%s' )
		);
		if ( false === $inserted ) {
			return new WP_Error( 'phaseone_bulk_request_failed', 'The Bulk access request could not be saved.', array( 'status' => 503 ) );
		}
		return self::get( (int) $wpdb->insert_id );
	}

	public static function get( int $id ): array|WP_Error {
		global $wpdb;
		$row = $wpdb->get_row(
			$wpdb->prepare( 'SELECT * FROM ' . PhaseOne_Bulk_Installer::requests_table() . ' WHERE id = %d', $id ),
			ARRAY_A
		);
		return is_array( $row ) ? $row : new WP_Error( 'phaseone_bulk_request_missing', 'Bulk access request not found.' );
	}

	public static function current_for_customer( int $customer_id ): ?array {
		global $wpdb;
		$row = $wpdb->get_row(
			$wpdb->prepare(
				'SELECT * FROM ' . PhaseOne_Bulk_Installer::requests_table() . ' WHERE customer_id = %d ORDER BY created_at DESC LIMIT 1',
				$customer_id
			),
			ARRAY_A
		);
		return is_array( $row ) ? $row : null;
	}

	public static function list_all( string $status = '' ): array {
		global $wpdb;
		$table = PhaseOne_Bulk_Installer::requests_table();
		if ( in_array( $status, self::STATUSES, true ) ) {
			$rows = $wpdb->get_results( $wpdb->prepare( "SELECT * FROM {$table} WHERE status = %s ORDER BY created_at DESC LIMIT 500", $status ), ARRAY_A );
		} else {
			$rows = $wpdb->get_results( "SELECT * FROM {$table} ORDER BY created_at DESC LIMIT 500", ARRAY_A );
		}
		return is_array( $rows ) ? $rows : array();
	}

	public static function review( int $id, string $operation, string $internal_note = '' ): bool|WP_Error {
		global $wpdb;
		$request = self::get( $id );
		if ( is_wp_error( $request ) ) {
			return $request;
		}
		$operation = sanitize_key( $operation );
		if ( ! in_array( $operation, array( 'approve', 'reject', 'archive' ), true ) ) {
			return new WP_Error( 'phaseone_bulk_request_action_invalid', 'Choose a valid request action.' );
		}
		if ( 'approve' === $operation ) {
			$granted = PhaseOne_Bulk_Access::grant_special_tier( (int) $request['customer_id'], $internal_note );
			if ( is_wp_error( $granted ) ) {
				return $granted;
			}
		}
		$status = array( 'approve' => 'approved', 'reject' => 'rejected', 'archive' => 'archived' )[ $operation ];
		$updated = $wpdb->update(
			PhaseOne_Bulk_Installer::requests_table(),
			array(
				'status'        => $status,
				'internal_note' => sanitize_textarea_field( $internal_note ),
				'reviewed_by'   => get_current_user_id(),
				'reviewed_at'   => gmdate( 'Y-m-d H:i:s' ),
				'updated_at'    => gmdate( 'Y-m-d H:i:s' ),
			),
			array( 'id' => $id ),
			array( '%s', '%s', '%d', '%s', '%s' ),
			array( '%d' )
		);
		return false === $updated ? new WP_Error( 'phaseone_bulk_request_update_failed', 'The request could not be updated.' ) : true;
	}
}
