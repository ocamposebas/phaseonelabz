<?php

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Reputation_Admin {
	public static function register_hooks() {
		add_action( 'admin_menu', array( __CLASS__, 'admin_menu' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
		add_action( 'admin_post_phaseone_reputation_save', array( __CLASS__, 'save' ) );
		add_action( 'admin_post_phaseone_reputation_refresh', array( __CLASS__, 'refresh' ) );
	}

	public static function admin_menu() {
		add_submenu_page(
			'woocommerce',
			__( 'Phase One Reputation', 'phaseone-reputation' ),
			__( 'Reputation', 'phaseone-reputation' ),
			'manage_woocommerce',
			'phaseone-reputation',
			array( __CLASS__, 'render' )
		);
	}

	public static function enqueue_assets( $hook ) {
		if ( 'woocommerce_page_phaseone-reputation' !== $hook ) {
			return;
		}

		wp_enqueue_style(
			'phaseone-reputation-admin',
			plugins_url( 'assets/admin.css', PHASEONE_REPUTATION_FILE ),
			array(),
			PHASEONE_REPUTATION_VERSION
		);
		wp_enqueue_script(
			'phaseone-reputation-admin',
			plugins_url( 'assets/admin.js', PHASEONE_REPUTATION_FILE ),
			array(),
			PHASEONE_REPUTATION_VERSION,
			true
		);
	}

	private static function authorize( $nonce_action ) {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die( esc_html__( 'You are not allowed to manage reputation settings.', 'phaseone-reputation' ) );
		}
		check_admin_referer( $nonce_action );
	}

	public static function save() {
		self::authorize( 'phaseone_reputation_save' );
		$input = isset( $_POST['phaseone_reputation'] ) && is_array( $_POST['phaseone_reputation'] )
			? wp_unslash( $_POST['phaseone_reputation'] )
			: array();
		$settings = PhaseOne_Reputation_Store::sanitize_settings( $input );
		update_option( PhaseOne_Reputation_Store::SETTINGS_OPTION, $settings, false );

		wp_clear_scheduled_hook( PhaseOne_Reputation_Store::REFRESH_HOOK );
		PhaseOne_Reputation_Store::ensure_refresh_scheduled();
		wp_schedule_single_event( time() + 5, PhaseOne_Reputation_Store::REFRESH_HOOK );
		self::redirect( 'saved' );
	}

	public static function refresh() {
		self::authorize( 'phaseone_reputation_refresh' );
		$result = PhaseOne_Reputation_Store::refresh( true );
		$has_error = is_wp_error( $result );
		if ( is_array( $result ) ) {
			foreach ( $result as $provider_result ) {
				if ( is_wp_error( $provider_result ) ) {
					$has_error = true;
					break;
				}
			}
		}
		self::redirect( $has_error ? 'refresh_failed' : 'refreshed' );
	}

	private static function redirect( $notice ) {
		wp_safe_redirect(
			add_query_arg(
				array(
					'page'   => 'phaseone-reputation',
					'notice' => sanitize_key( $notice ),
				),
				admin_url( 'admin.php' )
			)
		);
		exit;
	}

	private static function trustpilot_diagnostics() {
		if ( ! function_exists( 'get_plugins' ) ) {
			require_once ABSPATH . 'wp-admin/includes/plugin.php';
		}

		$plugin_file = 'trustpilot-reviews/wc_trustpilot.php';
		$plugins     = get_plugins();
		$installed   = isset( $plugins[ $plugin_file ] );
		$active      = $installed && is_plugin_active( $plugin_file );
		$version     = $installed && isset( $plugins[ $plugin_file ]['Version'] ) ? $plugins[ $plugin_file ]['Version'] : '';
		$mapped      = array();
		$configured  = false;

		$raw_settings = get_option( 'trustpilot_settings', '' );
		if ( is_string( $raw_settings ) && '' !== $raw_settings ) {
			$decoded = json_decode( stripslashes( $raw_settings ), true );
			if ( is_array( $decoded ) && isset( $decoded['general']['mappedInvitationTrigger'] ) && is_array( $decoded['general']['mappedInvitationTrigger'] ) ) {
				$mapped = array_values( array_map( 'sanitize_key', $decoded['general']['mappedInvitationTrigger'] ) );
			}
		}

		$mapped     = array_values( array_filter( $mapped ) );
		$configured = array( 'completed' ) === $mapped;

		return array(
			'installed'            => $installed,
			'active'               => $active,
			'version'              => $version,
			'mapped_statuses'      => $mapped,
			'completed_only'       => $configured,
			'historical_sync_running' => 'true' === (string) get_option( 'sync_in_progress', 'false' ),
		);
	}

	private static function field_name( $path ) {
		return 'phaseone_reputation' . $path;
	}

	public static function render() {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}

		$settings    = PhaseOne_Reputation_Store::settings();
		$trustpilot  = $settings['trustpilot'];
		$external    = $settings['external_sources'];
		$diagnostics = self::trustpilot_diagnostics();
		$cache       = PhaseOne_Reputation_Store::cache();
		$refresh_state = get_option( PhaseOne_Reputation_Store::REFRESH_STATE_OPTION, array() );
		$notice      = isset( $_GET['notice'] ) ? sanitize_key( wp_unslash( $_GET['notice'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		?>
		<div class="wrap phaseone-reputation-admin">
			<header class="por-admin-header">
				<div>
					<p class="por-kicker">PHASE ONE / REPUTATION</p>
					<h1><?php esc_html_e( 'Reputation sources', 'phaseone-reputation' ); ?></h1>
					<p><?php esc_html_e( 'One source of truth for verified aggregate ratings and public review links. Review content is never copied.', 'phaseone-reputation' ); ?></p>
				</div>
				<span class="por-state"><i></i><?php esc_html_e( 'HPOS compatible', 'phaseone-reputation' ); ?></span>
			</header>

			<?php if ( 'saved' === $notice ) : ?>
				<div class="notice notice-success is-dismissible"><p><?php esc_html_e( 'Reputation settings saved. A background refresh was scheduled.', 'phaseone-reputation' ); ?></p></div>
			<?php elseif ( 'refreshed' === $notice ) : ?>
				<div class="notice notice-success is-dismissible"><p><?php esc_html_e( 'Reputation summaries refreshed.', 'phaseone-reputation' ); ?></p></div>
			<?php elseif ( 'refresh_failed' === $notice ) : ?>
				<div class="notice notice-warning is-dismissible"><p><?php esc_html_e( 'The refresh did not produce current metrics. The previous cache was preserved and stale figures remain hidden.', 'phaseone-reputation' ); ?></p></div>
			<?php endif; ?>

			<section class="por-diagnostics">
				<div><span><?php esc_html_e( 'Official plugin', 'phaseone-reputation' ); ?></span><strong><?php echo $diagnostics['active'] ? esc_html( 'Active ' . $diagnostics['version'] ) : esc_html__( 'Not active', 'phaseone-reputation' ); ?></strong></div>
				<div><span><?php esc_html_e( 'Invitation trigger', 'phaseone-reputation' ); ?></span><strong class="<?php echo $diagnostics['completed_only'] ? 'is-good' : 'is-warn'; ?>"><?php echo $diagnostics['completed_only'] ? esc_html__( 'Completed only', 'phaseone-reputation' ) : esc_html__( 'Needs review', 'phaseone-reputation' ); ?></strong></div>
				<div><span><?php esc_html_e( 'Historical sync', 'phaseone-reputation' ); ?></span><strong class="<?php echo $diagnostics['historical_sync_running'] ? 'is-warn' : 'is-good'; ?>"><?php echo $diagnostics['historical_sync_running'] ? esc_html__( 'Running', 'phaseone-reputation' ) : esc_html__( 'Not running', 'phaseone-reputation' ); ?></strong></div>
			</section>

			<?php if ( ! $diagnostics['active'] || ! $diagnostics['completed_only'] ) : ?>
				<div class="por-operational-note">
					<strong><?php esc_html_e( 'Trustpilot invitation setup remains inside the official plugin.', 'phaseone-reputation' ); ?></strong>
					<p><?php esc_html_e( 'Activate Trustpilot Reviews, connect the business account, select only Completed as the invitation trigger, and leave historical order synchronization off.', 'phaseone-reputation' ); ?></p>
				</div>
			<?php endif; ?>

			<form method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="phaseone_reputation_save">
				<?php wp_nonce_field( 'phaseone_reputation_save' ); ?>

				<section class="por-panel">
					<div class="por-panel-heading">
						<div><span>01</span><h2><?php esc_html_e( 'Trustpilot storefront source', 'phaseone-reputation' ); ?></h2></div>
						<label class="por-toggle"><input type="checkbox" name="<?php echo esc_attr( self::field_name( '[trustpilot][enabled]' ) ); ?>" value="1" <?php checked( ! empty( $trustpilot['enabled'] ) ); ?>><span></span><b><?php esc_html_e( 'Visible', 'phaseone-reputation' ); ?></b></label>
					</div>

					<div class="por-fields">
						<label class="is-wide"><span><?php esc_html_e( 'Public profile URL', 'phaseone-reputation' ); ?></span><input type="url" name="<?php echo esc_attr( self::field_name( '[trustpilot][public_url]' ) ); ?>" value="<?php echo esc_attr( $trustpilot['public_url'] ); ?>" placeholder="https://www.trustpilot.com/review/example.com"></label>
						<label class="is-wide"><span><?php esc_html_e( 'Leave a review URL', 'phaseone-reputation' ); ?></span><input type="url" name="<?php echo esc_attr( self::field_name( '[trustpilot][leave_review_url]' ) ); ?>" value="<?php echo esc_attr( $trustpilot['leave_review_url'] ); ?>" placeholder="Official Trustpilot review form URL"></label>
						<label><span><?php esc_html_e( 'Display mode', 'phaseone-reputation' ); ?></span><select name="<?php echo esc_attr( self::field_name( '[trustpilot][data_mode]' ) ); ?>"><option value="widget" <?php selected( $trustpilot['data_mode'], 'widget' ); ?>><?php esc_html_e( 'Official TrustBox', 'phaseone-reputation' ); ?></option><option value="api" <?php selected( $trustpilot['data_mode'], 'api' ); ?>><?php esc_html_e( 'Official API', 'phaseone-reputation' ); ?></option></select></label>
						<label><span><?php esc_html_e( 'Business Unit ID', 'phaseone-reputation' ); ?></span><input type="text" name="<?php echo esc_attr( self::field_name( '[trustpilot][business_unit_id]' ) ); ?>" value="<?php echo esc_attr( $trustpilot['business_unit_id'] ); ?>" autocomplete="off"></label>
						<label><span><?php esc_html_e( 'API key', 'phaseone-reputation' ); ?></span><input type="password" name="<?php echo esc_attr( self::field_name( '[trustpilot][api_key]' ) ); ?>" value="" placeholder="<?php echo $trustpilot['api_key'] || defined( 'PHASEONE_TRUSTPILOT_API_KEY' ) ? esc_attr__( 'Configured — leave blank to keep', 'phaseone-reputation' ) : esc_attr__( 'Required only for API mode', 'phaseone-reputation' ); ?>" autocomplete="new-password"><small><?php esc_html_e( 'Prefer PHASEONE_TRUSTPILOT_API_KEY in wp-config.php.', 'phaseone-reputation' ); ?></small></label>
						<label><span><?php esc_html_e( 'TrustBox template ID', 'phaseone-reputation' ); ?></span><input type="text" name="<?php echo esc_attr( self::field_name( '[trustpilot][trustbox_template_id]' ) ); ?>" value="<?php echo esc_attr( $trustpilot['trustbox_template_id'] ); ?>"><small><?php esc_html_e( 'Copy from the official TrustBox embed code.', 'phaseone-reputation' ); ?></small></label>
						<label><span><?php esc_html_e( 'TrustBox locale', 'phaseone-reputation' ); ?></span><input type="text" name="<?php echo esc_attr( self::field_name( '[trustpilot][locale]' ) ); ?>" value="<?php echo esc_attr( $trustpilot['locale'] ); ?>" placeholder="en-US"></label>
						<label><span><?php esc_html_e( 'TrustBox theme', 'phaseone-reputation' ); ?></span><select name="<?php echo esc_attr( self::field_name( '[trustpilot][theme]' ) ); ?>"><option value="dark" <?php selected( $trustpilot['theme'], 'dark' ); ?>><?php esc_html_e( 'Dark', 'phaseone-reputation' ); ?></option><option value="light" <?php selected( $trustpilot['theme'], 'light' ); ?>><?php esc_html_e( 'Light', 'phaseone-reputation' ); ?></option></select></label>
						<label><span><?php esc_html_e( 'TrustBox height', 'phaseone-reputation' ); ?></span><input type="text" name="<?php echo esc_attr( self::field_name( '[trustpilot][height]' ) ); ?>" value="<?php echo esc_attr( $trustpilot['height'] ); ?>" placeholder="52px"></label>
					</div>

					<?php if ( isset( $cache['trustpilot']['last_updated'] ) ) : ?>
						<p class="por-cache-state"><?php printf( esc_html__( 'Last successful API refresh: %s', 'phaseone-reputation' ), esc_html( wp_date( 'M j, Y g:i a T', strtotime( $cache['trustpilot']['last_updated'] ) ) ) ); ?></p>
					<?php endif; ?>
					<?php if ( isset( $refresh_state['providers']['trustpilot']['ok'] ) && ! $refresh_state['providers']['trustpilot']['ok'] ) : ?>
						<p class="por-cache-state is-error"><?php echo esc_html( $refresh_state['providers']['trustpilot']['message'] ); ?></p>
					<?php endif; ?>
				</section>

				<section class="por-panel">
					<div class="por-panel-heading">
						<div><span>02</span><h2><?php esc_html_e( 'External sources', 'phaseone-reputation' ); ?></h2></div>
						<button class="button" type="button" data-add-source><?php esc_html_e( 'Add source', 'phaseone-reputation' ); ?></button>
					</div>
					<p class="por-panel-copy"><?php esc_html_e( 'External forums remain link-only unless a verified server-side adapter supplies aggregate metrics. Informal mentions are never converted into ratings.', 'phaseone-reputation' ); ?></p>

					<div class="por-source-list" data-source-list data-next-index="<?php echo esc_attr( count( $external ) ); ?>">
						<?php foreach ( $external as $index => $source ) : ?>
							<?php self::render_source_row( $source, $index ); ?>
						<?php endforeach; ?>
					</div>
				</section>

				<section class="por-panel por-panel--locked">
					<div class="por-panel-heading"><div><span>03</span><h2><?php esc_html_e( 'PepReview', 'phaseone-reputation' ); ?></h2></div><em><?php esc_html_e( 'Prepared / not active', 'phaseone-reputation' ); ?></em></div>
					<p><?php esc_html_e( 'The provider slot is reserved, but no invitations, scraping, rewards, or public data are enabled until its moderation and incentive policies are clarified in writing.', 'phaseone-reputation' ); ?></p>
				</section>

				<div class="por-save-row"><button type="submit" class="button button-primary"><?php esc_html_e( 'Save reputation settings', 'phaseone-reputation' ); ?></button></div>
			</form>

			<form class="por-refresh-form" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>">
				<input type="hidden" name="action" value="phaseone_reputation_refresh">
				<?php wp_nonce_field( 'phaseone_reputation_refresh' ); ?>
				<button type="submit" class="button"><?php esc_html_e( 'Refresh verified metrics now', 'phaseone-reputation' ); ?></button>
				<small><?php esc_html_e( 'Normal refreshes run every six hours. Storefront figures are hidden after 24 hours without a successful update.', 'phaseone-reputation' ); ?></small>
			</form>
		</div>

		<template id="por-source-template"><?php self::render_source_row( array(), '__INDEX__' ); ?></template>
		<?php
	}

	private static function render_source_row( $source, $index ) {
		$source = wp_parse_args(
			is_array( $source ) ? $source : array(),
			array( 'id' => '', 'enabled' => true, 'name' => '', 'logo' => '', 'type' => 'Independent source', 'public_url' => '', 'leave_review_url' => '' )
		);
		$prefix = '[external_sources][' . $index . ']';
		?>
		<div class="por-source-row" data-source-row>
			<input type="hidden" name="<?php echo esc_attr( self::field_name( $prefix . '[id]' ) ); ?>" value="<?php echo esc_attr( $source['id'] ); ?>">
			<label class="por-source-enabled"><input type="checkbox" name="<?php echo esc_attr( self::field_name( $prefix . '[enabled]' ) ); ?>" value="1" <?php checked( ! empty( $source['enabled'] ) ); ?>> <?php esc_html_e( 'Visible', 'phaseone-reputation' ); ?></label>
			<label><span><?php esc_html_e( 'Name', 'phaseone-reputation' ); ?></span><input type="text" name="<?php echo esc_attr( self::field_name( $prefix . '[name]' ) ); ?>" value="<?php echo esc_attr( $source['name'] ); ?>" maxlength="100"></label>
			<label><span><?php esc_html_e( 'Type', 'phaseone-reputation' ); ?></span><input type="text" name="<?php echo esc_attr( self::field_name( $prefix . '[type]' ) ); ?>" value="<?php echo esc_attr( $source['type'] ); ?>" maxlength="100"></label>
			<label><span><?php esc_html_e( 'Logo URL', 'phaseone-reputation' ); ?></span><input type="url" name="<?php echo esc_attr( self::field_name( $prefix . '[logo]' ) ); ?>" value="<?php echo esc_attr( $source['logo'] ); ?>"></label>
			<label class="is-wide"><span><?php esc_html_e( 'Public URL', 'phaseone-reputation' ); ?></span><input type="url" name="<?php echo esc_attr( self::field_name( $prefix . '[public_url]' ) ); ?>" value="<?php echo esc_attr( $source['public_url'] ); ?>"></label>
			<label class="is-wide"><span><?php esc_html_e( 'Leave a review URL (optional)', 'phaseone-reputation' ); ?></span><input type="url" name="<?php echo esc_attr( self::field_name( $prefix . '[leave_review_url]' ) ); ?>" value="<?php echo esc_attr( $source['leave_review_url'] ); ?>"></label>
			<button class="button-link-delete" type="button" data-remove-source><?php esc_html_e( 'Remove', 'phaseone-reputation' ); ?></button>
		</div>
		<?php
	}
}
