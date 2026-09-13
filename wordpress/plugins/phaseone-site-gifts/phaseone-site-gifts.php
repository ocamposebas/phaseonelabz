<?php
/**
 * Plugin Name: Phase One Labz - Site Gifts
 * Description: Server-authoritative, tiered promotional gifts for WooCommerce and the Phase One custom checkout.
 * Version: 1.0.3
 * Author: Phase One Labz
 * Requires at least: 6.2
 * Requires PHP: 8.1
 * WC requires at least: 8.2
 * WC tested up to: 10.9
 */

defined( 'ABSPATH' ) || exit;

define( 'PHASEONE_SITE_GIFTS_VERSION', '1.0.3' );
define( 'PHASEONE_SITE_GIFTS_FILE', __FILE__ );
define( 'PHASEONE_SITE_GIFTS_DIR', plugin_dir_path( __FILE__ ) );
define( 'PHASEONE_SITE_GIFTS_URL', plugin_dir_url( __FILE__ ) );

require_once PHASEONE_SITE_GIFTS_DIR . 'includes/class-phaseone-site-gifts-rules.php';
require_once PHASEONE_SITE_GIFTS_DIR . 'includes/class-phaseone-site-gifts-pricing.php';
require_once PHASEONE_SITE_GIFTS_DIR . 'includes/class-phaseone-site-gifts-engine.php';
require_once PHASEONE_SITE_GIFTS_DIR . 'includes/class-phaseone-site-gifts-order-sync.php';
require_once PHASEONE_SITE_GIFTS_DIR . 'includes/class-phaseone-site-gifts-rest.php';
require_once PHASEONE_SITE_GIFTS_DIR . 'includes/class-phaseone-site-gifts-admin.php';

register_activation_hook(
	__FILE__,
	static function (): void {
		PhaseOne_Site_Gifts_Rules::install_defaults();
		if ( false === get_option( 'phaseone_site_gifts_activated_at', false ) ) {
			add_option( 'phaseone_site_gifts_activated_at', time(), '', false );
		}
	}
);

add_action(
	'before_woocommerce_init',
	static function (): void {
		if ( class_exists( Automattic\WooCommerce\Utilities\FeaturesUtil::class ) ) {
			Automattic\WooCommerce\Utilities\FeaturesUtil::declare_compatibility( 'custom_order_tables', __FILE__, true );
		}
	}
);

add_action(
	'plugins_loaded',
	static function (): void {
		if ( ! class_exists( 'WooCommerce' ) ) {
			return;
		}

		PhaseOne_Site_Gifts_Order_Sync::boot();
		PhaseOne_Site_Gifts_REST::boot();
		PhaseOne_Site_Gifts_Admin::boot();
	},
	20
);
