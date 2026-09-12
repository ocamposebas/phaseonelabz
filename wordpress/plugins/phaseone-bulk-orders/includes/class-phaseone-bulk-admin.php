<?php

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Bulk_Admin {
	private const PAGE = 'phaseone-bulk-orders';

	public static function boot(): void {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'assets' ) );
		add_action( 'admin_post_phaseone_bulk_add_rule', array( __CLASS__, 'add_rule' ) );
		add_action( 'admin_post_phaseone_bulk_save_rules', array( __CLASS__, 'save_rules' ) );
		add_action( 'admin_post_phaseone_bulk_save_access_mode', array( __CLASS__, 'save_access_mode' ) );
		add_action( 'admin_post_phaseone_bulk_create_access', array( __CLASS__, 'create_access' ) );
		add_action( 'admin_post_phaseone_bulk_access_action', array( __CLASS__, 'access_action' ) );
	}

	public static function menu(): void {
		add_submenu_page( 'woocommerce', 'Bulk Orders', 'Bulk Orders', 'manage_woocommerce', self::PAGE, array( __CLASS__, 'render' ) );
	}

	public static function assets( string $hook ): void {
		if ( 'woocommerce_page_' . self::PAGE !== $hook ) {
			return;
		}
		wp_enqueue_style( 'woocommerce_admin_styles' );
		wp_enqueue_script( 'wc-enhanced-select' );
		wp_enqueue_style( 'phaseone-bulk-admin', PHASEONE_BULK_URL . 'assets/admin.css', array(), PHASEONE_BULK_VERSION );
		wp_enqueue_style( 'phaseone-bulk-admin-access-mode', PHASEONE_BULK_URL . 'assets/admin-access-mode.css', array( 'phaseone-bulk-admin' ), PHASEONE_BULK_VERSION );
		wp_enqueue_script( 'phaseone-bulk-admin', PHASEONE_BULK_URL . 'assets/admin.js', array(), PHASEONE_BULK_VERSION, true );
	}

	public static function render(): void {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}
		$tab = sanitize_key( wp_unslash( $_GET['tab'] ?? 'rules' ) );
		$tab = in_array( $tab, array( 'rules', 'access' ), true ) ? $tab : 'rules';
		?>
		<div class="wrap phaseone-bulk-admin">
			<header class="phaseone-bulk-heading">
				<div><h1>Bulk Orders</h1><p>Private product rules and access control. Retail pricing remains unchanged.</p></div>
			</header>
			<nav class="nav-tab-wrapper" aria-label="Bulk Orders sections">
				<a class="nav-tab <?php echo 'rules' === $tab ? 'nav-tab-active' : ''; ?>" href="<?php echo esc_url( self::page_url( 'rules' ) ); ?>">Product Rules</a>
				<a class="nav-tab <?php echo 'access' === $tab ? 'nav-tab-active' : ''; ?>" href="<?php echo esc_url( self::page_url( 'access' ) ); ?>">Access Codes</a>
			</nav>
			<?php self::notice(); ?>
			<?php 'access' === $tab ? self::render_access() : self::render_rules(); ?>
		</div>
		<?php
	}

	private static function render_rules(): void {
		$ids = PhaseOne_Bulk_Product_Rules::configured_ids();
		?>
		<section class="phaseone-bulk-panel phaseone-bulk-add-rule">
			<div><h2>Add product or variation</h2><p>Variable products must be configured one variation at a time.</p></div>
			<form action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post">
				<input type="hidden" name="action" value="phaseone_bulk_add_rule">
				<?php wp_nonce_field( 'phaseone_bulk_manage_rules' ); ?>
				<select class="wc-product-search" name="product_id" data-placeholder="Search by product or SKU..." data-action="woocommerce_json_search_products_and_variations" required></select>
				<button class="button button-primary" type="submit">Add</button>
			</form>
		</section>

		<form action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post">
			<input type="hidden" name="action" value="phaseone_bulk_save_rules">
			<?php wp_nonce_field( 'phaseone_bulk_manage_rules' ); ?>
			<div class="phaseone-bulk-rule-list">
				<?php if ( empty( $ids ) ) : ?><div class="phaseone-bulk-empty">No Bulk product rules configured yet.</div><?php endif; ?>
				<?php foreach ( $ids as $id ) : self::render_rule( $id ); endforeach; ?>
			</div>
			<?php if ( $ids ) : ?><p class="submit"><button class="button button-primary" type="submit">Save product rules</button></p><?php endif; ?>
		</form>
		<?php
	}

	private static function render_rule( int $id ): void {
		$product = wc_get_product( $id );
		$rule    = PhaseOne_Bulk_Product_Rules::get( $id );
		if ( ! $product instanceof WC_Product || is_wp_error( $rule ) ) {
			return;
		}
		$tier_text = implode( "\n", array_map( static fn( array $tier ): string => (int) $tier['minimum'] . ': ' . wc_format_decimal( $tier['price'], wc_get_price_decimals() ), $rule['tiers'] ) );
		?>
		<article class="phaseone-bulk-rule" data-rule>
			<header><div><strong><?php echo esc_html( wp_strip_all_tags( $product->get_formatted_name() ) ); ?></strong><span>SKU <?php echo esc_html( $product->get_sku() ?: 'missing' ); ?></span></div><label><input type="checkbox" name="rules[<?php echo esc_attr( $id ); ?>][enabled]" value="1" <?php checked( $rule['enabled'] ); ?>> Enabled</label></header>
			<input type="hidden" name="rules[<?php echo esc_attr( $id ); ?>][product_id]" value="<?php echo esc_attr( $id ); ?>">
			<div class="phaseone-bulk-rule-grid">
				<label>Minimum<input type="number" min="1" step="1" name="rules[<?php echo esc_attr( $id ); ?>][minimum]" value="<?php echo esc_attr( $rule['minimum'] ); ?>" required></label>
				<label>Pricing Mode<select name="rules[<?php echo esc_attr( $id ); ?>][mode]" data-pricing-mode><option value="fixed" <?php selected( $rule['mode'], 'fixed' ); ?>>Fixed price</option><option value="tiered" <?php selected( $rule['mode'], 'tiered' ); ?>>Tier pricing</option></select></label>
				<label data-fixed-price>Bulk price<input type="number" min="0" step="0.01" name="rules[<?php echo esc_attr( $id ); ?>][fixed_price]" value="<?php echo esc_attr( $rule['fixed_price'] ); ?>"></label>
				<label>Maximum <small>optional</small><input type="number" min="0" step="1" name="rules[<?php echo esc_attr( $id ); ?>][maximum]" value="<?php echo esc_attr( $rule['maximum'] ?: '' ); ?>" placeholder="No Bulk maximum"></label>
				<label class="phaseone-bulk-tiers" data-tier-prices>Tiers <small>one per line: quantity: price</small><textarea name="rules[<?php echo esc_attr( $id ); ?>][tiers]" rows="3" placeholder="10: 18.00&#10;50: 15.00"><?php echo esc_textarea( $tier_text ); ?></textarea></label>
				<label class="phaseone-bulk-remove"><input type="checkbox" name="rules[<?php echo esc_attr( $id ); ?>][_delete]" value="1"> Remove this configuration</label>
			</div>
		</article>
		<?php
	}

	private static function render_access(): void {
		$rows = PhaseOne_Bulk_Access::list_all();
		$request_id = wp_generate_uuid4();
		$access_mode = PhaseOne_Bulk_Access::mode();
		?>
		<section class="phaseone-bulk-panel phaseone-bulk-access-mode">
			<div><h2>Catalog visibility</h2><p>Controls whether visitors need an Access Code before viewing Bulk products. Checkout always requires a customer login.</p></div>
			<form action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post">
				<input type="hidden" name="action" value="phaseone_bulk_save_access_mode">
				<?php wp_nonce_field( 'phaseone_bulk_manage_access_mode' ); ?>
				<label><input type="radio" name="access_mode" value="private" <?php checked( $access_mode, 'private' ); ?>> <span><strong>Private</strong><small>Require an active Access Code.</small></span></label>
				<label><input type="radio" name="access_mode" value="public" <?php checked( $access_mode, 'public' ); ?>> <span><strong>Public</strong><small>Open the Bulk catalog without a code.</small></span></label>
				<button class="button button-primary" type="submit">Save visibility</button>
			</form>
		</section>

		<section class="phaseone-bulk-panel phaseone-bulk-create-access">
			<div><h2>Create access code</h2><p>The complete code is shown once and is never stored as plaintext.</p></div>
			<form action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post">
				<input type="hidden" name="action" value="phaseone_bulk_create_access"><input type="hidden" name="request_id" value="<?php echo esc_attr( $request_id ); ?>">
				<?php wp_nonce_field( 'phaseone_bulk_manage_access' ); ?>
				<label>Expiration <small>optional</small><input type="datetime-local" name="expires_at"></label>
				<label>Usage limit <small>optional</small><input type="number" min="1" step="1" name="usage_limit" placeholder="Unlimited"></label>
				<label class="phaseone-bulk-notes">Internal notes <textarea name="notes" rows="2" maxlength="500"></textarea></label>
				<label class="phaseone-bulk-checkbox"><input type="checkbox" name="is_active" value="1" checked> Active</label>
				<button class="button button-primary" type="submit">Create code</button>
			</form>
		</section>

		<section class="phaseone-bulk-panel">
			<div class="phaseone-bulk-table-wrap"><table class="widefat striped phaseone-bulk-access-table"><thead><tr><th>Code</th><th>Status</th><th>Expiration</th><th>Usage</th><th>Notes</th><th>Actions</th></tr></thead><tbody>
			<?php if ( empty( $rows ) ) : ?><tr><td colspan="6">No access codes created yet.</td></tr><?php endif; ?>
			<?php foreach ( $rows as $row ) :
				$expired = ! empty( $row['expires_at'] ) && strtotime( $row['expires_at'] . ' UTC' ) <= time();
				$status = ! empty( $row['revoked_at'] ) ? 'Revoked' : ( $expired ? 'Expired' : ( ! empty( $row['is_active'] ) ? 'Active' : 'Inactive' ) );
				?>
				<tr><td><code>••••••<?php echo esc_html( $row['code_suffix'] ); ?></code></td><td><?php echo esc_html( $status ); ?></td><td><?php echo esc_html( self::display_date( $row['expires_at'] ) ); ?></td><td><?php echo esc_html( (string) $row['uses'] ); ?> / <?php echo esc_html( $row['usage_limit'] ?: '∞' ); ?></td><td><?php echo esc_html( $row['notes'] ?: '—' ); ?></td><td><?php if ( empty( $row['revoked_at'] ) ) : ?><?php echo wp_kses_post( self::access_action_link( (int) $row['id'], ! empty( $row['is_active'] ) ? 'deactivate' : 'activate', ! empty( $row['is_active'] ) ? 'Deactivate' : 'Activate' ) ); ?> <span aria-hidden="true">·</span> <?php echo wp_kses_post( self::access_action_link( (int) $row['id'], 'revoke', 'Revoke', true ) ); ?><?php else : ?>—<?php endif; ?></td></tr>
			<?php endforeach; ?>
			</tbody></table></div>
		</section>
		<?php
	}

	public static function add_rule(): void {
		self::authorize( 'phaseone_bulk_manage_rules' );
		$id = absint( $_POST['product_id'] ?? 0 );
		$result = PhaseOne_Bulk_Product_Rules::save( $id, array( 'enabled' => false, 'minimum' => 10, 'maximum' => 0, 'mode' => 'fixed', 'fixed_price' => 0, 'tiers' => array() ) );
		self::redirect( 'rules', is_wp_error( $result ) ? $result->get_error_message() : 'Product added. Configure its Bulk rule before enabling it.', is_wp_error( $result ) ? 'error' : 'success' );
	}

	public static function save_rules(): void {
		self::authorize( 'phaseone_bulk_manage_rules' );
		$rules  = isset( $_POST['rules'] ) && is_array( $_POST['rules'] ) ? wp_unslash( $_POST['rules'] ) : array();
		$errors = array();
		foreach ( $rules as $id => $raw ) {
			$id = absint( $id );
			if ( ! $id || ! is_array( $raw ) ) {
				continue;
			}
			$result = ! empty( $raw['_delete'] ) ? PhaseOne_Bulk_Product_Rules::delete( $id ) : PhaseOne_Bulk_Product_Rules::save( $id, $raw );
			if ( is_wp_error( $result ) ) {
				$errors[] = $result->get_error_message();
			} elseif ( false === $result ) {
				$errors[] = 'A product rule could not be saved.';
			}
		}
		self::redirect( 'rules', $errors ? implode( ' ', array_unique( $errors ) ) : 'Product rules saved.', $errors ? 'error' : 'success' );
	}

	public static function create_access(): void {
		self::authorize( 'phaseone_bulk_manage_access' );
		$result = PhaseOne_Bulk_Access::create(
			array(
				'is_active'  => ! empty( $_POST['is_active'] ),
				'expires_at' => sanitize_text_field( wp_unslash( $_POST['expires_at'] ?? '' ) ),
				'usage_limit' => absint( $_POST['usage_limit'] ?? 0 ),
				'notes'      => sanitize_textarea_field( wp_unslash( $_POST['notes'] ?? '' ) ),
			),
			sanitize_text_field( wp_unslash( $_POST['request_id'] ?? '' ) )
		);
		if ( is_wp_error( $result ) ) {
			self::redirect( 'access', $result->get_error_message(), 'error' );
		}
		nocache_headers();
		?><!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bulk access code created</title><style>body{font-family:system-ui,sans-serif;background:#f0f0f1;margin:0;padding:40px;color:#1d2327}.box{max-width:680px;margin:auto;background:#fff;border:1px solid #c3c4c7;border-radius:8px;padding:28px}.code{display:block;margin:20px 0;padding:18px;background:#f6f7f7;border:1px solid #dcdcde;font:700 21px ui-monospace,monospace;letter-spacing:.05em;overflow-wrap:anywhere}.button{display:inline-block;background:#2271b1;color:#fff;text-decoration:none;padding:9px 14px;border-radius:3px}</style></head><body><main class="box"><h1>Access code created</h1><p>Copy it now. For security, the complete code will not be shown again.</p><code class="code"><?php echo esc_html( $result['code'] ); ?></code><a class="button" href="<?php echo esc_url( self::page_url( 'access' ) ); ?>">Return to Access Codes</a></main></body></html><?php
		exit;
	}

	public static function save_access_mode(): void {
		self::authorize( 'phaseone_bulk_manage_access_mode' );
		$mode = 'public' === sanitize_key( wp_unslash( $_POST['access_mode'] ?? '' ) ) ? 'public' : 'private';
		$settings = get_option( 'phaseone_bulk_settings', array() );
		$settings = is_array( $settings ) ? $settings : array();
		$settings['access_mode'] = $mode;
		update_option( 'phaseone_bulk_settings', $settings, false );
		self::redirect( 'access', 'Catalog visibility updated.', 'success' );
	}

	public static function access_action(): void {
		self::authorize( 'phaseone_bulk_access_action' );
		$id = absint( $_GET['access_id'] ?? 0 );
		$operation = sanitize_key( wp_unslash( $_GET['operation'] ?? '' ) );
		if ( 'revoke' === $operation ) {
			PhaseOne_Bulk_Access::revoke( $id );
		} elseif ( in_array( $operation, array( 'activate', 'deactivate' ), true ) ) {
			PhaseOne_Bulk_Access::set_active( $id, 'activate' === $operation );
		}
		self::redirect( 'access', 'Access code updated.', 'success' );
	}

	private static function notice(): void {
		$message = sanitize_text_field( wp_unslash( $_GET['phaseone_bulk_message'] ?? '' ) );
		if ( '' === $message ) {
			return;
		}
		$type = 'error' === sanitize_key( wp_unslash( $_GET['phaseone_bulk_type'] ?? '' ) ) ? 'error' : 'success';
		echo '<div class="notice notice-' . esc_attr( $type ) . ' is-dismissible"><p>' . esc_html( $message ) . '</p></div>';
	}

	private static function authorize( string $nonce_action ): void {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die( esc_html__( 'You are not allowed to manage Bulk Orders.', 'phaseone-bulk-orders' ) );
		}
		check_admin_referer( $nonce_action );
	}

	private static function redirect( string $tab, string $message, string $type ): never {
		wp_safe_redirect( add_query_arg( array( 'page' => self::PAGE, 'tab' => $tab, 'phaseone_bulk_message' => $message, 'phaseone_bulk_type' => $type ), admin_url( 'admin.php' ) ) );
		exit;
	}

	private static function page_url( string $tab ): string {
		return add_query_arg( array( 'page' => self::PAGE, 'tab' => $tab ), admin_url( 'admin.php' ) );
	}

	private static function access_action_link( int $id, string $operation, string $label, bool $danger = false ): string {
		$url = wp_nonce_url( add_query_arg( array( 'action' => 'phaseone_bulk_access_action', 'access_id' => $id, 'operation' => $operation ), admin_url( 'admin-post.php' ) ), 'phaseone_bulk_access_action' );
		return '<a class="' . ( $danger ? 'phaseone-bulk-danger' : '' ) . '" href="' . esc_url( $url ) . '"' . ( $danger ? ' data-confirm="Revoke this code and all active sessions?"' : '' ) . '>' . esc_html( $label ) . '</a>';
	}

	private static function display_date( ?string $utc ): string {
		if ( empty( $utc ) ) {
			return 'Never';
		}
		return wp_date( 'M j, Y g:i a', strtotime( $utc . ' UTC' ), wp_timezone() );
	}
}
