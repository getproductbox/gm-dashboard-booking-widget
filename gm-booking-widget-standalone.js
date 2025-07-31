// GM Booking Widget - Standalone Version
(function() {
  'use strict';

  // Widget configuration
  window.GMBookingWidgetConfig = window.GMBookingWidgetConfig || {
    apiEndpoint: 'https://plksvatjdylpuhjitbfc.supabase.co/functions/v1',
    apiKey: 'demo-api-key-2024',
    theme: 'light',
    primaryColor: '#007bff',
    showSpecialRequests: true,
    debug: false
  };

  // Dynamic data storage
  let venueConfig = null;
  let availableTimeSlots = [];
  let pricingData = null;
  let karaokeBooths = [];

  // Cache for API responses
  const dataCache = {
    venueConfig: null,
    timeSlots: {},
    pricing: {},
    karaokeBooths: {},
    lastUpdated: null
  };

  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

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

  // API Integration Functions
  async function fetchVenueConfig(venueFilter = null) {
    try {
      const config = window.GMBookingWidgetConfig;
      let url = `${config.apiEndpoint}/venue-config-api`;
      if (venueFilter) {
        url += `?venue=${venueFilter}`;
      }

      const response = await fetch(url, {
        headers: {
          'x-api-key': config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        venueConfig = data.venues;
        dataCache.venueConfig = data.venues;
        dataCache.lastUpdated = Date.now();
        return data.venues;
      } else {
        throw new Error(data.message || 'Failed to load venue configuration');
      }
    } catch (error) {
      console.error('Failed to fetch venue config:', error);
      // Return fallback data
      return [
        { id: "manor", name: "Manor", areas: [
          { id: "upstairs", name: "Upstairs", capacity: 50 },
          { id: "downstairs", name: "Downstairs", capacity: 30 },
          { id: "full_venue", name: "Full Venue", capacity: 80 }
        ]},
        { id: "hippie", name: "Hippie", areas: [
          { id: "upstairs", name: "Upstairs", capacity: 40 },
          { id: "downstairs", name: "Downstairs", capacity: 25 },
          { id: "full_venue", name: "Full Venue", capacity: 65 }
        ]}
      ];
    }
  }

  async function fetchTimeSlots(date, venue, venueArea) {
    try {
      const config = window.GMBookingWidgetConfig;
      const url = `${config.apiEndpoint}/timeslots-api?date=${date}&venue=${venue}&venue_area=${venueArea}`;

      const response = await fetch(url, {
        headers: {
          'x-api-key': config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        availableTimeSlots = data.available_slots.filter(slot => slot.available);
        const cacheKey = `${date}-${venue}-${venueArea}`;
        dataCache.timeSlots[cacheKey] = availableTimeSlots;
        return availableTimeSlots;
      } else {
        throw new Error(data.message || 'Failed to load time slots');
      }
    } catch (error) {
      console.error('Failed to fetch time slots:', error);
      // Return fallback time slots
      return [
        { start: "09:00", end: "09:30", available: true },
        { start: "09:30", end: "10:00", available: true },
        { start: "10:00", end: "10:30", available: true },
        { start: "10:30", end: "11:00", available: true },
        { start: "11:00", end: "11:30", available: true },
        { start: "11:30", end: "12:00", available: true },
        { start: "12:00", end: "12:30", available: true },
        { start: "12:30", end: "13:00", available: true },
        { start: "13:00", end: "13:30", available: true },
        { start: "13:30", end: "14:00", available: true },
        { start: "14:00", end: "14:30", available: true },
        { start: "14:30", end: "15:00", available: true },
        { start: "15:00", end: "15:30", available: true },
        { start: "15:30", end: "16:00", available: true },
        { start: "16:00", end: "16:30", available: true },
        { start: "16:30", end: "17:00", available: true },
        { start: "17:00", end: "17:30", available: true },
        { start: "17:30", end: "18:00", available: true },
        { start: "18:00", end: "18:30", available: true },
        { start: "18:30", end: "19:00", available: true },
        { start: "19:00", end: "19:30", available: true },
        { start: "19:30", end: "20:00", available: true },
        { start: "20:00", end: "20:30", available: true },
        { start: "20:30", end: "21:00", available: true },
        { start: "21:00", end: "21:30", available: true },
        { start: "21:30", end: "22:00", available: true },
        { start: "22:00", end: "22:30", available: true },
        { start: "22:30", end: "23:00", available: true }
      ];
    }
  }

  async function fetchPricing(venue, venueArea, date, guests, duration = 4) {
    try {
      const config = window.GMBookingWidgetConfig;
      const url = `${config.apiEndpoint}/pricing-api?venue=${venue}&venue_area=${venueArea}&date=${date}&guests=${guests}&duration=${duration}`;

      const response = await fetch(url, {
        headers: {
          'x-api-key': config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        pricingData = data;
        const cacheKey = `${venue}-${venueArea}-${date}-${guests}-${duration}`;
        dataCache.pricing[cacheKey] = data;
        return data;
      } else {
        throw new Error(data.message || 'Failed to calculate pricing');
      }
    } catch (error) {
      console.error('Failed to fetch pricing:', error);
      // Return fallback pricing
      return {
        success: true,
        venue: venue,
        venue_area: venueArea,
        date: date,
        guest_count: guests,
        duration_hours: duration,
        base_price: 500.00,
        per_guest_surcharge: 25.00,
        total_price: 500 + (guests * 25),
        currency: "GBP",
        includes: ["Basic setup", "Staff support", "Sound system"],
        addons: [
          {
            id: "catering",
            name: "Catering Service",
            price: 200.00,
            description: "Professional catering for your event"
          },
          {
            id: "dj",
            name: "DJ Service",
            price: 150.00,
            description: "Professional DJ for entertainment"
          }
        ]
      };
    }
  }

  async function fetchKaraokeBooths(venue, availableOnly = true) {
    try {
      const config = window.GMBookingWidgetConfig;
      let url = `${config.apiEndpoint}/karaoke-booths-api?venue=${venue}`;
      if (availableOnly) {
        url += '&available=true';
      }

      const response = await fetch(url, {
        headers: {
          'x-api-key': config.apiKey
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        karaokeBooths = data.booths;
        dataCache.karaokeBooths[venue] = data.booths;
        return data.booths;
      } else {
        throw new Error(data.message || 'Failed to load karaoke booths');
      }
    } catch (error) {
      console.error('Failed to fetch karaoke booths:', error);
      return [];
    }
  }

  function isCacheValid() {
    return dataCache.lastUpdated && 
           (Date.now() - dataCache.lastUpdated) < CACHE_DURATION;
  }

  async function initializeWidgetData() {
    try {
      if (!isCacheValid()) {
        await fetchVenueConfig();
      } else {
        venueConfig = dataCache.venueConfig;
      }
    } catch (error) {
      console.error('Failed to initialize widget data:', error);
    }
  }

  // Dynamic form population functions
  function populateVenueAreas(venueId) {
    const venueAreaSelect = document.querySelector('select[name="venueArea"]');
    if (!venueAreaSelect || !venueConfig) return;

    // Clear existing options
    venueAreaSelect.innerHTML = '<option value="">Select area</option>';

    // Find the selected venue
    const selectedVenue = venueConfig.find(v => v.id === venueId);
    if (selectedVenue && selectedVenue.areas) {
      selectedVenue.areas.forEach(area => {
        const option = document.createElement('option');
        option.value = area.id;
        option.textContent = area.name;
        venueAreaSelect.appendChild(option);
      });
    }
  }

  async function populateTimeSlots(date, venue, venueArea) {
    const startTimeSelect = document.querySelector('select[name="startTime"]');
    const endTimeSelect = document.querySelector('select[name="endTime"]');
    
    if (!startTimeSelect || !endTimeSelect) return;

    // Clear existing options
    startTimeSelect.innerHTML = '<option value="">Select time</option>';
    endTimeSelect.innerHTML = '<option value="">Select time</option>';

    try {
      const timeSlots = await fetchTimeSlots(date, venue, venueArea);
      
      timeSlots.forEach(slot => {
        // Add to start time options
        const startOption = document.createElement('option');
        startOption.value = slot.start;
        startOption.textContent = slot.start;
        startTimeSelect.appendChild(startOption);

        // Add to end time options
        const endOption = document.createElement('option');
        endOption.value = slot.end;
        endOption.textContent = slot.end;
        endTimeSelect.appendChild(endOption);
      });
    } catch (error) {
      console.error('Failed to populate time slots:', error);
    }
  }

  async function updatePricingDisplay(venue, venueArea, date, guests, duration = 4) {
    try {
      const pricing = await fetchPricing(venue, venueArea, date, guests, duration);
      
      // Create or update pricing display
      let pricingDisplay = document.getElementById('pricing-display');
      if (!pricingDisplay) {
        pricingDisplay = document.createElement('div');
        pricingDisplay.id = 'pricing-display';
        pricingDisplay.className = 'pricing-display';
        document.querySelector('.widget-form').insertBefore(
          pricingDisplay, 
          document.querySelector('.submit-button')
        );
      }

      pricingDisplay.innerHTML = `
        <div class="pricing-info">
          <h4>Pricing Information</h4>
          <div class="price-breakdown">
            <div class="price-item">
              <span>Base Price:</span>
              <span>£${pricing.base_price}</span>
            </div>
            <div class="price-item">
              <span>Guest Surcharge (${guests} guests):</span>
              <span>£${pricing.per_guest_surcharge * guests}</span>
            </div>
            <div class="price-item total">
              <span>Total:</span>
              <span>£${pricing.total_price}</span>
            </div>
          </div>
          <div class="includes">
            <h5>Includes:</h5>
            <ul>
              ${pricing.includes.map(item => `<li>${item}</li>`).join('')}
            </ul>
          </div>
        </div>
      `;
    } catch (error) {
      console.error('Failed to update pricing display:', error);
    }
  }

  // Create modal overlay HTML
  function createModalOverlay(config) {
    const themeClass = config.theme === 'dark' ? 'dark' : '';
    
    // Get available venues from dynamic data
    let availableVenues = venueConfig || [];
    if (config.venue !== 'both') {
      availableVenues = availableVenues.filter(v => v.id === config.venue);
    }

    return `
      <div class="gm-booking-modal-overlay" id="gm-booking-modal">
        <div class="gm-booking-modal-backdrop"></div>
        <div class="gm-booking-modal-container">
          <div class="gm-booking-modal-content ${themeClass}">
            <div class="modal-header">
              <h3 class="modal-title">Book Your Venue</h3>
              <button class="modal-close" onclick="closeBookingModal()">&times;</button>
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
                    `<option value="${venue.id}">${venue.name}</option>`
                  ).join('')}
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">Venue Area *</label>
                <select name="venueArea" class="form-select" required>
                  <option value="">Select area</option>
                  <!-- Venue areas will be populated dynamically based on selected venue -->
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
                    <!-- Time slots will be populated dynamically based on selected date, venue, and area -->
                  </select>
                </div>
                
                <div class="form-group">
                  <label class="form-label">End Time</label>
                  <select name="endTime" class="form-select">
                    <option value="">Select time</option>
                    <!-- Time slots will be populated dynamically based on selected date, venue, and area -->
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
      </div>
    `;
  }

  // Create widget HTML
  function createWidgetHTML(config) {
    const themeClass = config.theme === 'dark' ? 'dark' : '';
    
    // Get available venues from dynamic data
    let availableVenues = venueConfig || [];
    if (config.venue !== 'both') {
      availableVenues = availableVenues.filter(v => v.id === config.venue);
    }

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
                  `<option value="${venue.id}">${venue.name}</option>`
                ).join('')}
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">Venue Area *</label>
              <select name="venueArea" class="form-select" required>
                <option value="">Select area</option>
                <!-- Venue areas will be populated dynamically based on selected venue -->
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
                  <!-- Time slots will be populated dynamically based on selected date, venue, and area -->
                </select>
              </div>
              
              <div class="form-group">
                <label class="form-label">End Time</label>
                <select name="endTime" class="form-select">
                  <option value="">Select time</option>
                  <!-- Time slots will be populated dynamically based on selected date, venue, and area -->
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
  async function initWidget(container, config) {
    // Initialize widget data
    await initializeWidgetData();
    
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
    
    // Add dynamic form event listeners for inline widget
    const venueSelect = container.querySelector('select[name="venue"]');
    const venueAreaSelect = container.querySelector('select[name="venueArea"]');
    const dateInput = container.querySelector('input[name="bookingDate"]');
    const guestCountInput = container.querySelector('input[name="guestCount"]');
    
    // Venue change handler
    venueSelect.addEventListener('change', (e) => {
      const selectedVenue = e.target.value;
      if (selectedVenue) {
        populateVenueAreas(selectedVenue);
        // Clear time slots when venue changes
        const startTimeSelect = container.querySelector('select[name="startTime"]');
        const endTimeSelect = container.querySelector('select[name="endTime"]');
        startTimeSelect.innerHTML = '<option value="">Select time</option>';
        endTimeSelect.innerHTML = '<option value="">Select time</option>';
      }
    });
    
    // Venue area change handler
    venueAreaSelect.addEventListener('change', async (e) => {
      const selectedVenue = venueSelect.value;
      const selectedArea = e.target.value;
      const selectedDate = dateInput.value;
      
      if (selectedVenue && selectedArea && selectedDate) {
        await populateTimeSlots(selectedDate, selectedVenue, selectedArea);
      }
    });
    
    // Date change handler
    dateInput.addEventListener('change', async (e) => {
      const selectedVenue = venueSelect.value;
      const selectedArea = venueAreaSelect.value;
      const selectedDate = e.target.value;
      
      if (selectedVenue && selectedArea && selectedDate) {
        await populateTimeSlots(selectedDate, selectedVenue, selectedArea);
      }
    });
    
    // Guest count change handler for pricing
    guestCountInput.addEventListener('input', async (e) => {
      const selectedVenue = venueSelect.value;
      const selectedArea = venueAreaSelect.value;
      const selectedDate = dateInput.value;
      const guestCount = parseInt(e.target.value) || 0;
      
      if (selectedVenue && selectedArea && selectedDate && guestCount > 0) {
        await updatePricingDisplay(selectedVenue, selectedArea, selectedDate, guestCount);
      }
    });
  }

  // Initialize modal widget
  async function initModalWidget(config) {
    // Remove existing modal if present
    const existingModal = document.getElementById('gm-booking-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Initialize widget data
    await initializeWidgetData();

    // Create modal HTML
    const modalHTML = createModalOverlay(config);
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const modal = document.getElementById('gm-booking-modal');
    const modalContent = modal.querySelector('.gm-booking-modal-content');
    
    // Set default date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    modal.querySelector('input[name="bookingDate"]').value = formatDateToISO(tomorrow);
    
    // Set default venue area if specified
    if (config.defaultVenueArea) {
      modal.querySelector('select[name="venueArea"]').value = config.defaultVenueArea;
    }
    
    // Add form submit handler
    const form = modal.querySelector('#gm-booking-form');
    form.addEventListener('submit', (event) => handleSubmit(event, modal, config));
    
    // Add dynamic form event listeners
    const venueSelect = modal.querySelector('select[name="venue"]');
    const venueAreaSelect = modal.querySelector('select[name="venueArea"]');
    const dateInput = modal.querySelector('input[name="bookingDate"]');
    const guestCountInput = modal.querySelector('input[name="guestCount"]');
    
    // Venue change handler
    venueSelect.addEventListener('change', (e) => {
      const selectedVenue = e.target.value;
      if (selectedVenue) {
        populateVenueAreas(selectedVenue);
        // Clear time slots when venue changes
        const startTimeSelect = modal.querySelector('select[name="startTime"]');
        const endTimeSelect = modal.querySelector('select[name="endTime"]');
        startTimeSelect.innerHTML = '<option value="">Select time</option>';
        endTimeSelect.innerHTML = '<option value="">Select time</option>';
      }
    });
    
    // Venue area change handler
    venueAreaSelect.addEventListener('change', async (e) => {
      const selectedVenue = venueSelect.value;
      const selectedArea = e.target.value;
      const selectedDate = dateInput.value;
      
      if (selectedVenue && selectedArea && selectedDate) {
        await populateTimeSlots(selectedDate, selectedVenue, selectedArea);
      }
    });
    
    // Date change handler
    dateInput.addEventListener('change', async (e) => {
      const selectedVenue = venueSelect.value;
      const selectedArea = venueAreaSelect.value;
      const selectedDate = e.target.value;
      
      if (selectedVenue && selectedArea && selectedDate) {
        await populateTimeSlots(selectedDate, selectedVenue, selectedArea);
      }
    });
    
    // Guest count change handler for pricing
    guestCountInput.addEventListener('input', async (e) => {
      const selectedVenue = venueSelect.value;
      const selectedArea = venueAreaSelect.value;
      const selectedDate = dateInput.value;
      const guestCount = parseInt(e.target.value) || 0;
      
      if (selectedVenue && selectedArea && selectedDate && guestCount > 0) {
        await updatePricingDisplay(selectedVenue, selectedArea, selectedDate, guestCount);
      }
    });
    
    // Add backdrop click handler
    const backdrop = modal.querySelector('.gm-booking-modal-backdrop');
    backdrop.addEventListener('click', () => closeBookingModal());
    
    // Show modal
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }

  // Close modal function (global)
  window.closeBookingModal = function() {
    const modal = document.getElementById('gm-booking-modal');
    if (modal) {
      modal.remove();
      document.body.style.overflow = '';
    }
  };

  // Global widget function
  window.GMBookingWidget = async function(container, config = {}) {
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
    await initWidget(container, finalConfig);
  };

  // Modal widget function
  window.GMBookingModal = async function(config = {}) {
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

    // Initialize the modal widget
    await initModalWidget(finalConfig);
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

  // Also initialize on dynamic content changes
  function setupMutationObserver() {
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
    }
  }

  // Setup mutation observer when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupMutationObserver);
  } else {
    setupMutationObserver();
  }
})(); 