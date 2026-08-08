<?php
/**
 * Plugin Name: Phase One Site Controls
 * Description: Controls the storefront promotion countdown and maintenance mode from WordPress.
 * Version: 1.0.0
 * Author: Phase One Labz
 * Requires at least: 6.2
 * Requires PHP: 7.4
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'PHASEONE_SITE_CONTROLS_VERSION', '1.0.0' );
define( 'PHASEONE_SITE_CONTROLS_OPTION', 'phaseone_site_controls' );
define( 'PHASEONE_SITE_CONTROLS_TOKEN_OPTION', 'phaseone_site_controls_token' );

function phaseone_site_controls_defaults() {
	return array(
		'promo_enabled'             => false,
		'promo_eyebrow'             => 'Limited time special',
		'promo_title'               => '20% off sitewide',
		'promo_info'                => 'Research essentials, available for a limited time.',
		'promo_hours'               => 24,
		'promo_ends_at'             => '',
		'promo_cta_label'           => 'Shop promotion',
		'promo_cta_url'             => '/shop',
		'maintenance_enabled'       => false,
		'maintenance_title'         => 'Precision work in progress.',
		'maintenance_message'       => 'We are completing a carefully planned maintenance window and will be back shortly.',
		'maintenance_support_email' => get_option( 'admin_email', 'support@phaseonelabz.com' ),
		'maintenance_updated_at'    => '',
	);
}

function phaseone_site_controls_get() {
	$value = get_option( PHASEONE_SITE_CONTROLS_OPTION, array() );
	return wp_parse_args( is_array( $value ) ? $value : array(), phaseone_site_controls_defaults() );
}

function phaseone_site_controls_get_token() {
	$token = (string) get_option( PHASEONE_SITE_CONTROLS_TOKEN_OPTION, '' );
	if ( '' === $token ) {
		$token = wp_generate_password( 64, false, false );
		update_option( PHASEONE_SITE_CONTROLS_TOKEN_OPTION, $token, false );
	}
	return $token;
}

register_activation_hook(
	__FILE__,
	static function () {
		if ( false === get_option( PHASEONE_SITE_CONTROLS_OPTION, false ) ) {
			add_option( PHASEONE_SITE_CONTROLS_OPTION, phaseone_site_controls_defaults(), '', false );
		}
		phaseone_site_controls_get_token();
	}
);

function phaseone_site_controls_clean_url( $value ) {
	$value = trim( (string) $value );
	if ( 0 === strpos( $value, '/' ) && 0 !== strpos( $value, '//' ) ) {
		return sanitize_text_field( $value );
	}
	return esc_url_raw( $value );
}

function phaseone_site_controls_payload( $settings = null ) {
	$settings = is_array( $settings ) ? $settings : phaseone_site_controls_get();
	$ends_at  = ! empty( $settings['promo_ends_at'] ) ? strtotime( $settings['promo_ends_at'] ) : false;
	$active   = ! empty( $settings['promo_enabled'] ) && $ends_at && $ends_at > time();

	return array(
		'version'     => PHASEONE_SITE_CONTROLS_VERSION,
		'promo'       => array(
			'enabled'   => (bool) $active,
			'eyebrow'   => (string) $settings['promo_eyebrow'],
			'title'      => (string) $settings['promo_title'],
			'info'       => (string) $settings['promo_info'],
			'hours'      => (int) $settings['promo_hours'],
			'ends_at'    => $ends_at ? gmdate( 'c', $ends_at ) : null,
			'cta_label'  => (string) $settings['promo_cta_label'],
			'cta_url'    => (string) $settings['promo_cta_url'],
		),
		'maintenance' => array(
			'enabled'       => ! empty( $settings['maintenance_enabled'] ),
			'title'         => (string) $settings['maintenance_title'],
			'message'       => (string) $settings['maintenance_message'],
			'support_email' => (string) $settings['maintenance_support_email'],
			'updated_at'    => ! empty( $settings['maintenance_updated_at'] ) ? (string) $settings['maintenance_updated_at'] : null,
		),
	);
}

function phaseone_site_controls_rest_response() {
	$response = rest_ensure_response( phaseone_site_controls_payload() );
	$response->header( 'Cache-Control', 'no-store, max-age=0, must-revalidate' );
	$response->header( 'Pragma', 'no-cache' );
	return $response;
}

function phaseone_site_controls_authorized( $request ) {
	if ( current_user_can( 'manage_options' ) ) {
		return true;
	}

	$authorization = trim( (string) $request->get_header( 'authorization' ) );
	if ( ! preg_match( '/^Bearer\s+(.+)$/i', $authorization, $matches ) ) {
		return new WP_Error( 'phaseone_control_forbidden', 'A valid site-control token is required.', array( 'status' => 403 ) );
	}

	$provided = trim( $matches[1] );
	$expected = phaseone_site_controls_get_token();
	return hash_equals( $expected, $provided )
		? true
		: new WP_Error( 'phaseone_control_forbidden', 'A valid site-control token is required.', array( 'status' => 403 ) );
}

function phaseone_site_controls_set_maintenance( $request ) {
	$enabled = rest_sanitize_boolean( $request->get_param( 'enabled' ) );
	$settings = phaseone_site_controls_get();
	$settings['maintenance_enabled']    = $enabled;
	$settings['maintenance_updated_at'] = gmdate( 'c' );
	update_option( PHASEONE_SITE_CONTROLS_OPTION, $settings, false );

	$response = rest_ensure_response( phaseone_site_controls_payload( $settings ) );
	$response->header( 'Cache-Control', 'no-store, max-age=0, must-revalidate' );
	return $response;
}

add_action(
	'rest_api_init',
	static function () {
		register_rest_route(
			'phaseone/v1',
			'/site-control',
			array(
				'methods'             => WP_REST_Server::READABLE,
				'permission_callback' => '__return_true',
				'callback'            => 'phaseone_site_controls_rest_response',
			)
		);

		register_rest_route(
			'phaseone/v1',
			'/site-control/maintenance',
			array(
				'methods'             => WP_REST_Server::CREATABLE,
				'permission_callback' => 'phaseone_site_controls_authorized',
				'callback'            => 'phaseone_site_controls_set_maintenance',
				'args'                => array(
					'enabled' => array(
						'required'          => true,
						'sanitize_callback' => 'rest_sanitize_boolean',
					),
				),
			)
		);
	}
);

add_action(
	'admin_menu',
	static function () {
		add_menu_page(
			'Phase One Controls',
			'Site Controls',
			'manage_options',
			'phaseone-site-controls',
			'phaseone_site_controls_render_admin',
			'dashicons-controls-repeat',
			58
		);
	}
);

add_action(
	'admin_enqueue_scripts',
	static function ( $hook ) {
		if ( 'toplevel_page_phaseone-site-controls' !== $hook ) {
			return;
		}
		wp_enqueue_style(
			'phaseone-site-controls-admin',
			plugin_dir_url( __FILE__ ) . 'assets/admin.css',
			array(),
			PHASEONE_SITE_CONTROLS_VERSION
		);
		wp_enqueue_script(
			'phaseone-site-controls-admin',
			plugin_dir_url( __FILE__ ) . 'assets/admin.js',
			array(),
			PHASEONE_SITE_CONTROLS_VERSION,
			true
		);
	}
);

add_action(
	'admin_post_phaseone_save_site_controls',
	static function () {
		if ( ! current_user_can( 'manage_options' ) ) {
			wp_die( esc_html__( 'You are not allowed to manage these controls.', 'phaseone-site-controls' ) );
		}
		check_admin_referer( 'phaseone_save_site_controls' );

		$settings = phaseone_site_controls_get();
		$previous_hours = (int) $settings['promo_hours'];
		$was_enabled = ! empty( $settings['promo_enabled'] );
		$action = isset( $_POST['control_action'] ) ? sanitize_key( wp_unslash( $_POST['control_action'] ) ) : 'save';

		$settings['promo_enabled']   = isset( $_POST['promo_enabled'] );
		$settings['promo_eyebrow']   = sanitize_text_field( wp_unslash( $_POST['promo_eyebrow'] ?? '' ) );
		$settings['promo_title']      = sanitize_text_field( wp_unslash( $_POST['promo_title'] ?? '' ) );
		$settings['promo_info']       = sanitize_textarea_field( wp_unslash( $_POST['promo_info'] ?? '' ) );
		$settings['promo_hours']      = max( 1, min( 720, absint( $_POST['promo_hours'] ?? 24 ) ) );
		$settings['promo_cta_label']  = sanitize_text_field( wp_unslash( $_POST['promo_cta_label'] ?? '' ) );
		$settings['promo_cta_url']    = phaseone_site_controls_clean_url( wp_unslash( $_POST['promo_cta_url'] ?? '/shop' ) );

		$settings['maintenance_title']         = sanitize_text_field( wp_unslash( $_POST['maintenance_title'] ?? '' ) );
		$settings['maintenance_message']       = sanitize_textarea_field( wp_unslash( $_POST['maintenance_message'] ?? '' ) );
		$settings['maintenance_support_email'] = sanitize_email( wp_unslash( $_POST['maintenance_support_email'] ?? '' ) );

		$restart_requested = isset( $_POST['promo_restart'] );
		$hours_changed = $previous_hours !== (int) $settings['promo_hours'];
		$end_has_passed = empty( $settings['promo_ends_at'] ) || strtotime( $settings['promo_ends_at'] ) <= time();
		if ( $settings['promo_enabled'] && ( ! $was_enabled || $restart_requested || $hours_changed || $end_has_passed ) ) {
			$settings['promo_ends_at'] = gmdate( 'c', time() + ( (int) $settings['promo_hours'] * HOUR_IN_SECONDS ) );
		}

		if ( 'enable_maintenance' === $action || 'disable_maintenance' === $action ) {
			$settings['maintenance_enabled']    = 'enable_maintenance' === $action;
			$settings['maintenance_updated_at'] = gmdate( 'c' );
		}

		if ( 'regenerate_token' === $action ) {
			update_option( PHASEONE_SITE_CONTROLS_TOKEN_OPTION, wp_generate_password( 64, false, false ), false );
		}

		update_option( PHASEONE_SITE_CONTROLS_OPTION, $settings, false );
		wp_safe_redirect(
			add_query_arg(
				array(
					'page'    => 'phaseone-site-controls',
					'updated' => '1',
				),
				admin_url( 'admin.php' )
			)
		);
		exit;
	}
);

function phaseone_site_controls_render_admin() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}

	$settings = phaseone_site_controls_get();
	$token = phaseone_site_controls_get_token();
	$promo_end = ! empty( $settings['promo_ends_at'] ) ? strtotime( $settings['promo_ends_at'] ) : false;
	$promo_live = ! empty( $settings['promo_enabled'] ) && $promo_end && $promo_end > time();
	?>
	<div class="wrap phase-controls">
		<header class="phase-controls__hero">
			<div>
				<span class="phase-controls__kicker">PHASE ONE LABZ</span>
				<h1>Site controls</h1>
				<p>Controla el countdown del hero y activa una pantalla global de mantenimiento.</p>
			</div>
			<span class="phase-controls__system"><i></i> WordPress connected</span>
		</header>

		<?php if ( isset( $_GET['updated'] ) ) : // phpcs:ignore WordPress.Security.NonceVerification.Recommended ?>
			<div class="notice notice-success is-dismissible"><p>Los controles se guardaron correctamente.</p></div>
		<?php endif; ?>

		<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
			<input type="hidden" name="action" value="phaseone_save_site_controls">
			<?php wp_nonce_field( 'phaseone_save_site_controls' ); ?>

			<div class="phase-controls__grid">
				<section class="phase-controls__card phase-controls__card--promo">
					<div class="phase-controls__heading">
						<div><span>01 / HOMEPAGE</span><h2>Promotion countdown</h2></div>
						<label class="phase-switch">
							<input type="checkbox" name="promo_enabled" value="1" <?php checked( ! empty( $settings['promo_enabled'] ) ); ?>>
							<span></span><b><?php echo $promo_live ? 'Live' : 'Off'; ?></b>
						</label>
					</div>

					<div class="phase-controls__status <?php echo $promo_live ? 'is-live' : ''; ?>">
						<i></i>
						<?php if ( $promo_live ) : ?>
							Termina el <?php echo esc_html( wp_date( 'M j, Y · g:i a T', $promo_end ) ); ?>
						<?php else : ?>
							El countdown no está visible en el hero.
						<?php endif; ?>
					</div>

					<div class="phase-controls__fields">
						<label><span>Texto superior</span><input type="text" name="promo_eyebrow" maxlength="80" value="<?php echo esc_attr( $settings['promo_eyebrow'] ); ?>"></label>
						<label class="is-wide"><span>Título principal</span><input type="text" name="promo_title" maxlength="120" value="<?php echo esc_attr( $settings['promo_title'] ); ?>" required></label>
						<label class="is-wide"><span>Información corta</span><textarea name="promo_info" rows="3" maxlength="220"><?php echo esc_textarea( $settings['promo_info'] ); ?></textarea></label>
						<label><span>Duración en horas</span><input type="number" name="promo_hours" min="1" max="720" value="<?php echo esc_attr( $settings['promo_hours'] ); ?>" required></label>
						<label><span>Texto del botón</span><input type="text" name="promo_cta_label" maxlength="60" value="<?php echo esc_attr( $settings['promo_cta_label'] ); ?>"></label>
						<label class="is-wide"><span>Enlace del botón</span><input type="text" name="promo_cta_url" maxlength="500" value="<?php echo esc_attr( $settings['promo_cta_url'] ); ?>" placeholder="/shop"></label>
					</div>

					<label class="phase-controls__restart"><input type="checkbox" name="promo_restart" value="1"> Reiniciar el tiempo completo al guardar</label>
				</section>

				<section class="phase-controls__card phase-controls__card--maintenance">
					<div class="phase-controls__heading">
						<div><span>02 / WEBSITE</span><h2>Maintenance mode</h2></div>
						<span class="phase-controls__mode <?php echo ! empty( $settings['maintenance_enabled'] ) ? 'is-active' : ''; ?>">
							<i></i><?php echo ! empty( $settings['maintenance_enabled'] ) ? 'Active' : 'Standby'; ?>
						</span>
					</div>

					<p class="phase-controls__description">Al activarlo, la tienda completa muestra una pantalla de mantenimiento. La página privada <code>/status</code> permanece accesible.</p>

					<div class="phase-controls__fields">
						<label class="is-wide"><span>Título</span><input type="text" name="maintenance_title" maxlength="120" value="<?php echo esc_attr( $settings['maintenance_title'] ); ?>" required></label>
						<label class="is-wide"><span>Mensaje</span><textarea name="maintenance_message" rows="4" maxlength="320" required><?php echo esc_textarea( $settings['maintenance_message'] ); ?></textarea></label>
						<label class="is-wide"><span>Email de soporte</span><input type="email" name="maintenance_support_email" value="<?php echo esc_attr( $settings['maintenance_support_email'] ); ?>"></label>
					</div>

					<div class="phase-controls__maintenance-actions">
						<?php if ( empty( $settings['maintenance_enabled'] ) ) : ?>
							<button class="button phase-button phase-button--danger" type="submit" name="control_action" value="enable_maintenance" data-confirm="¿Activar la pantalla de mantenimiento en toda la tienda?">Activate maintenance</button>
						<?php else : ?>
							<button class="button phase-button phase-button--safe" type="submit" name="control_action" value="disable_maintenance">Bring website online</button>
						<?php endif; ?>
					</div>
				</section>
			</div>

			<section class="phase-controls__card phase-controls__card--token">
				<div><span>STATUS PAGE CONNECTION</span><h2>Secure control token</h2><p>Copia este valor como <code>PHASEONE_SITE_CONTROL_TOKEN</code> en el servidor de Astro para habilitar el botón de mantenimiento dentro de <code>/status</code>.</p></div>
				<div class="phase-controls__token-row">
					<input id="phase-control-token" type="password" readonly value="<?php echo esc_attr( $token ); ?>" autocomplete="off">
					<button type="button" class="button phase-button" data-reveal-token>Show</button>
					<button type="button" class="button phase-button" data-copy-token>Copy</button>
					<button type="submit" class="button phase-button" name="control_action" value="regenerate_token" data-confirm="El token anterior dejará de funcionar. ¿Generar uno nuevo?">Regenerate</button>
				</div>
			</section>

			<div class="phase-controls__save">
				<button class="button button-primary phase-button phase-button--primary" type="submit" name="control_action" value="save">Save all settings</button>
			</div>
		</form>
	</div>
	<?php
}
