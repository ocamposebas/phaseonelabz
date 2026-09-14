<?php

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Bulk_Admin {
	private const PAGE = 'phaseone-bulk-orders';
	private const TABS = array(
		'overview'  => 'Overview',
		'rules'     => 'Product Rules',
		'customers' => 'Customer Access',
		'requests'  => 'Access Requests',
		'codes'     => 'Access Codes',
		'settings'  => 'Settings',
	);

	public static function boot(): void {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'assets' ) );
		add_action( 'admin_post_phaseone_bulk_add_rule', array( __CLASS__, 'add_rule' ) );
		add_action( 'admin_post_phaseone_bulk_save_rules', array( __CLASS__, 'save_rules' ) );
		add_action( 'admin_post_phaseone_bulk_save_settings', array( __CLASS__, 'save_settings' ) );
		add_action( 'admin_post_phaseone_bulk_create_access', array( __CLASS__, 'create_access' ) );
		add_action( 'admin_post_phaseone_bulk_access_action', array( __CLASS__, 'access_action' ) );
		add_action( 'admin_post_phaseone_bulk_customer_action', array( __CLASS__, 'customer_action' ) );
		add_action( 'admin_post_phaseone_bulk_request_action', array( __CLASS__, 'request_action' ) );
	}

	public static function menu(): void {
		add_submenu_page( 'woocommerce', 'Bulk Orders', 'Bulk Orders', 'manage_woocommerce', self::PAGE, array( __CLASS__, 'render' ) );
	}

	public static function assets( string $hook ): void {
		if ( 'woocommerce_page_' . self::PAGE !== $hook ) {
			return;
		}
		$tab = sanitize_key( wp_unslash( $_GET['tab'] ?? 'overview' ) );
		wp_enqueue_style( 'woocommerce_admin_styles' );
		if ( 'rules' === $tab ) {
			wp_enqueue_script( 'wc-enhanced-select' );
		}
		wp_enqueue_style( 'phaseone-bulk-admin', PHASEONE_BULK_URL . 'assets/admin.css', array(), PHASEONE_BULK_VERSION );
		wp_enqueue_script( 'phaseone-bulk-admin', PHASEONE_BULK_URL . 'assets/admin.js', array(), PHASEONE_BULK_VERSION, true );
	}

	public static function render(): void {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}
		$tab = sanitize_key( wp_unslash( $_GET['tab'] ?? 'overview' ) );
		$tab = array_key_exists( $tab, self::TABS ) ? $tab : 'overview';
		?>
		<div class="wrap phaseone-bulk-admin">
			<header class="phaseone-bulk-heading">
				<div><h1>Bulk Orders</h1><p>Customer access, catalog visibility, availability and server-authoritative pricing.</p></div>
			</header>
			<nav class="nav-tab-wrapper" aria-label="Bulk Orders sections">
				<?php foreach ( self::TABS as $key => $label ) : ?>
					<a class="nav-tab <?php echo $key === $tab ? 'nav-tab-active' : ''; ?>" href="<?php echo esc_url( self::page_url( $key ) ); ?>"><?php echo esc_html( $label ); ?></a>
				<?php endforeach; ?>
			</nav>
			<?php self::notice(); ?>
			<?php
			switch ( $tab ) {
				case 'rules': self::render_rules(); break;
				case 'customers': self::render_customers(); break;
				case 'requests': self::render_requests(); break;
				case 'codes': self::render_codes(); break;
				case 'settings': self::render_settings(); break;
				default: self::render_overview();
			}
			?>
		</div>
		<?php
	}

	private static function render_overview(): void {
		$settings = PhaseOne_Bulk_Installer::settings();
		$cards = array(
			'Catalog mode'       => 'include_all' === $settings['catalog_mode'] ? 'Include all' : 'Legacy explicit',
			'Global discount'    => self::percent( $settings['global_discount'] ),
			'Default kit'        => PhaseOne_Bulk_Installer::KIT_UNITS . ' units',
			'Session duration'   => (int) $settings['session_days'] . ' days',
		);
		?>
		<section class="phaseone-bulk-overview-grid">
			<?php foreach ( $cards as $label => $value ) : ?>
				<article class="phaseone-bulk-panel"><span><?php echo esc_html( $label ); ?></span><strong><?php echo esc_html( (string) $value ); ?></strong></article>
			<?php endforeach; ?>
		</section>
		<section class="phaseone-bulk-panel">
			<h2>Manage Bulk Orders</h2>
			<p>Open only the section you need. Product, customer and request records are loaded inside their own tabs instead of delaying this overview.</p>
			<p class="phaseone-bulk-inline-actions">
				<a class="button button-primary" href="<?php echo esc_url( self::page_url( 'rules' ) ); ?>">Product Rules</a>
				<a class="button" href="<?php echo esc_url( self::page_url( 'customers' ) ); ?>">Customer Access</a>
				<a class="button" href="<?php echo esc_url( self::page_url( 'requests' ) ); ?>">Access Requests</a>
				<a class="button" href="<?php echo esc_url( self::page_url( 'codes' ) ); ?>">Access Codes</a>
			</p>
		</section>
		<?php
	}

	private static function render_rules(): void {
		$ids = PhaseOne_Bulk_Product_Rules::configured_ids();
		$settings = PhaseOne_Bulk_Installer::settings();
		$categories = get_terms( array( 'taxonomy' => 'product_cat', 'hide_empty' => false ) );
		$excluded_products = array();
		foreach ( $settings['excluded_product_ids'] as $excluded_product_id ) {
			$excluded_product = wc_get_product( (int) $excluded_product_id );
			if ( $excluded_product instanceof WC_Product ) {
				$excluded_products[] = $excluded_product;
			}
		}
		?>
		<section class="phaseone-bulk-panel phaseone-bulk-add-rule">
			<div><span class="phaseone-bulk-kicker">Product rules</span><h2>Add a product, family or variation</h2><p>Create a rule only when an item needs different visibility, availability, quantity limits or pricing.</p></div>
			<form action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post">
				<input type="hidden" name="action" value="phaseone_bulk_add_rule"><?php wp_nonce_field( 'phaseone_bulk_manage_rules' ); ?>
				<select class="wc-product-search" name="product_id" data-placeholder="Search by product or SKU..." data-action="woocommerce_json_search_products_and_variations" required></select>
				<button class="button button-primary" type="submit">Add rule</button>
			</form>
		</section>

		<form class="phaseone-bulk-rules-form" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post">
			<input type="hidden" name="action" value="phaseone_bulk_save_rules"><?php wp_nonce_field( 'phaseone_bulk_manage_rules' ); ?>
			<details class="phaseone-bulk-panel phaseone-bulk-exclusions">
				<summary><span><strong>Hide products completely</strong><small>Optional catalog exclusions</small></span><span class="phaseone-bulk-summary-action">Manage exclusions</span></summary>
				<p>Use this only when a product should disappear from the Bulk catalog. To keep it visible without allowing orders, use <strong>Bulk availability: Unavailable</strong> inside its rule.</p>
				<div class="phaseone-bulk-simple-grid">
					<label><span>Excluded categories</span><select name="excluded_category_ids[]" multiple class="wc-enhanced-select">
						<?php if ( ! is_wp_error( $categories ) ) : foreach ( $categories as $term ) : ?>
							<option value="<?php echo esc_attr( $term->term_id ); ?>" <?php selected( in_array( (int) $term->term_id, $settings['excluded_category_ids'], true ) ); ?>><?php echo esc_html( $term->name ); ?></option>
						<?php endforeach; endif; ?>
					</select><small>Explicit product or variation Include overrides this.</small></label>
					<label><span>Excluded products, families or variations</span><select name="excluded_product_ids[]" multiple class="wc-product-search" data-placeholder="Search any product, family, SKU or variation..." data-action="woocommerce_json_search_products_and_variations" data-minimum_input_length="1" style="width:100%">
						<?php foreach ( $excluded_products as $excluded_product ) : ?><option value="<?php echo esc_attr( $excluded_product->get_id() ); ?>" selected><?php echo esc_html( wp_strip_all_tags( $excluded_product->get_formatted_name() ) ); ?></option><?php endforeach; ?>
					</select><small>Every published or private WooCommerce product, variable family and individual variation is searchable here.</small></label>
				</div>
			</details>
			<div class="phaseone-bulk-list-heading"><div><span class="phaseone-bulk-kicker">Configured items</span><h2>Product rules</h2></div><span><?php echo esc_html( count( $ids ) ); ?> configured</span></div>
			<div class="phaseone-bulk-rule-list">
				<?php if ( empty( $ids ) ) : ?><div class="phaseone-bulk-empty">No explicit exceptions or pricing overrides yet.</div><?php endif; ?>
				<?php foreach ( $ids as $id ) : self::render_rule( $id ); endforeach; ?>
			</div>
			<div class="phaseone-bulk-savebar"><span>Changes apply to new catalog requests, quotes and checkout intents.</span><button class="button button-primary" type="submit">Save product rules</button></div>
		</form>
		<?php
	}

	private static function render_rule( int $id ): void {
		$product = wc_get_product( $id );
		$rule = PhaseOne_Bulk_Product_Rules::get( $id );
		if ( ! $product instanceof WC_Product || is_wp_error( $rule ) ) {
			return;
		}
		$kit_units = PhaseOne_Bulk_Installer::KIT_UNITS;
		$tier_text = implode( "\n", array_map( static fn( array $tier ): string => max( 1, (int) ( $tier['minimum'] / $kit_units ) ) . ': ' . wc_format_decimal( (float) $tier['price'] * $kit_units, wc_get_price_decimals() ), $rule['tiers'] ) );
		$kit_price = $rule['fixed_price'] > 0 ? (float) $rule['fixed_price'] * $kit_units : 0;
		$status_key = 'inherited';
		$status_label = 'Inherited';
		if ( 'exclude' === $rule['catalog_override'] ) {
			$status_key = 'hidden';
			$status_label = 'Hidden';
		} elseif ( 'unavailable' === $rule['availability_override'] ) {
			$status_key = 'unavailable';
			$status_label = 'Unavailable';
		} elseif ( 'available' === $rule['availability_override'] ) {
			$status_key = 'available';
			$status_label = 'Available';
		}
		?>
		<article class="phaseone-bulk-rule" data-rule>
			<header class="phaseone-bulk-rule-header">
				<div class="phaseone-bulk-rule-identity"><span><?php echo esc_html( $product->is_type( 'variable' ) ? 'Product family' : ( $product->is_type( 'variation' ) ? 'Product variation' : 'Simple product' ) ); ?></span><strong><?php echo esc_html( wp_strip_all_tags( $product->get_formatted_name() ) ); ?></strong><small><?php echo $product->is_type( 'variable' ) ? 'Applies to inherited variations' : 'SKU: ' . esc_html( $product->get_sku() ?: 'Missing SKU' ); ?></small></div>
				<span class="phaseone-bulk-rule-status is-<?php echo esc_attr( $status_key ); ?>" data-rule-status><?php echo esc_html( $status_label ); ?></span>
			</header>
			<input type="hidden" name="rules[<?php echo esc_attr( $id ); ?>][product_id]" value="<?php echo esc_attr( $id ); ?>">
			<section class="phaseone-bulk-rule-section">
				<div class="phaseone-bulk-section-heading"><strong>Availability &amp; limits</strong><span>Control how this item appears and how many units can be ordered.</span></div>
				<div class="phaseone-bulk-rule-grid">
				<label><span>Catalog visibility</span><select name="rules[<?php echo esc_attr( $id ); ?>][catalog_override]" data-catalog-override><option value="inherit" <?php selected( $rule['catalog_override'], 'inherit' ); ?>>Use catalog default</option><option value="include" <?php selected( $rule['catalog_override'], 'include' ); ?>>Show in Bulk catalog</option><option value="exclude" <?php selected( $rule['catalog_override'], 'exclude' ); ?>>Hide from Bulk catalog</option></select><small>Hidden items disappear from the Bulk page.</small></label>
				<label><span>Bulk availability</span><select name="rules[<?php echo esc_attr( $id ); ?>][availability_override]" data-availability-override><option value="inherit" <?php selected( $rule['availability_override'], 'inherit' ); ?>>Use WooCommerce status</option><option value="available" <?php selected( $rule['availability_override'], 'available' ); ?>>Available for Bulk</option><option value="unavailable" <?php selected( $rule['availability_override'], 'unavailable' ); ?>>Unavailable - keep visible</option></select><small>Unavailable remains visible but cannot be ordered.</small></label>
				<label><span>Minimum bundles</span><input type="number" min="1" step="1" name="rules[<?php echo esc_attr( $id ); ?>][minimum_kits]" value="<?php echo ! empty( $rule['minimum_explicit'] ) ? esc_attr( max( 1, (int) ceil( $rule['minimum'] / $kit_units ) ) ) : ''; ?>" placeholder="Use global default"><small>Leave empty to inherit Settings.</small></label>
				<label><span>Maximum units</span><input type="number" min="0" step="10" name="rules[<?php echo esc_attr( $id ); ?>][maximum]" value="<?php echo esc_attr( $rule['maximum'] ?: '' ); ?>" placeholder="No maximum"><small>Optional; use multiples of <?php echo esc_html( (string) $kit_units ); ?>.</small></label>
			</div>
			</section>
			<section class="phaseone-bulk-rule-section phaseone-bulk-rule-section--pricing">
				<div class="phaseone-bulk-section-heading"><strong>Pricing</strong><span>Only the inputs for the selected method are used.</span></div>
				<div class="phaseone-bulk-simple-grid">
				<label><span>Pricing method</span><select name="rules[<?php echo esc_attr( $id ); ?>][mode]" data-pricing-mode><option value="inherit" <?php selected( $rule['mode'], 'inherit' ); ?>>Use global discount</option><option value="discount" <?php selected( $rule['mode'], 'discount' ); ?>>Custom discount</option><option value="fixed" <?php selected( $rule['mode'], 'fixed' ); ?>>Fixed bundle price</option><option value="tiered" <?php selected( $rule['mode'], 'tiered' ); ?>>Tier pricing</option></select><small>Select one pricing source for this rule.</small></label>
				<label data-discount-wrap><span>Discount (%)</span><input type="number" min="0" max="99.99" step="0.01" inputmode="decimal" name="rules[<?php echo esc_attr( $id ); ?>][discount]" value="<?php echo esc_attr( wc_format_decimal( $rule['discount'], 2 ) ); ?>" placeholder="Example: 30"><small>Overrides the global discount for this item only.</small></label>
				<label data-bundle-price-wrap><span>Price per <?php echo esc_html( (string) $kit_units ); ?>-unit bundle</span><input type="number" min="0" step="0.01" name="rules[<?php echo esc_attr( $id ); ?>][bundle_price]" value="<?php echo esc_attr( $kit_price > 0 ? wc_format_decimal( $kit_price, wc_get_price_decimals() ) : '' ); ?>" placeholder="0.00"><small>Enter the total for the complete bundle, not the unit price.</small></label>
				<label data-tier-prices><span>Tier prices</span><textarea name="rules[<?php echo esc_attr( $id ); ?>][tier_kits]" rows="4" placeholder="1: 120&#10;5: 500"><?php echo esc_textarea( $tier_text ); ?></textarea><small>One per line: bundles, colon, bundle price.</small></label>
				</div>
			</section>
			<input type="hidden" name="rules[<?php echo esc_attr( $id ); ?>][fixed_price]" value="<?php echo esc_attr( $rule['fixed_price'] ); ?>">
			<footer class="phaseone-bulk-rule-footer"><label class="phaseone-bulk-remove"><input type="checkbox" name="rules[<?php echo esc_attr( $id ); ?>][_delete]" value="1"> <span>Remove this rule and return the product to inherited defaults</span></label></footer>
		</article>
		<?php
	}

	private static function render_customers(): void {
		$users = get_users( array( 'role__in' => array( 'customer', 'subscriber' ), 'number' => 250, 'orderby' => 'registered', 'order' => 'DESC' ) );
		?>
		<section class="phaseone-bulk-panel"><div class="phaseone-bulk-table-wrap"><table class="widefat striped"><thead><tr><th>Customer</th><th>Completed</th><th>Eligible</th><th>Tier</th><th>Temporary access</th><th>Actions</th></tr></thead><tbody>
		<?php if ( empty( $users ) ) : ?><tr><td colspan="6">No customer accounts found.</td></tr><?php endif; ?>
		<?php foreach ( $users as $user ) : $status = PhaseOne_Bulk_Access::customer_status( (int) $user->ID ); ?>
			<tr><td><strong><?php echo esc_html( $status['name'] ); ?></strong><br><small><?php echo esc_html( $status['email'] ); ?></small></td><td><?php echo esc_html( $status['completed_orders'] ); ?></td><td><?php echo $status['eligible'] ? 'Eligible' : 'Not yet'; ?></td><td><?php echo esc_html( ucfirst( $status['tier'] ) ); ?></td><td><?php echo $status['temporary_access'] ? esc_html( self::display_date( $status['temporary_expires_at'] ) ) : 'None'; ?></td><td>
				<form class="phaseone-bulk-inline-actions" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post"><input type="hidden" name="action" value="phaseone_bulk_customer_action"><input type="hidden" name="customer_id" value="<?php echo esc_attr( $user->ID ); ?>"><?php wp_nonce_field( 'phaseone_bulk_manage_customer' ); ?>
				<?php if ( 'special' === $status['tier'] ) : ?><button class="button" name="operation" value="remove-tier">Remove Tier</button><?php elseif ( $status['eligible'] ) : ?><button class="button button-primary" name="operation" value="grant-tier">Grant Special Tier</button><?php endif; ?>
				<?php if ( $status['temporary_access'] ) : ?><button class="button" name="operation" value="revoke-temporary">Revoke Temporary</button><?php endif; ?></form>
			</td></tr>
		<?php endforeach; ?></tbody></table></div></section>
		<?php
	}

	private static function render_requests(): void {
		$rows = PhaseOne_Bulk_Access_Requests::list_all();
		?>
		<section class="phaseone-bulk-panel"><div class="phaseone-bulk-table-wrap"><table class="widefat striped"><thead><tr><th>Customer</th><th>Orders</th><th>Eligibility</th><th>Requested</th><th>Notes / Actions</th></tr></thead><tbody>
		<?php if ( empty( $rows ) ) : ?><tr><td colspan="5">No Bulk access requests yet.</td></tr><?php endif; ?>
		<?php foreach ( $rows as $row ) : ?><tr><td><strong><?php echo esc_html( $row['customer_name'] ); ?></strong><br><small><?php echo esc_html( $row['customer_email'] ); ?> · <?php echo esc_html( ucfirst( $row['status'] ) ); ?></small></td><td><?php echo esc_html( $row['completed_orders'] ); ?></td><td><?php echo ! empty( $row['eligible'] ) ? 'Eligible' : 'Not yet'; ?></td><td><?php echo esc_html( self::display_date( $row['created_at'] ) ); ?></td><td><p><?php echo esc_html( $row['customer_note'] ?: 'No customer note.' ); ?></p>
			<form action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post"><input type="hidden" name="action" value="phaseone_bulk_request_action"><input type="hidden" name="request_id" value="<?php echo esc_attr( $row['id'] ); ?>"><?php wp_nonce_field( 'phaseone_bulk_manage_request' ); ?><textarea name="internal_note" rows="2" placeholder="Internal note"><?php echo esc_textarea( $row['internal_note'] ); ?></textarea><div class="phaseone-bulk-inline-actions"><button class="button button-primary" name="operation" value="approve">Approve</button><button class="button" name="operation" value="reject">Reject</button><button class="button" name="operation" value="archive">Archive</button></div></form>
		</td></tr><?php endforeach; ?></tbody></table></div></section>
		<?php
	}

	private static function render_codes(): void {
		$rows = PhaseOne_Bulk_Access::list_all();
		$request_id = wp_generate_uuid4();
		?>
		<section class="phaseone-bulk-panel phaseone-bulk-create-access"><div><h2>Create temporary Access Code</h2><p>Shown once. The complete code is never stored as plaintext. Sessions last for the duration configured in Settings.</p></div><form action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post"><input type="hidden" name="action" value="phaseone_bulk_create_access"><input type="hidden" name="request_id" value="<?php echo esc_attr( $request_id ); ?>"><?php wp_nonce_field( 'phaseone_bulk_manage_access' ); ?><label>Code expiration <small>optional</small><input type="datetime-local" name="expires_at"></label><label>Usage limit <small>optional</small><input type="number" min="1" step="1" name="usage_limit" placeholder="Unlimited"></label><label class="phaseone-bulk-notes">Internal notes<textarea name="notes" rows="2" maxlength="500"></textarea></label><label class="phaseone-bulk-checkbox"><input type="checkbox" name="is_active" value="1" checked> Active</label><button class="button button-primary" type="submit">Generate code</button></form></section>
		<section class="phaseone-bulk-panel"><div class="phaseone-bulk-table-wrap"><table class="widefat striped phaseone-bulk-access-table"><thead><tr><th>Code</th><th>Status</th><th>Expiration</th><th>Usage</th><th>Notes</th><th>Actions</th></tr></thead><tbody>
		<?php if ( empty( $rows ) ) : ?><tr><td colspan="6">No access codes created yet.</td></tr><?php endif; ?>
		<?php foreach ( $rows as $row ) : $expired = ! empty( $row['expires_at'] ) && strtotime( $row['expires_at'] . ' UTC' ) <= time(); $status = ! empty( $row['revoked_at'] ) ? 'Revoked' : ( $expired ? 'Expired' : ( ! empty( $row['is_active'] ) ? 'Active' : 'Inactive' ) ); ?>
			<tr><td><code>••••••<?php echo esc_html( $row['code_suffix'] ); ?></code></td><td><?php echo esc_html( $status ); ?></td><td><?php echo esc_html( self::display_date( $row['expires_at'] ) ); ?></td><td><?php echo esc_html( (string) $row['uses'] ); ?> / <?php echo esc_html( $row['usage_limit'] ?: '∞' ); ?></td><td><?php echo esc_html( $row['notes'] ?: '—' ); ?></td><td><?php if ( empty( $row['revoked_at'] ) ) : echo wp_kses_post( self::access_action_link( (int) $row['id'], ! empty( $row['is_active'] ) ? 'deactivate' : 'activate', ! empty( $row['is_active'] ) ? 'Deactivate' : 'Activate' ) ); ?> · <?php echo wp_kses_post( self::access_action_link( (int) $row['id'], 'revoke', 'Revoke', true ) ); endif; ?></td></tr>
		<?php endforeach; ?></tbody></table></div></section>
		<?php
	}

	private static function render_settings(): void {
		$settings = PhaseOne_Bulk_Installer::settings();
		$preset = in_array( (int) $settings['session_days'], array( 7, 14, 30 ), true ) ? (string) $settings['session_days'] : 'custom';
		?>
		<form class="phaseone-bulk-panel phaseone-bulk-settings-form" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post"><input type="hidden" name="action" value="phaseone_bulk_save_settings"><?php wp_nonce_field( 'phaseone_bulk_manage_settings' ); ?>
			<h2>Bulk Settings</h2>
			<div class="phaseone-bulk-rule-grid">
				<label>Global Bulk Discount (%)<small>Default only. Explicit Product/Variation pricing remains stronger.</small><input type="number" name="global_discount" min="0" max="99.99" step="0.01" required value="<?php echo esc_attr( wc_format_decimal( $settings['global_discount'], 2 ) ); ?>"></label>
				<label>Global Catalog Mode<small>Include all applies inherited pricing automatically; exclusions still win.</small><select name="catalog_mode"><option value="include_all" <?php selected( $settings['catalog_mode'], 'include_all' ); ?>>Include all eligible products (recommended)</option><option value="legacy_explicit" <?php selected( $settings['catalog_mode'], 'legacy_explicit' ); ?>>Only explicitly included products</option></select></label>
				<label>Default Minimum Units<small>Saved in complete 10-unit Kits.</small><input type="number" name="default_minimum" min="10" step="10" value="<?php echo esc_attr( $settings['default_minimum'] ); ?>"></label>
				<label>Session Duration<select name="session_preset" data-session-preset><option value="7" <?php selected( $preset, '7' ); ?>>7 days</option><option value="14" <?php selected( $preset, '14' ); ?>>14 days</option><option value="30" <?php selected( $preset, '30' ); ?>>30 days</option><option value="custom" <?php selected( $preset, 'custom' ); ?>>Custom</option></select><input type="number" name="session_days" data-session-days min="1" max="3650" value="<?php echo esc_attr( $settings['session_days'] ); ?>"></label>
				<label>Checkout Intent Minutes<input type="number" name="intent_minutes" min="5" max="120" value="<?php echo esc_attr( $settings['intent_minutes'] ); ?>"></label>
				<label>Public Bulk Title<input type="text" name="public_title" maxlength="100" value="<?php echo esc_attr( $settings['public_title'] ); ?>"></label>
				<label class="phaseone-bulk-wide">Public introduction<textarea name="public_intro" rows="3" maxlength="500"><?php echo esc_textarea( $settings['public_intro'] ); ?></textarea></label>
			</div>
			<p><strong>Public savings wording is calculated automatically.</strong> The storefront uses the highest real savings available after all Product and Variation overrides; no percentage is hardcoded in frontend copy.</p>
			<p class="submit"><button class="button button-primary" type="submit">Save Bulk Settings</button></p>
		</form>
		<?php
	}

	public static function add_rule(): void {
		self::authorize( 'phaseone_bulk_manage_rules' );
		$id = absint( $_POST['product_id'] ?? 0 );
		$result = PhaseOne_Bulk_Product_Rules::save( $id, array( 'catalog_override' => 'inherit', 'availability_override' => 'inherit', 'minimum_kits' => '', 'maximum' => 0, 'mode' => 'inherit', 'discount' => 0, 'fixed_price' => 0, 'tiers' => array() ) );
		self::redirect( 'rules', is_wp_error( $result ) ? $result->get_error_message() : 'Rule added. Configure only the exception you need.', is_wp_error( $result ) ? 'error' : 'success' );
	}

	public static function save_rules(): void {
		self::authorize( 'phaseone_bulk_manage_rules' );
		PhaseOne_Bulk_Installer::update_settings( array( 'excluded_category_ids' => (array) ( $_POST['excluded_category_ids'] ?? array() ), 'excluded_product_ids' => (array) ( $_POST['excluded_product_ids'] ?? array() ) ) );
		$rules = isset( $_POST['rules'] ) && is_array( $_POST['rules'] ) ? wp_unslash( $_POST['rules'] ) : array();
		$errors = array();
		foreach ( $rules as $id => $raw ) {
			$id = absint( $id );
			if ( ! $id || ! is_array( $raw ) ) continue;
			$result = ! empty( $raw['_delete'] ) ? PhaseOne_Bulk_Product_Rules::delete( $id ) : PhaseOne_Bulk_Product_Rules::save( $id, $raw );
			if ( is_wp_error( $result ) ) $errors[] = $result->get_error_message();
			elseif ( false === $result ) $errors[] = 'A product rule could not be saved.';
		}
		self::redirect( 'rules', $errors ? implode( ' ', array_unique( $errors ) ) : 'Product rules saved.', $errors ? 'error' : 'success' );
	}

	public static function save_settings(): void {
		self::authorize( 'phaseone_bulk_manage_settings' );
		$result = PhaseOne_Bulk_Installer::update_settings( array(
			'global_discount' => wp_unslash( $_POST['global_discount'] ?? '' ),
			'catalog_mode' => sanitize_key( wp_unslash( $_POST['catalog_mode'] ?? '' ) ),
			'default_minimum' => absint( $_POST['default_minimum'] ?? 10 ),
			'session_days' => absint( $_POST['session_days'] ?? 14 ),
			'intent_minutes' => absint( $_POST['intent_minutes'] ?? 30 ),
			'public_title' => sanitize_text_field( wp_unslash( $_POST['public_title'] ?? '' ) ),
			'public_intro' => sanitize_textarea_field( wp_unslash( $_POST['public_intro'] ?? '' ) ),
		) );
		self::redirect( 'settings', is_wp_error( $result ) ? $result->get_error_message() : 'Bulk settings saved. New quotes now use the updated pricing.', is_wp_error( $result ) ? 'error' : 'success' );
	}

	public static function customer_action(): void {
		self::authorize( 'phaseone_bulk_manage_customer' );
		$id = absint( $_POST['customer_id'] ?? 0 );
		$operation = sanitize_key( wp_unslash( $_POST['operation'] ?? '' ) );
		$result = true;
		if ( 'grant-tier' === $operation ) $result = PhaseOne_Bulk_Access::grant_special_tier( $id );
		elseif ( 'remove-tier' === $operation ) PhaseOne_Bulk_Access::remove_special_tier( $id );
		elseif ( 'revoke-temporary' === $operation ) PhaseOne_Bulk_Access::revoke_customer_sessions( $id, 'code' );
		else $result = new WP_Error( 'phaseone_bulk_customer_action_invalid', 'Choose a valid customer action.' );
		self::redirect( 'customers', is_wp_error( $result ) ? $result->get_error_message() : 'Customer access updated.', is_wp_error( $result ) ? 'error' : 'success' );
	}

	public static function request_action(): void {
		self::authorize( 'phaseone_bulk_manage_request' );
		$result = PhaseOne_Bulk_Access_Requests::review( absint( $_POST['request_id'] ?? 0 ), sanitize_key( wp_unslash( $_POST['operation'] ?? '' ) ), sanitize_textarea_field( wp_unslash( $_POST['internal_note'] ?? '' ) ) );
		self::redirect( 'requests', is_wp_error( $result ) ? $result->get_error_message() : 'Access request updated.', is_wp_error( $result ) ? 'error' : 'success' );
	}

	public static function create_access(): void {
		self::authorize( 'phaseone_bulk_manage_access' );
		$result = PhaseOne_Bulk_Access::create( array( 'is_active' => ! empty( $_POST['is_active'] ), 'expires_at' => sanitize_text_field( wp_unslash( $_POST['expires_at'] ?? '' ) ), 'usage_limit' => absint( $_POST['usage_limit'] ?? 0 ), 'notes' => sanitize_textarea_field( wp_unslash( $_POST['notes'] ?? '' ) ) ), sanitize_text_field( wp_unslash( $_POST['request_id'] ?? '' ) ) );
		if ( is_wp_error( $result ) ) self::redirect( 'codes', $result->get_error_message(), 'error' );
		nocache_headers();
		?><!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Bulk access code created</title><style>body{font-family:system-ui,sans-serif;background:#f0f0f1;margin:0;padding:40px;color:#1d2327}.box{max-width:680px;margin:auto;background:#fff;border:1px solid #c3c4c7;border-radius:8px;padding:28px}.code{display:block;margin:20px 0;padding:18px;background:#f6f7f7;border:1px solid #dcdcde;font:700 21px ui-monospace,monospace;letter-spacing:.05em;overflow-wrap:anywhere}.button{display:inline-block;background:#2271b1;color:#fff;text-decoration:none;padding:9px 14px;border-radius:3px}</style></head><body><main class="box"><h1>Access code created</h1><p>Copy it now. It will not be shown again.</p><code class="code"><?php echo esc_html( $result['code'] ); ?></code><a class="button" href="<?php echo esc_url( self::page_url( 'codes' ) ); ?>">Return to Access Codes</a></main></body></html><?php exit;
	}

	public static function access_action(): void {
		self::authorize( 'phaseone_bulk_access_action' );
		$id = absint( $_GET['access_id'] ?? 0 );
		$operation = sanitize_key( wp_unslash( $_GET['operation'] ?? '' ) );
		if ( 'revoke' === $operation ) PhaseOne_Bulk_Access::revoke( $id );
		elseif ( in_array( $operation, array( 'activate', 'deactivate' ), true ) ) PhaseOne_Bulk_Access::set_active( $id, 'activate' === $operation );
		self::redirect( 'codes', 'Access code updated.', 'success' );
	}

	private static function notice(): void {
		$message = sanitize_text_field( wp_unslash( $_GET['phaseone_bulk_message'] ?? '' ) );
		if ( '' === $message ) return;
		$type = 'error' === sanitize_key( wp_unslash( $_GET['phaseone_bulk_type'] ?? '' ) ) ? 'error' : 'success';
		echo '<div class="notice notice-' . esc_attr( $type ) . ' is-dismissible"><p>' . esc_html( $message ) . '</p></div>';
	}

	private static function authorize( string $nonce_action ): void {
		if ( ! current_user_can( 'manage_woocommerce' ) ) wp_die( esc_html__( 'You are not allowed to manage Bulk Orders.', 'phaseone-bulk-orders' ) );
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
		if ( empty( $utc ) ) return 'Never';
		return wp_date( 'M j, Y g:i a', strtotime( $utc . ( str_contains( $utc, 'T' ) ? '' : ' UTC' ) ), wp_timezone() );
	}

	private static function percent( float $value ): string {
		return rtrim( rtrim( number_format( $value, 2, '.', '' ), '0' ), '.' ) . '%';
	}
}
