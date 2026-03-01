<?php
/**
 * Plugin Name: MIABOT - Chatbot IA
 * Plugin URI: https://miabot.es
 * Description: Integra tu chatbot de inteligencia artificial MIABOT en WordPress con un solo clic. Atiende a tus clientes 24/7 con IA.
 * Version: 1.0.0
 * Author: MIABOT
 * Author URI: https://miabot.es
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: miabot-chatbot
 * Domain Path: /languages
 * Requires at least: 5.0
 * Requires PHP: 7.2
 */

if (!defined('ABSPATH')) {
    exit; // Exit if accessed directly
}

define('MIABOT_VERSION', '1.0.0');
define('MIABOT_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('MIABOT_PLUGIN_URL', plugin_dir_url(__FILE__));

/**
 * Main MIABOT Plugin Class
 */
class MIABOT_Chatbot {

    private static $instance = null;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('wp_footer', array($this, 'inject_widget'));
        add_action('admin_enqueue_scripts', array($this, 'admin_styles'));
        add_shortcode('miabot', array($this, 'shortcode_handler'));
        
        // Add settings link in plugins page
        add_filter('plugin_action_links_' . plugin_basename(__FILE__), array($this, 'add_settings_link'));
    }

    /**
     * Add settings link to plugins list
     */
    public function add_settings_link($links) {
        $settings_link = '<a href="options-general.php?page=miabot-chatbot">' . __('Configuración', 'miabot-chatbot') . '</a>';
        array_unshift($links, $settings_link);
        return $links;
    }

    /**
     * Register admin menu
     */
    public function add_admin_menu() {
        add_options_page(
            'MIABOT Chatbot',
            'MIABOT Chatbot',
            'manage_options',
            'miabot-chatbot',
            array($this, 'render_settings_page')
        );
    }

    /**
     * Register plugin settings
     */
    public function register_settings() {
        register_setting('miabot_settings', 'miabot_enabled', array(
            'type' => 'boolean',
            'default' => false,
            'sanitize_callback' => 'rest_sanitize_boolean',
        ));
        register_setting('miabot_settings', 'miabot_server_url', array(
            'type' => 'string',
            'default' => '',
            'sanitize_callback' => 'esc_url_raw',
        ));
        register_setting('miabot_settings', 'miabot_chatbot_id', array(
            'type' => 'string',
            'default' => '',
            'sanitize_callback' => 'sanitize_text_field',
        ));
        register_setting('miabot_settings', 'miabot_title', array(
            'type' => 'string',
            'default' => 'Mi Asistente',
            'sanitize_callback' => 'sanitize_text_field',
        ));
        register_setting('miabot_settings', 'miabot_welcome', array(
            'type' => 'string',
            'default' => '¡Hola! ¿En qué puedo ayudarte?',
            'sanitize_callback' => 'sanitize_text_field',
        ));
        register_setting('miabot_settings', 'miabot_color', array(
            'type' => 'string',
            'default' => '#f59e0b',
            'sanitize_callback' => 'sanitize_hex_color',
        ));
        register_setting('miabot_settings', 'miabot_position', array(
            'type' => 'string',
            'default' => 'bottom-right',
            'sanitize_callback' => array($this, 'sanitize_position'),
        ));
        register_setting('miabot_settings', 'miabot_exclude_pages', array(
            'type' => 'string',
            'default' => '',
            'sanitize_callback' => 'sanitize_textarea_field',
        ));
    }

    /**
     * Sanitize position value
     */
    public function sanitize_position($value) {
        $allowed = array('bottom-right', 'bottom-left');
        return in_array($value, $allowed) ? $value : 'bottom-right';
    }

    /**
     * Enqueue admin styles
     */
    public function admin_styles($hook) {
        if ('settings_page_miabot-chatbot' !== $hook) {
            return;
        }
        wp_enqueue_style('wp-color-picker');
        wp_enqueue_script('wp-color-picker');
        wp_enqueue_style(
            'miabot-admin',
            MIABOT_PLUGIN_URL . 'admin/css/admin-style.css',
            array(),
            MIABOT_VERSION
        );
        wp_enqueue_script(
            'miabot-admin-js',
            MIABOT_PLUGIN_URL . 'admin/js/admin.js',
            array('wp-color-picker'),
            MIABOT_VERSION,
            true
        );
    }

    /**
     * Render the settings page
     */
    public function render_settings_page() {
        if (!current_user_can('manage_options')) {
            return;
        }
        include MIABOT_PLUGIN_DIR . 'admin/views/settings-page.php';
    }

    /**
     * Inject the chatbot widget in the footer
     */
    public function inject_widget() {
        // Check if enabled
        if (!get_option('miabot_enabled', false)) {
            return;
        }

        $chatbot_id = get_option('miabot_chatbot_id', '');
        $server_url = get_option('miabot_server_url', '');

        if (empty($chatbot_id) || empty($server_url)) {
            return;
        }

        // Check excluded pages
        $excluded = get_option('miabot_exclude_pages', '');
        if (!empty($excluded)) {
            $excluded_ids = array_map('trim', explode(',', $excluded));
            if (is_page($excluded_ids) || is_single($excluded_ids)) {
                return;
            }
        }

        // Clean the server URL
        $server_url = rtrim($server_url, '/');
        $api_url = $server_url . '/api';
        $widget_url = $server_url . '/chat-widget.js';

        $title = esc_attr(get_option('miabot_title', 'Mi Asistente'));
        $welcome = esc_attr(get_option('miabot_welcome', '¡Hola! ¿En qué puedo ayudarte?'));
        $color = esc_attr(get_option('miabot_color', '#f59e0b'));
        $position = esc_attr(get_option('miabot_position', 'bottom-right'));

        printf(
            '<!-- MIABOT Chatbot Widget -->
<script 
  src="%s"
  data-api-url="%s"
  data-api-key="%s"
  data-title="%s"
  data-primary-color="%s"
  data-position="%s"
  data-welcome="%s"
  defer>
</script>
<!-- /MIABOT Chatbot Widget -->',
            esc_url($widget_url),
            esc_url($api_url),
            esc_attr($chatbot_id),
            $title,
            $color,
            $position,
            $welcome
        );
    }

    /**
     * Shortcode handler [miabot] or [miabot id="xxx"]
     */
    public function shortcode_handler($atts) {
        $atts = shortcode_atts(array(
            'id' => get_option('miabot_chatbot_id', ''),
            'title' => get_option('miabot_title', 'Mi Asistente'),
            'color' => get_option('miabot_color', '#f59e0b'),
            'welcome' => get_option('miabot_welcome', '¡Hola! ¿En qué puedo ayudarte?'),
        ), $atts, 'miabot');

        $server_url = rtrim(get_option('miabot_server_url', ''), '/');
        if (empty($atts['id']) || empty($server_url)) {
            return '<!-- MIABOT: Configura el plugin en Ajustes → MIABOT Chatbot -->';
        }

        return sprintf(
            '<div class="miabot-inline-widget" data-chatbot-id="%s" data-server="%s" data-title="%s" data-color="%s" data-welcome="%s"></div>
<script src="%s/chat-widget.js" data-api-url="%s/api" data-api-key="%s" data-title="%s" data-primary-color="%s" data-welcome="%s" defer></script>',
            esc_attr($atts['id']),
            esc_url($server_url),
            esc_attr($atts['title']),
            esc_attr($atts['color']),
            esc_attr($atts['welcome']),
            esc_url($server_url),
            esc_url($server_url),
            esc_attr($atts['id']),
            esc_attr($atts['title']),
            esc_attr($atts['color']),
            esc_attr($atts['welcome'])
        );
    }
}

// Initialize the plugin
MIABOT_Chatbot::get_instance();
