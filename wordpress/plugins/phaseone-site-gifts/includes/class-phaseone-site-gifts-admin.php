<?php

defined( 'ABSPATH' ) || exit;

final class PhaseOne_Site_Gifts_Admin {
	private const PAGE = 'phaseone-site-gifts';

	public static function boot(): void {
		add_action( 'admin_menu', array( __CLASS__, 'menu' ) );
		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'assets' ) );
		add_action( 'admin_post_phaseone_site_gifts_save', array( __CLASS__, 'save' ) );
		add_action( 'admin_post_phaseone_site_gifts_add', array( __CLASS__, 'add' ) );
	}

	public static function menu(): void {
		add_submenu_page(
			'woocommerce',
			'Site Gifts',
			'Site Gifts',
			'manage_woocommerce',
			self::PAGE,
			array( __CLASS__, 'render' )
		);
	}

	public static function assets( string $hook ): void {
		if ( 'woocommerce_page_' . self::PAGE !== $hook ) {
			return;
		}

		wp_enqueue_style( 'woocommerce_admin_styles' );
		wp_enqueue_script( 'wc-enhanced-select' );
		wp_enqueue_style(
			'phaseone-site-gifts-admin',
			PHASEONE_SITE_GIFTS_URL . 'assets/admin.css',
			array(),
			PHASEONE_SITE_GIFTS_VERSION
		);
	}

	public static function add(): void {
		self::authorize_request();
		$config = PhaseOne_Site_Gifts_Rules::get();
		$config['tiers'][] = array(
			'id'           => 'gift-' . strtolower( wp_generate_password( 12, false, false ) ),
			'name'         => '',
			'threshold'    => 0,
			'product_id'   => 0,
			'variation_id' => 0,
			'quantity'     => 1,
			'active'       => false,
			'priority'     => count( $config['tiers'] ) * 10 + 10,
			'starts_at'    => '',
			'ends_at'      => '',
		);
		PhaseOne_Site_Gifts_Rules::update( $config );
		self::redirect( 'added' );
	}

	public static function save(): void {
		self::authorize_request();
		$raw = isset( $_POST['phaseone_site_gifts'] ) && is_array( $_POST['phaseone_site_gifts'] )
			? wp_unslash( $_POST['phaseone_site_gifts'] )
			: array();
		PhaseOne_Site_Gifts_Rules::update( $raw );
		self::redirect( 'saved' );
	}

	public static function render(): void {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			return;
		}

		$config = PhaseOne_Site_Gifts_Rules::get();
		?>
		<div class="wrap phaseone-gifts-admin">
			<div class="phaseone-gifts-heading">
				<div>
					<h1>Site Gifts</h1>
					<p>Automatic gifts based on the final eligible merchandise total.</p>
				</div>
				<form action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post">
					<input type="hidden" name="action" value="phaseone_site_gifts_add">
					<?php wp_nonce_field( 'phaseone_site_gifts_manage' ); ?>
					<button class="button button-primary" type="submit">Add gift tier</button>
				</form>
			</div>

			<?php if ( isset( $_GET['phaseone_gifts_updated'] ) ) : ?>
				<div class="notice notice-success is-dismissible"><p>Site Gift rules updated.</p></div>
			<?php endif; ?>

			<form action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" method="post">
				<input type="hidden" name="action" value="phaseone_site_gifts_save">
				<?php wp_nonce_field( 'phaseone_site_gifts_manage' ); ?>

				<section class="phaseone-gifts-settings">
					<label for="phaseone-gift-mode">Tier behavior</label>
					<select id="phaseone-gift-mode" name="phaseone_site_gifts[mode]">
						<option value="highest" <?php selected( $config['mode'], 'highest' ); ?>>Highest tier only</option>
						<option value="cumulative" <?php selected( $config['mode'], 'cumulative' ); ?>>Cumulative</option>
					</select>
					<p>Highest awards one gift. Cumulative awards every unlocked tier.</p>
				</section>

				<div class="phaseone-gifts-list">
					<?php if ( empty( $config['tiers'] ) ) : ?>
						<div class="phaseone-gifts-empty">No gift tiers configured yet.</div>
					<?php endif; ?>

					<?php foreach ( $config['tiers'] as $index => $tier ) :
						$gift_id = ! empty( $tier['variation_id'] ) ? (int) $tier['variation_id'] : (int) $tier['product_id'];
						$product = $gift_id ? wc_get_product( $gift_id ) : false;
						?>
						<article class="phaseone-gift-tier">
							<header>
								<div>
									<strong><?php echo esc_html( $tier['name'] ?: 'Untitled gift tier' ); ?></strong>
									<span><?php echo wp_kses_post( wc_price( $tier['threshold'] ) ); ?> threshold</span>
								</div>
								<label class="phaseone-gift-active">
									<input type="checkbox" name="phaseone_site_gifts[tiers][<?php echo esc_attr( $index ); ?>][active]" value="1" <?php checked( ! empty( $tier['active'] ) ); ?>>
									Active
								</label>
							</header>

							<input type="hidden" name="phaseone_site_gifts[tiers][<?php echo esc_attr( $index ); ?>][id]" value="<?php echo esc_attr( $tier['id'] ); ?>">
							<div class="phaseone-gift-grid">
								<label>Internal name<input type="text" name="phaseone_site_gifts[tiers][<?php echo esc_attr( $index ); ?>][name]" value="<?php echo esc_attr( $tier['name'] ); ?>" required></label>
								<label>Minimum threshold<input type="number" min="0" step="0.01" name="phaseone_site_gifts[tiers][<?php echo esc_attr( $index ); ?>][threshold]" value="<?php echo esc_attr( $tier['threshold'] ); ?>" required></label>
								<label>Quantity<input type="number" min="1" max="99" step="1" name="phaseone_site_gifts[tiers][<?php echo esc_attr( $index ); ?>][quantity]" value="<?php echo esc_attr( $tier['quantity'] ); ?>" required></label>
								<label>Priority<input type="number" min="0" max="9999" step="1" name="phaseone_site_gifts[tiers][<?php echo esc_attr( $index ); ?>][priority]" value="<?php echo esc_attr( $tier['priority'] ); ?>"></label>
								<label class="phaseone-gift-product">Gift product or variation
									<select class="wc-product-search" name="phaseone_site_gifts[tiers][<?php echo esc_attr( $index ); ?>][gift_product_id]" data-placeholder="Search for a product..." data-action="woocommerce_json_search_products_and_variations" required>
										<?php if ( $product instanceof WC_Product ) : ?><option value="<?php echo esc_attr( $gift_id ); ?>" selected><?php echo esc_html( wp_strip_all_tags( $product->get_formatted_name() ) ); ?></option><?php endif; ?>
									</select>
								</label>
								<label>Starts at <small>optional, UTC</small><input type="datetime-local" name="phaseone_site_gifts[tiers][<?php echo esc_attr( $index ); ?>][starts_at]" value="<?php echo esc_attr( $tier['starts_at'] ); ?>"></label>
								<label>Ends at <small>optional, UTC</small><input type="datetime-local" name="phaseone_site_gifts[tiers][<?php echo esc_attr( $index ); ?>][ends_at]" value="<?php echo esc_attr( $tier['ends_at'] ); ?>"></label>
							</div>
							<label class="phaseone-gift-delete"><input type="checkbox" name="phaseone_site_gifts[tiers][<?php echo esc_attr( $index ); ?>][_delete]" value="1"> Delete this tier when saving</label>
						</article>
					<?php endforeach; ?>
				</div>

				<?php if ( ! empty( $config['tiers'] ) ) : ?>
					<p class="submit"><button class="button button-primary" type="submit">Save gift rules</button></p>
				<?php endif; ?>
			</form>
		</div>
		<?php
	}

	private static function authorize_request(): void {
		if ( ! current_user_can( 'manage_woocommerce' ) ) {
			wp_die( esc_html__( 'You are not allowed to manage Site Gifts.', 'phaseone-site-gifts' ) );
		}
		check_admin_referer( 'phaseone_site_gifts_manage' );
	}

	private static function redirect( string $result ): void {
		wp_safe_redirect(
			add_query_arg(
				array( 'page' => self::PAGE, 'phaseone_gifts_updated' => $result ),
				admin_url( 'admin.php' )
			)
		);
		exit;
	}
}
