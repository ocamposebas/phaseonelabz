<?php
/**
 * Plugin Name: Phase One Labz - Bulk Orders
 * Description: Private, server-authoritative bulk ordering for the Phase One Astro storefront and WooCommerce.
 * Version: 1.2.1
 * Author: Phase One Labz
 * Requires at least: 6.2
 * Requires PHP: 8.1
 * WC requires at least: 8.2
 * WC tested up to: 10.9
 */

defined( 'ABSPATH' ) || exit;

define( 'PHASEONE_BULK_VERSION', '1.2.1' );
define( 'PHASEONE_BULK_FILE', __FILE__ );
define( 'PHASEONE_BULK_DIR', plugin_dir_path( __FILE__ ) );
define( 'PHASEONE_BULK_URL', plugin_dir_url( __FILE__ ) );

require_once PHASEONE_BULK_DIR . 'includes/class-phaseone-bulk-installer.php';
require_once PHASEONE_BULK_DIR . 'includes/class-phaseone-bulk-access.php';
require_once PHASEONE_BULK_DIR . 'includes/class-phaseone-bulk-product-rules.php';
require_once PHASEONE_BULK_DIR . 'includes/class-phaseone-bulk-pricing-engine.php';
require_once PHASEONE_BULK_DIR . 'includes/class-phaseone-bulk-intents.php';
require_once PHASEONE_BULK_DIR . 'includes/class-phaseone-bulk-checkout.php';
require_once PHASEONE_BULK_DIR . 'includes/class-phaseone-bulk-rest.php';
require_once PHASEONE_BULK_DIR . 'includes/class-phaseone-bulk-order-integration.php';
require_once PHASEONE_BULK_DIR . 'includes/class-phaseone-bulk-admin.php';

register_activation_hook( __FILE__, array( 'PhaseOne_Bulk_Installer', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'PhaseOne_Bulk_Installer', 'deactivate' ) );

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
			add_action(
				'admin_notices',
				static function (): void {
					if ( current_user_can( 'activate_plugins' ) ) {
						echo '<div class="notice notice-error"><p>Phase One Bulk Orders requires WooCommerce.</p></div>';
					}
				}
			);
			return;
		}

		PhaseOne_Bulk_REST::boot();
		PhaseOne_Bulk_Order_Integration::boot();
		PhaseOne_Bulk_Admin::boot();
		add_action( 'phaseone_bulk_cleanup', array( 'PhaseOne_Bulk_Installer', 'cleanup' ) );
	},
	20
);
