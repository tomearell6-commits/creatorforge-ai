<?php
/**
 * Plugin Name: CreatorsForge SEO REST
 * Description: Lets CreatorsForge's WordPress SEO Fixer write Rank Math / Yoast SEO meta (title & description) via the WordPress REST API. Writes require an authenticated editor — this only exposes the SEO title/description fields, nothing else.
 * Version: 1.0.0
 * Author: CreatorsForge.io
 *
 * INSTALL: upload this file to  wp-content/mu-plugins/  (create the "mu-plugins"
 * folder if it doesn't exist). Must-use plugins activate automatically — there's
 * no "activate" button. That's it.
 */

if (!defined('ABSPATH')) { exit; }

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
});
