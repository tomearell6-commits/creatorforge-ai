<?php
/**
 * Plugin Name: CreatorsForge Pull Publisher
 * Description: Collects the articles CreatorsForge SEO Autopilot writes for this site and publishes them here. For hosts whose firewall or captcha blocks CreatorsForge from sending posts in: this plugin asks CreatorsForge for the next article itself, so nothing has to get through the firewall.
 * Version: 1.1.0
 * Requires at least: 5.6
 * Requires PHP: 7.4
 * Author: CreatorsForge
 * License: GPL-2.0-or-later
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

define( 'CFPULL_VERSION', '1.1.0' );
define( 'CFPULL_IMG_TRIES_OPTION', 'cfpull_img_tries' );
define( 'CFPULL_CRON_HOOK', 'cfpull_collect' );
define( 'CFPULL_OPTION', 'cfpull_settings' );
define( 'CFPULL_LOG_OPTION', 'cfpull_log' );

/* ------------------------------------------------------------------ settings & log */

function cfpull_settings() {
	$defaults = array(
		'server'  => 'https://www.creatorsforge.io',
		'site_id' => '',
		'token'   => '',
	);
	$saved = get_option( CFPULL_OPTION, array() );
	return array_merge( $defaults, is_array( $saved ) ? $saved : array() );
}

function cfpull_log( $message ) {
	$log = get_option( CFPULL_LOG_OPTION, array() );
	if ( ! is_array( $log ) ) {
		$log = array();
	}
	array_unshift( $log, array( 't' => time(), 'm' => (string) $message ) );
	update_option( CFPULL_LOG_OPTION, array_slice( $log, 0, 15 ), false );
}

function cfpull_configured() {
	$s = cfpull_settings();
	return '' !== $s['server'] && '' !== $s['site_id'] && '' !== $s['token'];
}

/* ------------------------------------------------------------------ talking to CreatorsForge */

function cfpull_url( $path ) {
	$s = cfpull_settings();
	return rtrim( $s['server'], '/' ) . '/api/wp-pull/' . rawurlencode( $s['site_id'] ) . '/' . $path;
}

function cfpull_headers() {
	$s = cfpull_settings();
	return array(
		'Authorization' => 'Bearer ' . $s['token'],
		'Accept'        => 'application/json',
		'User-Agent'    => 'CreatorsForgePull/' . CFPULL_VERSION . '; ' . home_url(),
	);
}

/** Ask CreatorsForge whether the connection details are right. Returns array( ok, message ). */
function cfpull_ping() {
	if ( ! cfpull_configured() ) {
		return array( false, 'Fill in the three settings first.' );
	}
	$res = wp_remote_get( cfpull_url( 'ping' ), array( 'timeout' => 20, 'headers' => cfpull_headers() ) );
	if ( is_wp_error( $res ) ) {
		return array( false, 'Could not reach CreatorsForge: ' . $res->get_error_message() );
	}
	$code = wp_remote_retrieve_response_code( $res );
	if ( 200 === $code ) {
		return array( true, 'Connected to CreatorsForge.' );
	}
	if ( 404 === $code ) {
		return array( false, 'CreatorsForge does not recognise these details. Check the Site ID and the secret, and that "pull delivery" is switched on for this site in SEO Autopilot.' );
	}
	return array( false, 'CreatorsForge answered with HTTP ' . (int) $code . '.' );
}

function cfpull_report( $queue_id, $ok, $extra = array() ) {
	$body = array_merge( array( 'id' => $queue_id, 'ok' => (bool) $ok ), $extra );
	$res  = wp_remote_post(
		cfpull_url( 'report' ),
		array(
			'timeout' => 30,
			'headers' => array_merge( cfpull_headers(), array( 'Content-Type' => 'application/json' ) ),
			'body'    => wp_json_encode( $body ),
		)
	);
	if ( is_wp_error( $res ) ) {
		cfpull_log( 'Could not report back to CreatorsForge: ' . $res->get_error_message() );
		return false;
	}
	return 200 === wp_remote_retrieve_response_code( $res );
}

/* ------------------------------------------------------------------ creating the post */

function cfpull_author_id() {
	$ids = get_users( array( 'role' => 'administrator', 'number' => 1, 'fields' => 'ID', 'orderby' => 'ID' ) );
	return ! empty( $ids ) ? (int) $ids[0] : 1;
}

function cfpull_ends_with( $haystack, $suffix ) {
	$len = strlen( $suffix );
	return strlen( $haystack ) >= $len && substr( $haystack, -$len ) === $suffix;
}

/** Only pictures served by CreatorsForge's own storage are downloaded. */
function cfpull_image_host_allowed( $url ) {
	$host = wp_parse_url( $url, PHP_URL_HOST );
	$scheme = wp_parse_url( $url, PHP_URL_SCHEME );
	if ( ! $host || 'https' !== $scheme ) {
		return false;
	}
	$host   = strtolower( $host );
	$server = strtolower( (string) wp_parse_url( cfpull_settings()['server'], PHP_URL_HOST ) );
	return cfpull_ends_with( $host, '.supabase.co' ) || $host === $server || cfpull_ends_with( $host, '.creatorsforge.io' );
}

/**
 * Download the cover picture and make it the post's featured image. Tries up to three times (a slow host often needs a
 * second go) and says WHY when it cannot. Returns array( ok, reason ).
 */
function cfpull_attach_image( $post_id, $url, $alt, $slug ) {
	if ( ! cfpull_image_host_allowed( $url ) ) {
		return array( false, 'the picture address is not one this plugin may download from' );
	}
	require_once ABSPATH . 'wp-admin/includes/file.php';
	require_once ABSPATH . 'wp-admin/includes/media.php';
	require_once ABSPATH . 'wp-admin/includes/image.php';
	if ( function_exists( 'wp_raise_memory_limit' ) ) {
		wp_raise_memory_limit( 'image' );
	}

	$last = 'unknown problem';
	for ( $try = 1; $try <= 3; $try++ ) {
		$tmp = download_url( $url, 60 );
		if ( is_wp_error( $tmp ) ) {
			$last = 'download failed: ' . $tmp->get_error_message();
			usleep( 700000 * $try );
			continue;
		}
		if ( ! @getimagesize( $tmp ) ) { // phpcs:ignore WordPress.PHP.NoSilencedErrors
			@unlink( $tmp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
			$last = 'the downloaded file was not a picture';
			usleep( 700000 * $try );
			continue;
		}
		$file   = array(
			'name'     => sanitize_file_name( ( $slug ? $slug : 'article' ) . '.jpg' ),
			'tmp_name' => $tmp,
		);
		$att_id = media_handle_sideload( $file, $post_id, $alt );
		if ( is_wp_error( $att_id ) ) {
			if ( file_exists( $tmp ) ) {
				@unlink( $tmp ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
			}
			$last = 'WordPress could not save it: ' . $att_id->get_error_message();
			usleep( 700000 * $try );
			continue;
		}
		if ( $alt ) {
			update_post_meta( $att_id, '_wp_attachment_image_alt', sanitize_text_field( $alt ) );
		}
		set_post_thumbnail( $post_id, $att_id );
		return array( true, '' );
	}
	return array( false, $last );
}

/** Find the post a delivered article became: by its post id when it still matches, else by its address. */
function cfpull_find_post( $post_id, $slug ) {
	if ( $post_id ) {
		$p = get_post( (int) $post_id );
		if ( $p && 'post' === $p->post_type && ( '' === $slug || $p->post_name === $slug ) ) {
			return $p;
		}
	}
	if ( '' !== $slug ) {
		$p = get_page_by_path( $slug, OBJECT, 'post' );
		if ( $p ) {
			return $p;
		}
	}
	return null;
}

/**
 * Safety net: ask CreatorsForge for the cover pictures of recently delivered articles and attach any that is missing
 * (a download that failed, a time-out on a slow host). Each article is tried at most six times. Returns how many it fixed.
 */
function cfpull_repair_images( $max = 3 ) {
	if ( ! cfpull_configured() ) {
		return 0;
	}
	$res = wp_remote_get( cfpull_url( 'images' ), array( 'timeout' => 25, 'headers' => cfpull_headers() ) );
	if ( is_wp_error( $res ) || 200 !== wp_remote_retrieve_response_code( $res ) ) {
		return 0;
	}
	$data = json_decode( wp_remote_retrieve_body( $res ), true );
	if ( ! is_array( $data ) || empty( $data['items'] ) || ! is_array( $data['items'] ) ) {
		return 0;
	}
	$tries = get_option( CFPULL_IMG_TRIES_OPTION, array() );
	if ( ! is_array( $tries ) ) {
		$tries = array();
	}
	$fixed = 0;
	$done  = 0;
	foreach ( $data['items'] as $it ) {
		if ( $done >= $max ) {
			break;
		}
		$slug = isset( $it['slug'] ) ? sanitize_title( (string) $it['slug'] ) : '';
		$url  = isset( $it['imageUrl'] ) ? (string) $it['imageUrl'] : '';
		if ( '' === $slug || '' === $url ) {
			continue;
		}
		$post = cfpull_find_post( isset( $it['postId'] ) ? $it['postId'] : 0, $slug );
		if ( ! $post || has_post_thumbnail( $post->ID ) ) {
			continue;
		}
		$n = isset( $tries[ $slug ] ) ? (int) $tries[ $slug ] : 0;
		if ( $n >= 6 ) {
			continue;
		}
		$tries[ $slug ] = $n + 1;
		$done++;
		$alt            = isset( $it['imageAlt'] ) ? (string) $it['imageAlt'] : $post->post_title;
		list( $ok, $why ) = cfpull_attach_image( $post->ID, $url, $alt, $slug );
		if ( $ok ) {
			$fixed++;
			cfpull_log( 'Added the missing cover picture to: ' . get_permalink( $post->ID ) );
		} elseif ( 0 === $n || 5 === $n ) {
			cfpull_log( 'Cover picture still missing on ' . get_permalink( $post->ID ) . ' (' . $why . ')' . ( 5 === $n ? ' - giving up on this one.' : ' - will retry.' ) );
		}
	}
	update_option( CFPULL_IMG_TRIES_OPTION, $tries, false );
	return $fixed;
}

function cfpull_category_ids( $name ) {
	$name = trim( (string) $name );
	if ( '' === $name ) {
		return array();
	}
	$term = term_exists( $name, 'category' );
	if ( ! $term ) {
		$term = wp_insert_term( $name, 'category' );
	}
	if ( is_wp_error( $term ) ) {
		return array();
	}
	return array( (int) ( is_array( $term ) ? $term['term_id'] : $term ) );
}

/** Create the post. Returns array( ok, data ). Idempotent: an article with the same address is reported, not duplicated. */
function cfpull_create_post( $p ) {
	$title = isset( $p['title'] ) ? wp_strip_all_tags( (string) $p['title'] ) : '';
	$html  = isset( $p['contentHtml'] ) ? (string) $p['contentHtml'] : '';
	if ( '' === $title || '' === trim( $html ) ) {
		return array( false, 'The article came without a title or text.' );
	}
	$slug = sanitize_title( ! empty( $p['slug'] ) ? $p['slug'] : $title );

	$existing = get_page_by_path( $slug, OBJECT, 'post' );
	if ( $existing ) {
		// A first attempt may have created the post but been cut short before the picture: finish that job now.
		$image_error = '';
		if ( ! empty( $p['imageUrl'] ) && ! has_post_thumbnail( $existing->ID ) ) {
			$alt = isset( $p['imageAlt'] ) ? (string) $p['imageAlt'] : $title;
			list( $img_ok, $img_why ) = cfpull_attach_image( $existing->ID, (string) $p['imageUrl'], $alt, $slug );
			$image_error = $img_ok ? '' : $img_why;
		}
		return array(
			true,
			array(
				'postId'     => $existing->ID,
				'url'        => get_permalink( $existing->ID ),
				'status'     => 'publish' === $existing->post_status ? 'publish' : $existing->post_status,
				'imageError' => $image_error,
			),
		);
	}

	$postarr = array(
		'post_type'    => 'post',
		'post_status'  => 'publish',
		'post_title'   => $title,
		'post_name'    => $slug,
		'post_content' => wp_kses_post( $html ),
		'post_excerpt' => isset( $p['excerpt'] ) ? sanitize_text_field( (string) $p['excerpt'] ) : '',
		'post_author'  => cfpull_author_id(),
	);
	$cats = cfpull_category_ids( isset( $p['category'] ) ? $p['category'] : '' );
	if ( $cats ) {
		$postarr['post_category'] = $cats;
	}
	if ( ! empty( $p['tags'] ) && is_array( $p['tags'] ) ) {
		$postarr['tags_input'] = array_map( 'sanitize_text_field', array_slice( $p['tags'], 0, 15 ) );
	}

	$post_id = wp_insert_post( wp_slash( $postarr ), true );
	if ( is_wp_error( $post_id ) ) {
		return array( false, 'WordPress could not create the post: ' . $post_id->get_error_message() );
	}

	// Search-engine title and description for the two common SEO plugins (harmless if neither is installed).
	$meta_title = isset( $p['metaTitle'] ) ? sanitize_text_field( (string) $p['metaTitle'] ) : '';
	$meta_desc  = isset( $p['metaDescription'] ) ? sanitize_text_field( (string) $p['metaDescription'] ) : '';
	$focus      = isset( $p['focusKeyword'] ) ? sanitize_text_field( (string) $p['focusKeyword'] ) : '';
	if ( '' !== $meta_title ) {
		update_post_meta( $post_id, 'rank_math_title', $meta_title );
		update_post_meta( $post_id, '_yoast_wpseo_title', $meta_title );
	}
	if ( '' !== $meta_desc ) {
		update_post_meta( $post_id, 'rank_math_description', $meta_desc );
		update_post_meta( $post_id, '_yoast_wpseo_metadesc', $meta_desc );
	}
	if ( '' !== $focus ) {
		update_post_meta( $post_id, 'rank_math_focus_keyword', $focus );
		update_post_meta( $post_id, '_yoast_wpseo_focuskw', $focus );
	}

	$image_error = '';
	if ( ! empty( $p['imageUrl'] ) ) {
		$alt = isset( $p['imageAlt'] ) ? (string) $p['imageAlt'] : $title;
		list( $img_ok, $img_why ) = cfpull_attach_image( $post_id, (string) $p['imageUrl'], $alt, $slug );
		$image_error              = $img_ok ? '' : $img_why;
	}

	return array(
		true,
		array(
			'postId'     => $post_id,
			'url'        => get_permalink( $post_id ),
			'status'     => get_post_status( $post_id ),
			'imageError' => $image_error,
		),
	);
}

/* ------------------------------------------------------------------ the collecting loop */

/** Collect up to $max waiting articles. Returns the number published. */
function cfpull_collect( $max = 3 ) {
	if ( ! cfpull_configured() ) {
		return 0;
	}
	// Two runs at once (the five-minute timer and the button) must not both work on the same article.
	if ( get_transient( 'cfpull_lock' ) ) {
		return 0;
	}
	set_transient( 'cfpull_lock', 1, 600 );
	try {
		$done = cfpull_collect_locked( $max );
		cfpull_repair_images( 3 );
	} finally {
		delete_transient( 'cfpull_lock' );
	}
	return $done;
}

function cfpull_collect_locked( $max ) {
	if ( function_exists( 'set_time_limit' ) ) {
		@set_time_limit( 180 ); // phpcs:ignore WordPress.PHP.NoSilencedErrors
	}
	$done = 0;
	for ( $i = 0; $i < $max; $i++ ) {
		$res = wp_remote_get( cfpull_url( 'next' ), array( 'timeout' => 25, 'headers' => cfpull_headers() ) );
		if ( is_wp_error( $res ) ) {
			cfpull_log( 'Could not reach CreatorsForge: ' . $res->get_error_message() );
			break;
		}
		$code = wp_remote_retrieve_response_code( $res );
		if ( 204 === $code ) {
			break; // nothing waiting
		}
		if ( 200 !== $code ) {
			cfpull_log( 'CreatorsForge answered with HTTP ' . (int) $code . ' (check the Site ID and secret).' );
			break;
		}
		$data = json_decode( wp_remote_retrieve_body( $res ), true );
		if ( ! is_array( $data ) || empty( $data['item']['id'] ) || empty( $data['item']['payload'] ) ) {
			cfpull_log( 'CreatorsForge sent something unexpected.' );
			break;
		}
		$queue_id = (string) $data['item']['id'];
		try {
			list( $ok, $info ) = cfpull_create_post( $data['item']['payload'] );
		} catch ( \Throwable $e ) {
			$ok   = false;
			$info = 'Error while creating the post: ' . $e->getMessage();
		}
		if ( $ok ) {
			$extra = array( 'postId' => $info['postId'], 'url' => $info['url'], 'status' => $info['status'] );
			if ( ! empty( $info['imageError'] ) ) {
				$extra['imageError'] = (string) $info['imageError'];
			}
			cfpull_report( $queue_id, true, $extra );
			cfpull_log( 'Published: ' . $info['url'] . ( ! empty( $info['imageError'] ) ? ' (cover picture not attached yet: ' . $info['imageError'] . ' - will retry)' : '' ) );
			$done++;
		} else {
			cfpull_report( $queue_id, false, array( 'error' => (string) $info ) );
			cfpull_log( 'Could not publish: ' . $info );
			break;
		}
	}
	return $done;
}

/* ------------------------------------------------------------------ schedule */

add_filter(
	'cron_schedules',
	function ( $schedules ) {
		$schedules['cfpull_five'] = array(
			'interval' => 300,
			'display'  => 'Every five minutes (CreatorsForge Pull)',
		);
		return $schedules;
	}
);

add_action( CFPULL_CRON_HOOK, 'cfpull_cron_run' );
function cfpull_cron_run() {
	try {
		cfpull_collect( 3 );
	} catch ( \Throwable $e ) {
		cfpull_log( 'Unexpected error: ' . $e->getMessage() );
	}
}

register_activation_hook(
	__FILE__,
	function () {
		if ( ! wp_next_scheduled( CFPULL_CRON_HOOK ) ) {
			wp_schedule_event( time() + 60, 'cfpull_five', CFPULL_CRON_HOOK );
		}
	}
);
register_deactivation_hook(
	__FILE__,
	function () {
		wp_clear_scheduled_hook( CFPULL_CRON_HOOK );
	}
);
// Keep the schedule alive if it was ever cleared.
add_action(
	'init',
	function () {
		if ( ! wp_next_scheduled( CFPULL_CRON_HOOK ) ) {
			wp_schedule_event( time() + 60, 'cfpull_five', CFPULL_CRON_HOOK );
		}
	}
);

/* ------------------------------------------------------------------ settings page */

add_action(
	'admin_menu',
	function () {
		add_options_page( 'CreatorsForge Pull', 'CreatorsForge Pull', 'manage_options', 'creatorsforge-pull', 'cfpull_page' );
	}
);

function cfpull_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$notice = '';
	if ( isset( $_POST['cfpull_action'] ) && check_admin_referer( 'cfpull_settings' ) ) {
		$action = sanitize_key( wp_unslash( $_POST['cfpull_action'] ) );
		if ( 'save' === $action ) {
			$s            = cfpull_settings();
			$s['server']  = esc_url_raw( trim( wp_unslash( isset( $_POST['server'] ) ? $_POST['server'] : '' ) ) );
			$s['site_id'] = sanitize_text_field( wp_unslash( isset( $_POST['site_id'] ) ? $_POST['site_id'] : '' ) );
			$new_token    = trim( wp_unslash( isset( $_POST['token'] ) ? $_POST['token'] : '' ) );
			if ( '' !== $new_token ) {
				$s['token'] = sanitize_text_field( $new_token );
			}
			update_option( CFPULL_OPTION, $s, false );
			list( $ok, $msg ) = cfpull_ping();
			$notice           = ( $ok ? '✓ Saved. ' : 'Saved, but: ' ) . $msg;
		} elseif ( 'check' === $action ) {
			list( $ok, $msg ) = cfpull_ping();
			$notice           = ( $ok ? '✓ ' : '✗ ' ) . $msg;
		} elseif ( 'collect' === $action ) {
			$n      = cfpull_collect( 3 );
			$notice = $n > 0 ? 'Published ' . (int) $n . ' article(s).' : 'Nothing was waiting (or see the activity list below).';
		}
	}
	$s   = cfpull_settings();
	$log = get_option( CFPULL_LOG_OPTION, array() );
	?>
	<div class="wrap">
		<h1>CreatorsForge Pull Publisher</h1>
		<p>Your host's firewall blocks CreatorsForge from sending posts in, so this plugin <strong>asks CreatorsForge for each new article and publishes it here</strong>. Copy the three values from <em>CreatorsForge, SEO Autopilot, your website, Pull delivery</em>.</p>
		<?php if ( $notice ) : ?>
			<div class="notice notice-info is-dismissible"><p><?php echo esc_html( $notice ); ?></p></div>
		<?php endif; ?>
		<form method="post">
			<?php wp_nonce_field( 'cfpull_settings' ); ?>
			<table class="form-table" role="presentation">
				<tr><th scope="row"><label for="server">CreatorsForge address</label></th>
					<td><input name="server" id="server" type="url" class="regular-text" value="<?php echo esc_attr( $s['server'] ); ?>"></td></tr>
				<tr><th scope="row"><label for="site_id">Site ID</label></th>
					<td><input name="site_id" id="site_id" type="text" class="regular-text" value="<?php echo esc_attr( $s['site_id'] ); ?>" autocomplete="off"></td></tr>
				<tr><th scope="row"><label for="token">Secret</label></th>
					<td><input name="token" id="token" type="password" class="regular-text" value="" autocomplete="off" placeholder="<?php echo $s['token'] ? esc_attr( '•••••••• saved (leave empty to keep it)' ) : 'cfp_…'; ?>">
					<p class="description">Shown once in CreatorsForge when you switch pull delivery on.</p></td></tr>
			</table>
			<p>
				<button class="button button-primary" name="cfpull_action" value="save">Save and check connection</button>
				<button class="button" name="cfpull_action" value="check">Check connection</button>
				<button class="button" name="cfpull_action" value="collect">Collect waiting articles now</button>
			</p>
		</form>
		<h2>Recent activity</h2>
		<?php if ( empty( $log ) ) : ?>
			<p>Nothing yet. This plugin looks for new articles every five minutes.</p>
		<?php else : ?>
			<ul style="list-style:disc;margin-left:1.5em">
				<?php foreach ( $log as $row ) : ?>
					<li><?php echo esc_html( wp_date( 'j M Y H:i', (int) $row['t'] ) . ' — ' . $row['m'] ); ?></li>
				<?php endforeach; ?>
			</ul>
		<?php endif; ?>
	</div>
	<?php
}
