<?php
// If uninstall not called from WordPress, exit
if (!defined('WP_UNINSTALL_PLUGIN')) {
    exit;
}

// Remove all plugin options
delete_option('miabot_enabled');
delete_option('miabot_server_url');
delete_option('miabot_chatbot_id');
delete_option('miabot_title');
delete_option('miabot_welcome');
delete_option('miabot_color');
delete_option('miabot_position');
delete_option('miabot_exclude_pages');
