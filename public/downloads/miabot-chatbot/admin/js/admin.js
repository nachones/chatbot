/* MIABOT Admin JS */
(function($) {
    'use strict';

    $(document).ready(function() {
        // Initialize color picker
        $('.miabot-color-picker').wpColorPicker();

        // Toggle status card class when checkbox changes
        var $toggle = $('.miabot-toggle input');
        var $card = $('.miabot-status-card');
        
        $toggle.on('change', function() {
            if (this.checked) {
                $card.removeClass('inactive').addClass('active');
                $card.find('.miabot-status-text strong').text('Chatbot Activo');
                $card.find('.miabot-status-text span').text('Tu chatbot está visible en tu web');
            } else {
                $card.removeClass('active').addClass('inactive');
                $card.find('.miabot-status-text strong').text('Chatbot Desactivado');
                $card.find('.miabot-status-text span').text('Activa el chatbot para mostrarlo en tu web');
            }
        });
    });
})(jQuery);
