<?php
/**
 * Plugin Name: Phase One Reputation
 * Description: Normalizes verified reputation summaries for the Phase One storefront without copying review content.
 * Version: 1.0.1
 * Author: Phase One Labz
 * Requires at least: 6.2
 * Requires PHP: 7.4
 * Requires Plugins: woocommerce
 */

defined( 'ABSPATH' ) || exit;

define( 'PHASEONE_REPUTATION_VERSION', '1.0.1' );
define( 'PHASEONE_REPUTATION_FILE', __FILE__ );
define( 'PHASEONE_REPUTATION_DIR', plugin_dir_path( __FILE__ ) );

require_once PHASEONE_REPUTATION_DIR . 'includes/class-phaseone-reputation-store.php';
require_once PHASEONE_REPUTATION_DIR . 'includes/class-phaseone-reputation-trustpilot.php';
require_once PHASEONE_REPUTATION_DIR . 'includes/class-phaseone-reputation-rest.php';
require_once PHASEONE_REPUTATION_DIR . 'includes/class-phaseone-reputation-admin.php';

register_activation_hook( __FILE__, array( 'PhaseOne_Reputation_Store', 'activate' ) );
register_deactivation_hook( __FILE__, array( 'PhaseOne_Reputation_Store', 'deactivate' ) );

add_action(
	'before_woocommerce_init',
	static function () {
		$features_class = '\\Automattic\\WooCommerce\\Utilities\\FeaturesUtil';
		if ( class_exists( $features_class ) ) {
			$features_class::declare_compatibility( 'custom_order_tables', __FILE__, true );
		}
	}
);

PhaseOne_Reputation_Store::register_hooks();
PhaseOne_Reputation_REST::register_hooks();

if ( is_admin() ) {
	PhaseOne_Reputation_Admin::register_hooks();
}
