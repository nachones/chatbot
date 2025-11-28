// Integrations Page JavaScript
(function () {
    'use strict';

    document.addEventListener('DOMContentLoaded', function () {
        initIntegrationTabs();
        initExampleTabs();
    });

    // Integration Tabs (Widget / API / Platforms)
    function initIntegrationTabs() {
        const tabs = document.querySelectorAll('.integration-tab');
        const contents = document.querySelectorAll('.integration-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetTab = tab.getAttribute('data-tab');

                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                contents.forEach(c => c.classList.remove('active'));

                // Add active class to clicked tab and corresponding content
                tab.classList.add('active');
                const targetContent = document.querySelector(`[data-content="${targetTab}"]`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }

    // API Example Tabs (JavaScript / Python / cURL)
    function initExampleTabs() {
        const exampleTabs = document.querySelectorAll('.example-tab');
        const exampleContents = document.querySelectorAll('.example-content');

        exampleTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const targetLang = tab.getAttribute('data-lang');

                // Remove active class from all tabs and contents
                exampleTabs.forEach(t => t.classList.remove('active'));
                exampleContents.forEach(c => c.classList.remove('active'));

                // Add active class to clicked tab and corresponding content
                tab.classList.add('active');
                const targetContent = document.querySelector(`[data-lang-content="${targetLang}"]`);
                if (targetContent) {
                    targetContent.classList.add('active');
                }
            });
        });
    }

})();
