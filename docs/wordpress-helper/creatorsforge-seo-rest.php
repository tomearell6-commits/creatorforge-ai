<?php
/**
 * Plugin Name: CreatorsForge SEO REST
 * Description: Lets CreatorsForge's WordPress SEO Fixer write Rank Math / Yoast SEO meta (title & description) via the WordPress REST API. Writes require an authenticated editor — this only exposes the SEO title/description fields, nothing else.
 * Version: 1.1.0
 * Author: CreatorsForge.io
 *
 * INSTALL: upload this file to the ACTIVE  wp-content/mu-plugins/  folder (create
 * the "mu-plugins" folder if it doesn't exist). Must-use plugins activate
 * automatically — there's no "activate" button.
 *
 * NOTE: if WordPress lives in a sub-directory (e.g. /wp/), the active content
 * folder is the one your site's images load from — e.g. /wp/wp-content/ — NOT a
 * leftover wp-content/ at the web root.
 */

if (!defined('ABSPATH')) { exit; }

/**
 * Register the SEO meta keys for REST read/write. Runs LATE (priority 99) so we
 * win over any SEO plugin that registers the same keys without REST access.
 */
add_action('init', function () {
    $keys = array(
        'rank_math_title',
        'rank_math_description',
        '_yoast_wpseo_title',
        '_yoast_wpseo_metadesc',
    );
    $types = array('post', 'page');

    foreach ($types as $type) {
        foreach ($keys as $key) {
            register_post_meta($type, $key, array(
                'show_in_rest'      => true,
                'single'            => true,
                'type'              => 'string',
                'sanitize_callback' => 'sanitize_text_field',
                // Only logged-in users who can edit posts may read/write via REST.
                'auth_callback'     => function () {
                    return current_user_can('edit_posts');
                },
            ));
        }
    }
}, 99);

/**
 * Public self-test route so CreatorsForge can confirm the helper is installed in
 * the ACTIVE mu-plugins folder and that the SEO keys are REST-registered.
 * Returns no site data — only a yes/no per key. Safe to leave in place.
 */
add_action('rest_api_init', function () {
    register_rest_route('creatorsforge/v1', '/status', array(
        'methods'             => 'GET',
        'permission_callback' => '__return_true',
        'callback'            => function () {
            $keys = array('rank_math_title', 'rank_math_description', '_yoast_wpseo_title', '_yoast_wpseo_metadesc');
            $reg  = get_registered_meta_keys('post', 'post');
            $out  = array();
            foreach ($keys as $k) {
                $out[$k] = isset($reg[$k]) && !empty($reg[$k]['show_in_rest']);
            }
            return array(
                'plugin'     => 'creatorsforge-seo-rest',
                'version'    => '1.1.0',
                'registered' => $out,
            );
        },
    ));
});
