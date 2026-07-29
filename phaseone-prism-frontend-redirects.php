<?php
/**
 * Plugin Name: Phase One PRISM Frontend Redirects
 * Plugin URI: https://phaseonelabz.com
 * Description: Relays PRISM success and cancel returns from WooCommerce to the Phase One Labz frontend without changing the URLs sent to PRISM while the Checkout Session is created.
 * Version: 1.3.0
 * Requires at least: 6.0
 * Requires PHP: 7.4
 * Author: Phase One Labz
 * Text Domain: phaseone-prism-frontend-redirects
 */

defined( 'ABSPATH' ) || exit;

const PHASEONE_PRISM_REDIRECTS_VERSION = '1.3.0';
const PHASEONE_PRISM_SUCCESS_OPTION    = 'phaseone_prism_frontend_success_url';
const PHASEONE_PRISM_CANCEL_OPTION     = 'phaseone_prism_frontend_cancel_url';
const PHASEONE_PRISM_GATEWAY_ID        = 'prism_simple_checkout';
const PHASEONE_PRISM_MENU_SLUG         = 'phaseone-prism-frontend-redirects';

/**
 * Frontend defaults.
 */
function phaseone_prism_redirects_default_success_url() {
    return 'https://phaseonelabz.com/checkout/thank-you';
}

function phaseone_prism_redirects_default_cancel_url() {
    return 'https://phaseonelabz.com/checkout';
}

/**
 * Keep existing settings during upgrades and add defaults on first activation.
 */
function phaseone_prism_redirects_activate() {
    if ( false === get_option( PHASEONE_PRISM_SUCCESS_OPTION, false ) ) {
        add_option(
            PHASEONE_PRISM_SUCCESS_OPTION,
            phaseone_prism_redirects_default_success_url(),
            '',
            false
        );
    }

    if ( false === get_option( PHASEONE_PRISM_CANCEL_OPTION, false ) ) {
        add_option(
            PHASEONE_PRISM_CANCEL_OPTION,
            phaseone_prism_redirects_default_cancel_url(),
            '',
            false
        );
    }
}
register_activation_hook( __FILE__, 'phaseone_prism_redirects_activate' );

/**
 * Accept the production domain and its subdomains.
 */
function phaseone_prism_redirects_is_allowed_host( $host ) {
    $host = strtolower( trim( (string) $host ) );

    if ( 'phaseonelabz.com' === $host ) {
        return true;
    }

    return strlen( $host ) > strlen( '.phaseonelabz.com' )
        && '.phaseonelabz.com' === substr( $host, -strlen( '.phaseonelabz.com' ) );
}

/**
 * Sanitize a frontend destination.
 */
function phaseone_prism_redirects_validate_url( $url ) {
    $url = trim( (string) $url );

    if ( '' === $url ) {
        return '';
    }

    $url = esc_url_raw( $url, array( 'https' ) );

    if ( '' === $url ) {
        return '';
    }

    $parts  = wp_parse_url( $url );
    $scheme = isset( $parts['scheme'] ) ? strtolower( (string) $parts['scheme'] ) : '';
    $host   = isset( $parts['host'] ) ? strtolower( (string) $parts['host'] ) : '';

    if ( 'https' !== $scheme || ! phaseone_prism_redirects_is_allowed_host( $host ) ) {
        return '';
    }

    return $url;
}

function phaseone_prism_redirects_get_url( $option_name, $fallback ) {
    $saved = phaseone_prism_redirects_validate_url(
        get_option( $option_name, $fallback )
    );

    return '' !== $saved ? $saved : $fallback;
}

/**
 * Allow wp_safe_redirect() to send the customer to the Phase One frontend.
 */
function phaseone_prism_redirects_allowed_hosts( $hosts ) {
    $hosts[] = 'phaseonelabz.com';
    $hosts[] = 'www.phaseonelabz.com';

    $success = wp_parse_url(
        phaseone_prism_redirects_get_url(
            PHASEONE_PRISM_SUCCESS_OPTION,
            phaseone_prism_redirects_default_success_url()
        ),
        PHP_URL_HOST
    );

    $cancel = wp_parse_url(
        phaseone_prism_redirects_get_url(
            PHASEONE_PRISM_CANCEL_OPTION,
            phaseone_prism_redirects_default_cancel_url()
        ),
        PHP_URL_HOST
    );

    foreach ( array( $success, $cancel ) as $host ) {
        if ( is_string( $host ) && phaseone_prism_redirects_is_allowed_host( $host ) ) {
            $hosts[] = strtolower( $host );
        }
    }

    return array_values( array_unique( $hosts ) );
}
add_filter( 'allowed_redirect_hosts', 'phaseone_prism_redirects_allowed_hosts' );

/**
 * Detect orders created for the PRISM gateway.
 */
function phaseone_prism_redirects_is_prism_order( $order ) {
    if ( ! $order instanceof WC_Order ) {
        return false;
    }

    if ( PHASEONE_PRISM_GATEWAY_ID === (string) $order->get_payment_method() ) {
        return true;
    }

    return '' !== (string) $order->get_meta( '_prism_simple_checkout_request_id' )
        || '' !== (string) $order->get_meta( '_prism_simple_checkout_session_id' );
}

/**
 * Resolve the WooCommerce order represented by the current return request.
 */
function phaseone_prism_redirects_current_order() {
    if ( ! function_exists( 'wc_get_order' ) ) {
        return null;
    }

    $order_id = 0;

    if ( function_exists( 'get_query_var' ) ) {
        $order_id = absint( get_query_var( 'order-received' ) );

        if ( ! $order_id ) {
            $order_id = absint( get_query_var( 'order-pay' ) );
        }
    }

    if ( ! $order_id && isset( $_GET['order_id'] ) ) {
        $order_id = absint( wp_unslash( $_GET['order_id'] ) );
    }

    $order_key = isset( $_GET['key'] )
        ? wc_clean( wp_unslash( $_GET['key'] ) )
        : '';

    if ( ! $order_id && '' !== $order_key && function_exists( 'wc_get_order_id_by_order_key' ) ) {
        $order_id = absint( wc_get_order_id_by_order_key( $order_key ) );
    }

    if ( ! $order_id ) {
        return null;
    }

    $order = wc_get_order( $order_id );

    if ( ! $order instanceof WC_Order ) {
        return null;
    }

    if ( '' !== $order_key && ! hash_equals( (string) $order->get_order_key(), $order_key ) ) {
        return null;
    }

    return $order;
}

/**
 * Determine whether the current WordPress page is a PRISM success or cancel return.
 *
 * Important:
 * We do NOT filter WC_Order::get_checkout_order_received_url() or
 * WC_Order::get_checkout_payment_url(). PRISM therefore receives the normal
 * WordPress-domain URLs that its installation expects. Only after the customer
 * reaches WordPress do we relay them to phaseonelabz.com.
 */
function phaseone_prism_redirects_detect_state() {
    if ( function_exists( 'is_order_received_page' ) && is_order_received_page() ) {
        return 'success';
    }

    if ( function_exists( 'is_checkout_pay_page' ) && is_checkout_pay_page() ) {
        return 'cancelled';
    }

    return '';
}

/**
 * Build the final frontend URL.
 */
function phaseone_prism_redirects_build_frontend_url( $base_url, WC_Order $order, $state ) {
    $args = array(
        'payment'   => sanitize_key( $state ),
        'gateway'   => 'prism',
        'order_id'  => absint( $order->get_id() ),
        'order_key' => (string) $order->get_order_key(),
    );

    if ( 'success' === $state && isset( $_GET['prism_session'] ) ) {
        $session = sanitize_text_field( wp_unslash( $_GET['prism_session'] ) );

        if ( '' !== $session ) {
            $args['prism_session'] = $session;
        }
    }

    return add_query_arg( $args, $base_url );
}

/**
 * Relay the browser after it returns to WooCommerce.
 */
function phaseone_prism_redirects_template_redirect() {
    if ( is_admin() || wp_doing_ajax() || wp_doing_cron() || defined( 'REST_REQUEST' ) && REST_REQUEST ) {
        return;
    }

    $state = phaseone_prism_redirects_detect_state();

    if ( '' === $state ) {
        return;
    }

    $order = phaseone_prism_redirects_current_order();

    if ( ! phaseone_prism_redirects_is_prism_order( $order ) ) {
        return;
    }

    $base_url = 'success' === $state
        ? phaseone_prism_redirects_get_url(
            PHASEONE_PRISM_SUCCESS_OPTION,
            phaseone_prism_redirects_default_success_url()
        )
        : phaseone_prism_redirects_get_url(
            PHASEONE_PRISM_CANCEL_OPTION,
            phaseone_prism_redirects_default_cancel_url()
        );

    $destination = phaseone_prism_redirects_build_frontend_url(
        $base_url,
        $order,
        $state
    );

    nocache_headers();

    if ( wp_safe_redirect( $destination, 302, 'Phase One PRISM Frontend Redirects' ) ) {
        exit;
    }
}
add_action( 'template_redirect', 'phaseone_prism_redirects_template_redirect', 1 );

/**
 * Settings.
 */
function phaseone_prism_redirects_sanitize_success_url( $value ) {
    $clean = phaseone_prism_redirects_validate_url( $value );

    if ( '' !== $clean ) {
        return $clean;
    }

    add_settings_error(
        PHASEONE_PRISM_SUCCESS_OPTION,
        'phaseone_prism_invalid_success_url',
        __( 'Use an HTTPS URL on phaseonelabz.com or one of its subdomains.', 'phaseone-prism-frontend-redirects' ),
        'error'
    );

    return phaseone_prism_redirects_get_url(
        PHASEONE_PRISM_SUCCESS_OPTION,
        phaseone_prism_redirects_default_success_url()
    );
}

function phaseone_prism_redirects_sanitize_cancel_url( $value ) {
    $clean = phaseone_prism_redirects_validate_url( $value );

    if ( '' !== $clean ) {
        return $clean;
    }

    add_settings_error(
        PHASEONE_PRISM_CANCEL_OPTION,
        'phaseone_prism_invalid_cancel_url',
        __( 'Use an HTTPS URL on phaseonelabz.com or one of its subdomains.', 'phaseone-prism-frontend-redirects' ),
        'error'
    );

    return phaseone_prism_redirects_get_url(
        PHASEONE_PRISM_CANCEL_OPTION,
        phaseone_prism_redirects_default_cancel_url()
    );
}

function phaseone_prism_redirects_register_settings() {
    register_setting(
        'phaseone_prism_frontend_redirects',
        PHASEONE_PRISM_SUCCESS_OPTION,
        array(
            'type'              => 'string',
            'sanitize_callback' => 'phaseone_prism_redirects_sanitize_success_url',
            'default'           => phaseone_prism_redirects_default_success_url(),
        )
    );

    register_setting(
        'phaseone_prism_frontend_redirects',
        PHASEONE_PRISM_CANCEL_OPTION,
        array(
            'type'              => 'string',
            'sanitize_callback' => 'phaseone_prism_redirects_sanitize_cancel_url',
            'default'           => phaseone_prism_redirects_default_cancel_url(),
        )
    );
}
add_action( 'admin_init', 'phaseone_prism_redirects_register_settings' );

function phaseone_prism_redirects_register_admin_page() {
    if ( ! class_exists( 'WooCommerce' ) ) {
        return;
    }

    add_submenu_page(
        'woocommerce',
        __( 'PRISM Frontend Redirects', 'phaseone-prism-frontend-redirects' ),
        __( 'PRISM Redirects', 'phaseone-prism-frontend-redirects' ),
        'manage_woocommerce',
        PHASEONE_PRISM_MENU_SLUG,
        'phaseone_prism_redirects_render_admin_page'
    );
}
add_action( 'admin_menu', 'phaseone_prism_redirects_register_admin_page', 99 );

function phaseone_prism_redirects_render_admin_page() {
    if ( ! current_user_can( 'manage_woocommerce' ) ) {
        wp_die( esc_html__( 'You do not have permission to access this page.', 'phaseone-prism-frontend-redirects' ) );
    }

    $success_url = get_option(
        PHASEONE_PRISM_SUCCESS_OPTION,
        phaseone_prism_redirects_default_success_url()
    );

    $cancel_url = get_option(
        PHASEONE_PRISM_CANCEL_OPTION,
        phaseone_prism_redirects_default_cancel_url()
    );
    ?>
    <div class="wrap">
        <h1><?php esc_html_e( 'PRISM Frontend Redirects', 'phaseone-prism-frontend-redirects' ); ?></h1>

        <div class="notice notice-success inline">
            <p>
                <strong><?php esc_html_e( 'Safe relay mode is active.', 'phaseone-prism-frontend-redirects' ); ?></strong>
                <?php esc_html_e( 'PRISM receives the normal WooCommerce URLs. The customer is sent to the frontend only after returning to WordPress.', 'phaseone-prism-frontend-redirects' ); ?>
            </p>
        </div>

        <?php settings_errors(); ?>

        <form method="post" action="options.php">
            <?php settings_fields( 'phaseone_prism_frontend_redirects' ); ?>

            <table class="form-table" role="presentation">
                <tr>
                    <th scope="row">
                        <label for="phaseone-prism-success-url"><?php esc_html_e( 'Successful payment URL', 'phaseone-prism-frontend-redirects' ); ?></label>
                    </th>
                    <td>
                        <input
                            id="phaseone-prism-success-url"
                            name="<?php echo esc_attr( PHASEONE_PRISM_SUCCESS_OPTION ); ?>"
                            type="url"
                            class="regular-text code"
                            value="<?php echo esc_attr( $success_url ); ?>"
                            required
                        />
                        <p class="description"><code>https://phaseonelabz.com/checkout/thank-you</code></p>
                    </td>
                </tr>

                <tr>
                    <th scope="row">
                        <label for="phaseone-prism-cancel-url"><?php esc_html_e( 'Back / cancelled payment URL', 'phaseone-prism-frontend-redirects' ); ?></label>
                    </th>
                    <td>
                        <input
                            id="phaseone-prism-cancel-url"
                            name="<?php echo esc_attr( PHASEONE_PRISM_CANCEL_OPTION ); ?>"
                            type="url"
                            class="regular-text code"
                            value="<?php echo esc_attr( $cancel_url ); ?>"
                            required
                        />
                        <p class="description"><code>https://phaseonelabz.com/checkout</code></p>
                    </td>
                </tr>
            </table>

            <?php submit_button(); ?>
        </form>

        <hr />
        <h2><?php esc_html_e( 'Flow', 'phaseone-prism-frontend-redirects' ); ?></h2>
        <p><code>PRISM → WooCommerce return page → Phase One frontend</code></p>
        <p>
            <?php esc_html_e( 'Create a new order for every test. Existing Stripe Checkout Sessions retain the URLs they were created with.', 'phaseone-prism-frontend-redirects' ); ?>
        </p>
    </div>
    <?php
}

function phaseone_prism_redirects_plugin_action_links( $links ) {
    $url = admin_url( 'admin.php?page=' . PHASEONE_PRISM_MENU_SLUG );

    array_unshift(
        $links,
        '<a href="' . esc_url( $url ) . '">' . esc_html__( 'Settings', 'phaseone-prism-frontend-redirects' ) . '</a>'
    );

    return $links;
}
add_filter(
    'plugin_action_links_' . plugin_basename( __FILE__ ),
    'phaseone_prism_redirects_plugin_action_links'
);

/**
 * Dependency notice only; no hard dependency header is used.
 */
function phaseone_prism_redirects_dependency_notice() {
    if ( ! current_user_can( 'manage_plugins' ) ) {
        return;
    }

    if ( ! class_exists( 'WooCommerce' ) ) {
        echo '<div class="notice notice-error"><p>';
        echo esc_html__( 'Phase One PRISM Frontend Redirects requires WooCommerce.', 'phaseone-prism-frontend-redirects' );
        echo '</p></div>';
        return;
    }

    if ( ! class_exists( 'Prism_Simple_Checkout_Plugin' ) ) {
        echo '<div class="notice notice-warning"><p>';
        echo esc_html__( 'PRISM Simple Stripe Checkout is not active. Redirects will begin working after PRISM is activated.', 'phaseone-prism-frontend-redirects' );
        echo '</p></div>';
    }
}
add_action( 'admin_notices', 'phaseone_prism_redirects_dependency_notice' );
