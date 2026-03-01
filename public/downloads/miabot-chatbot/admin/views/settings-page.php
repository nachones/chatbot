<?php
if (!defined('ABSPATH')) exit;

$enabled = get_option('miabot_enabled', false);
$server_url = get_option('miabot_server_url', '');
$chatbot_id = get_option('miabot_chatbot_id', '');
$title = get_option('miabot_title', 'Mi Asistente');
$welcome = get_option('miabot_welcome', '¡Hola! ¿En qué puedo ayudarte?');
$color = get_option('miabot_color', '#f59e0b');
$position = get_option('miabot_position', 'bottom-right');
$exclude = get_option('miabot_exclude_pages', '');
?>
<div class="wrap miabot-settings-wrap">
    <div class="miabot-header">
        <div class="miabot-logo">
            <span class="miabot-logo-icon">🤖</span>
            <h1>MIABOT Chatbot</h1>
        </div>
        <p class="miabot-version">v<?php echo MIABOT_VERSION; ?></p>
    </div>

    <?php settings_errors(); ?>

    <form method="post" action="options.php" class="miabot-form">
        <?php settings_fields('miabot_settings'); ?>

        <!-- Status Card -->
        <div class="miabot-card miabot-status-card <?php echo $enabled ? 'active' : 'inactive'; ?>">
            <div class="miabot-status-dot"></div>
            <div class="miabot-status-text">
                <strong><?php echo $enabled ? 'Chatbot Activo' : 'Chatbot Desactivado'; ?></strong>
                <span><?php echo $enabled ? 'Tu chatbot está visible en tu web' : 'Activa el chatbot para mostrarlo en tu web'; ?></span>
            </div>
            <label class="miabot-toggle">
                <input type="checkbox" name="miabot_enabled" value="1" <?php checked($enabled, true); ?>>
                <span class="miabot-toggle-slider"></span>
            </label>
        </div>

        <!-- Connection Settings -->
        <div class="miabot-card">
            <h2><span class="dashicons dashicons-admin-links"></span> Conexión</h2>
            <p class="miabot-card-desc">Conecta tu WordPress con tu cuenta MIABOT. Encontrarás estos datos en el panel de MIABOT → Integraciones.</p>
            
            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="miabot_server_url">URL del Servidor MIABOT</label>
                    </th>
                    <td>
                        <input type="url" id="miabot_server_url" name="miabot_server_url" 
                               value="<?php echo esc_attr($server_url); ?>" 
                               class="regular-text" 
                               placeholder="https://tu-dominio.com">
                        <p class="description">La URL donde tienes instalado MIABOT (sin /api al final)</p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="miabot_chatbot_id">ID del Chatbot</label>
                    </th>
                    <td>
                        <input type="text" id="miabot_chatbot_id" name="miabot_chatbot_id" 
                               value="<?php echo esc_attr($chatbot_id); ?>" 
                               class="regular-text"
                               placeholder="abc123-def456-...">
                        <p class="description">Copia el ID de tu chatbot desde el panel de MIABOT</p>
                    </td>
                </tr>
            </table>
        </div>

        <!-- Appearance Settings -->
        <div class="miabot-card">
            <h2><span class="dashicons dashicons-art"></span> Apariencia</h2>
            <p class="miabot-card-desc">Personaliza cómo se ve tu chatbot en tu web WordPress.</p>
            
            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="miabot_title">Título del Chatbot</label>
                    </th>
                    <td>
                        <input type="text" id="miabot_title" name="miabot_title" 
                               value="<?php echo esc_attr($title); ?>" 
                               class="regular-text"
                               placeholder="Mi Asistente">
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="miabot_welcome">Mensaje de Bienvenida</label>
                    </th>
                    <td>
                        <input type="text" id="miabot_welcome" name="miabot_welcome" 
                               value="<?php echo esc_attr($welcome); ?>" 
                               class="large-text"
                               placeholder="¡Hola! ¿En qué puedo ayudarte?">
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="miabot_color">Color Principal</label>
                    </th>
                    <td>
                        <input type="text" id="miabot_color" name="miabot_color" 
                               value="<?php echo esc_attr($color); ?>" 
                               class="miabot-color-picker">
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label for="miabot_position">Posición</label>
                    </th>
                    <td>
                        <select id="miabot_position" name="miabot_position">
                            <option value="bottom-right" <?php selected($position, 'bottom-right'); ?>>Abajo Derecha ↘</option>
                            <option value="bottom-left" <?php selected($position, 'bottom-left'); ?>>Abajo Izquierda ↙</option>
                        </select>
                    </td>
                </tr>
            </table>
        </div>

        <!-- Advanced Settings -->
        <div class="miabot-card">
            <h2><span class="dashicons dashicons-admin-tools"></span> Avanzado</h2>
            
            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="miabot_exclude_pages">Excluir Páginas</label>
                    </th>
                    <td>
                        <input type="text" id="miabot_exclude_pages" name="miabot_exclude_pages" 
                               value="<?php echo esc_attr($exclude); ?>" 
                               class="large-text"
                               placeholder="Ej: 123, 456, 789">
                        <p class="description">IDs de páginas/entradas separados por comas donde NO mostrar el chatbot</p>
                    </td>
                </tr>
            </table>
        </div>

        <!-- Shortcode Info -->
        <div class="miabot-card miabot-info-card">
            <h2><span class="dashicons dashicons-shortcode"></span> Shortcode</h2>
            <p>También puedes insertar el chatbot en páginas específicas usando el shortcode:</p>
            <code class="miabot-shortcode">[miabot]</code>
            <p>O con un chatbot específico:</p>
            <code class="miabot-shortcode">[miabot id="TU_CHATBOT_ID" title="Soporte" color="#f59e0b"]</code>
        </div>

        <?php submit_button('Guardar Configuración', 'primary miabot-save-btn', 'submit', true); ?>
    </form>
</div>
