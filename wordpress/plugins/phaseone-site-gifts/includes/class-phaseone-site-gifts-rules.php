<?php

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Site_Gifts_Rules {
	public const OPTION_KEY = 'phaseone_site_gifts_config';
	public const SCHEMA_VERSION = 1;

	private static ?array $request_cache = null;

	public static function defaults(): array {
		return array(
			'schema_version' => self::SCHEMA_VERSION,
			'mode'           => 'highest',
			'tiers'          => array(),
		);
	}

	public static function install_defaults(): void {
		if ( false === get_option( self::OPTION_KEY, false ) ) {
			add_option( self::OPTION_KEY, self::defaults(), '', false );
		}
	}

	public static function get(): array {
		if ( null !== self::$request_cache ) {
			return self::$request_cache;
		}

		$stored = get_option( self::OPTION_KEY, array() );
		self::$request_cache = self::sanitize( is_array( $stored ) ? $stored : array(), false );

		return self::$request_cache;
	}

	public static function update( array $config ): bool {
		$clean = self::sanitize( $config, true );
		self::$request_cache = $clean;

		return update_option( self::OPTION_KEY, $clean, false );
	}

	public static function sanitize( array $config, bool $generate_ids = true ): array {
		$mode = sanitize_key( (string) ( $config['mode'] ?? 'highest' ) );
		if ( ! in_array( $mode, array( 'highest', 'cumulative' ), true ) ) {
			$mode = 'highest';
		}

		$tiers = array();
		foreach ( (array) ( $config['tiers'] ?? array() ) as $raw ) {
			if ( ! is_array( $raw ) || ! empty( $raw['_delete'] ) ) {
				continue;
			}

			$id = sanitize_key( (string) ( $raw['id'] ?? '' ) );
			if ( '' === $id && $generate_ids ) {
				$id = 'gift-' . strtolower( wp_generate_password( 12, false, false ) );
			}
			if ( '' === $id ) {
				continue;
			}

			$product_id   = absint( $raw['product_id'] ?? 0 );
			$variation_id = absint( $raw['variation_id'] ?? 0 );
			$gift_id      = absint( $raw['gift_product_id'] ?? 0 );

			if ( $gift_id > 0 && function_exists( 'wc_get_product' ) ) {
				$selected = wc_get_product( $gift_id );
				if ( $selected instanceof WC_Product_Variation ) {
					$product_id   = (int) $selected->get_parent_id();
					$variation_id = (int) $selected->get_id();
				} elseif ( $selected instanceof WC_Product ) {
					$product_id   = (int) $selected->get_id();
					$variation_id = 0;
				}
			}

			$threshold = round( max( 0, (float) ( $raw['threshold'] ?? 0 ) ), 2 );
			$quantity  = max( 1, min( 99, absint( $raw['quantity'] ?? 1 ) ) );
			$priority  = max( 0, min( 9999, absint( $raw['priority'] ?? 10 ) ) );

			$tiers[] = array(
				'id'           => $id,
				'name'         => sanitize_text_field( (string) ( $raw['name'] ?? '' ) ),
				'threshold'    => $threshold,
				'product_id'   => $product_id,
				'variation_id' => $variation_id,
				'quantity'     => $quantity,
				'active'       => ! empty( $raw['active'] ),
				'priority'     => $priority,
				'starts_at'    => self::sanitize_date( $raw['starts_at'] ?? '' ),
				'ends_at'      => self::sanitize_date( $raw['ends_at'] ?? '' ),
			);
		}

		usort(
			$tiers,
			static function ( array $left, array $right ): int {
				$threshold = $left['threshold'] <=> $right['threshold'];
				return 0 !== $threshold ? $threshold : ( $left['priority'] <=> $right['priority'] );
			}
		);

		return array(
			'schema_version' => self::SCHEMA_VERSION,
			'mode'           => $mode,
			'tiers'          => $tiers,
		);
	}

	public static function active_tiers( ?int $timestamp = null ): array {
		$now = $timestamp ?? time();

		return array_values(
			array_filter(
				self::get()['tiers'],
				static function ( array $tier ) use ( $now ): bool {
					if ( empty( $tier['active'] ) || $tier['threshold'] <= 0 || $tier['product_id'] <= 0 ) {
						return false;
					}

					$starts = '' !== $tier['starts_at'] ? strtotime( $tier['starts_at'] . ' UTC' ) : false;
					$ends   = '' !== $tier['ends_at'] ? strtotime( $tier['ends_at'] . ' UTC' ) : false;

					return ( ! $starts || $starts <= $now ) && ( ! $ends || $ends >= $now );
				}
			)
		);
	}

	private static function sanitize_date( $value ): string {
		$value = trim( sanitize_text_field( (string) $value ) );
		if ( '' === $value ) {
			return '';
		}

		$timestamp = strtotime( $value . ' UTC' );
		return false === $timestamp ? '' : gmdate( 'Y-m-d\TH:i', $timestamp );
	}
}

