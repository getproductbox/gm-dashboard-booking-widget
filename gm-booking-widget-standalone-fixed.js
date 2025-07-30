// GM Booking Widget - Standalone Version (Fixed)
(function() {
  'use strict';

  // Widget configuration
  window.GMBookingWidgetConfig = window.GMBookingWidgetConfig || {
    apiEndpoint: 'https://plksvatjdylpuhjitbfc.supabase.co/functions/v1/public-booking-api-v2',
    apiKey: 'demo-api-key-2024',
    theme: 'light',
    primaryColor: '#007bff',
    showSpecialRequests: true,
    debug: false
  };

  // Time slots for booking
  const timeSlots = [
    "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
    "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
    "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
    "18:00", "18:30", "19:00", "19:30", "20:00", "20:30",
    "21:00", "21:30", "22:00", "22:30", "23:00",
  ];

  // Venue options
  const venueOptions = [
    { value: "manor", label: "Manor" },
    { value: "hippie", label: "Hippie" },
  ];

  const venueAreaOptions = [
    { value: "upstairs", label: "Upstairs" },
    { value: "downstairs", label: "Downstairs" },
    { value: "full_venue", label: "Full Venue" },
  ];

  // Format date for display
  function formatDate(date) {
    return date.toLocaleDateString('en-GB', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Format date for API
  function formatDateToISO(date) {
    return date.toISOString().split('T')[0];
  }

  // Create widget HTML
  function createWidgetHTML(config) {
    const themeClass = config.theme === 'dark' ? 'dark' : '';
    const availableVenues = config.venue === 'both' 
      ? venueOptions 
      : venueOptions.filter(v => v.value === config.venue);

    return `
      <div class="gm-booking-widget ${themeClass}">
        <div class="widget-card">
          <div class="widget-header">
            <h3 class="widget-title">Book Your Venue</h3>
          </div>
          
          <form id="gm-booking-form" class="widget-form">
            <!-- Customer Information -->
            <div class="form-group">
              <label class="form-label">Customer Name *</label>
              <input type="text" name="customerName" class="form-input" placeholder="Enter your name" required>
            </div>
            
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" name="customerEmail" class="form-input" placeholder="your@email.com">
            </div>
            
            <div class="form-group">
              <label class="form-label">Phone</label>
              <input type="tel" name="customerPhone" class="form-input" placeholder="+44 123 456 7890">
            </div>
            
            <!-- Venue Selection -->
            <div class="form-group">
              <label class="form-label">Venue *</label>
              <select name="venue" class="form-select" required>
                <option value="">Select venue</option>
                ${availableVenues.map(venue => 
                  `<option value="${venue.value}">${venue.label}</option>`
                ).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">Venue Area *</label>
              <select name="venueArea" class="form-select" required>
                <option value="">Select area</option>
                ${venueAreaOptions.map(area => 
                  `<option value="${area.value}">${area.label}</option>`
                ).join('')}
              </select>
            </div>
            
            <!-- Date and Time -->
            <div class="form-group">
              <label class="form-label">Booking Date *</label>
              <input type="date" name="bookingDate" class="form-input" required>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Start Time</label>
                <select name="startTime" class="form-select">
                  <option value="">Select time</option>
                  ${timeSlots.map(time => 
                    `<option value="${time}">${time}</option>`
                  ).join('')}
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">End Time</label>
                <select name="endTime" class="form-select">
                  <option value="">Select time</option>
                  ${timeSlots.map(time => 
                    `<option value="${time}">${time}</option>`
                  ).join('')}
                </select>
              </div>
            </div>
            
            <!-- Guest Count -->
            <div class="form-group">
              <label class="form-label">Number of Guests *</label>
              <input type="number" name="guestCount" class="form-input" min="1" max="500" placeholder="e.g. 8" required>
            </div>
            
            <!-- Special Requests -->
            ${config.showSpecialRequests ? `
              <div class="form-group">
                <label class="form-label">Special Requests</label>
                <textarea name="specialRequests" class="form-textarea" placeholder="Any special requirements..." rows="3"></textarea>
              </div>
            ` : ''}
            
            <!-- Submit Button -->
            <button type="submit" class="submit-button">
              <span class="button-text">Create Booking</span>
              <span class="loading-spinner" style="display: none;">⏳</span>
            </button>
          </form>
          
          <!-- Status Messages -->
          <div id="widget-status" class="status-container"></div>
        </div>
      </div>
    `;
  }

  // Validate form data
  function validateForm(formData) {
    const errors = {};

    if (!formData.customerName || formData.customerName.trim().length === 0) {
      errors.customerName = 'Customer name is required';
    }

    if (!formData.venue) {
      errors.venue = 'Please select a venue';
    }

    if (!formData.venueArea) {
      errors.venueArea = 'Please select a venue area';
    }

    if (!formData.bookingDate) {
      errors.bookingDate = 'Please select a booking date';
    } else {
      const bookingDate = new Date(formData.bookingDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      if (bookingDate < today) {
        errors.bookingDate = 'Booking date cannot be in the past';
      }
    }

    if (!formData.guestCount || formData.guestCount < 1) {
      errors.guestCount = 'Guest count must be at least 1';
    }

    if (!formData.customerEmail && !formData.customerPhone) {
      errors.customerEmail = 'Either email or phone number is required';
    }

    if (formData.customerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerEmail)) {
      errors.customerEmail = 'Please provide a valid email address';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Show status message
  function showStatus(container, message, type) {
    const statusDiv = container.querySelector('#widget-status');
    statusDiv.innerHTML = `<div class="status-message status-${type}">${message}</div>`;
  }

  // Handle form submission
  async function handleSubmit(event, container, config) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    const bookingData = {
      customerName: formData.get('customerName'),
      customerEmail: formData.get('customerEmail') || undefined,
      customerPhone: formData.get('customerPhone') || undefined,
      venue: formData.get('venue'),
      venueArea: formData.get('venueArea'),
      bookingDate: formData.get('bookingDate'),
      startTime: formData.get('startTime') || undefined,
      endTime: formData.get('endTime') || undefined,
      guestCount: parseInt(formData.get('guestCount')),
      specialRequests: formData.get('specialRequests') || undefined,
    };

    // Remove undefined values
    Object.keys(bookingData).forEach(key => {
      if (bookingData[key] === undefined) {
        delete bookingData[key];
      }
    });

    // Validate form
    const validation = validateForm(bookingData);
    if (!validation.isValid) {
      const errorMessage = Object.values(validation.errors).join(', ');
      showStatus(container, `❌ ${errorMessage}`, 'error');
      return;
    }

    // Show loading state
    const submitButton = form.querySelector('.submit-button');
    const buttonText = submitButton.querySelector('.button-text');
    const loadingSpinner = submitButton.querySelector('.loading-spinner');
    
    buttonText.style.display = 'none';
    loadingSpinner.style.display = 'inline-block';
    submitButton.disabled = true;

    try {
      const response = await fetch(config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': config.apiKey
        },
        body: JSON.stringify(bookingData)
      });

      const result = await response.json();

      if (result.success) {
        showStatus(container, `✅ ${result.message}<br><strong>Booking ID:</strong> ${result.bookingId}`, 'success');
        
        // Reset form after successful submission
        setTimeout(() => {
          form.reset();
          showStatus(container, '', '');
          
          // Set default date to tomorrow
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          form.querySelector('input[name="bookingDate"]').value = formatDateToISO(tomorrow);
        }, 3000);
      } else {
        showStatus(container, `❌ ${result.message}`, 'error');
      }
    } catch (error) {
      showStatus(container, `❌ Failed to create booking: ${error.message}`, 'error');
    } finally {
      // Reset button state
      buttonText.style.display = 'inline';
      loadingSpinner.style.display = 'none';
      submitButton.disabled = false;
    }
  }

  // Initialize widget
  function initWidget(container, config) {
    // Create widget HTML
    container.innerHTML = createWidgetHTML(config);
    
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    container.querySelector('input[name="bookingDate"]').value = formatDateToISO(tomorrow);
    
    // Set default venue area if specified
    if (config.defaultVenueArea) {
      container.querySelector('select[name="venueArea"]').value = config.defaultVenueArea;
    }
    
    // Add form submit handler
    const form = container.querySelector('#gm-booking-form');
    form.addEventListener('submit', (event) => handleSubmit(event, container, config));
  }

  // Global widget function
  window.GMBookingWidget = function(container, config = {}) {
    // Merge with default config
    const finalConfig = {
      venue: 'both',
      defaultVenueArea: 'upstairs',
      theme: 'light',
      primaryColor: '#007bff',
      showSpecialRequests: true,
      apiEndpoint: window.GMBookingWidgetConfig.apiEndpoint,
      apiKey: window.GMBookingWidgetConfig.apiKey,
      ...config
    };

    // Initialize the widget
    initWidget(container, finalConfig);
  };

  // Auto-initialize widgets when DOM is ready
  function autoInitWidgets() {
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
      
      // Initialize widget
      window.GMBookingWidget(container, config);
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitWidgets);
  } else {
    autoInitWidgets();
  }

  // Also initialize on dynamic content changes - FIXED VERSION
  if (window.MutationObserver && document.body) {
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          const containers = mutation.target.querySelectorAll('[data-gm-widget="booking"]');
          if (containers.length > 0) {
            autoInitWidgets();
          }
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  } else if (window.MutationObserver) {
    // If MutationObserver is available but document.body isn't ready yet
    document.addEventListener('DOMContentLoaded', function() {
      if (document.body) {
        const observer = new MutationObserver(function(mutations) {
          mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
              const containers = mutation.target.querySelectorAll('[data-gm-widget="booking"]');
              if (containers.length > 0) {
                autoInitWidgets();
              }
            }
          });
        });
        
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      }
    });
  }
})(); 