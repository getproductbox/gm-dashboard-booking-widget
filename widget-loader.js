
// GM Booking Widget Loader
(function() {
  'use strict';
  
  // Widget configuration
  window.GMBookingWidgetConfig = window.GMBookingWidgetConfig || {
    apiEndpoint: 'https://plksvatjdylpuhjitbfc.supabase.co/functions/v1/public-booking-api-v2',
    	apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsa3N2YXRqZHlscHVoaml0YmZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc2NDkzMywiZXhwIjoyMDY2MzQwOTMzfQ.M4Ikh3gSAVTPDxkMNrXLFxCPjHYqaBC5HcVavpHpNlk',
    theme: 'light',
    primaryColor: '#007bff',
    showSpecialRequests: true
  };
  
  // Initialize widget when DOM is ready
  function initWidget() {
    const containers = document.querySelectorAll('[data-gm-widget="booking"]');
    
    containers.forEach(container => {
      // Get configuration from data attributes
      const config = {
        venue: container.dataset.venue || 'both',
        defaultVenueArea: container.dataset.venueArea || 'upstairs',
        theme: container.dataset.theme || 'light',
        primaryColor: container.dataset.primaryColor || '#007bff',
        showSpecialRequests: container.dataset.showSpecialRequests !== 'false',
        apiEndpoint: container.dataset.apiEndpoint || window.GMBookingWidgetConfig.apiEndpoint,
        apiKey: container.dataset.apiKey || window.GMBookingWidgetConfig.apiKey
      };
      
      // Call the widget function
      if (window.GMBookingWidget) {
        window.GMBookingWidget(container, config);
      }
    });
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
  
  // Also initialize on dynamic content changes
  if (window.MutationObserver) {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          const containers = mutation.target.querySelectorAll('[data-gm-widget="booking"]');
          if (containers.length > 0) {
            initWidget();
          }
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
})();
