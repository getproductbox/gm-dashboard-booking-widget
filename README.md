# GM Booking Widget - Simplified & Clean

A modern, lightweight JavaScript widget for booking venues and VIP tickets at GM Dashboard locations.

## ✨ What's New - Simplified Approach

🎯 **Major Simplification (Jan 2025)**:
- **70% less CSS** (244 lines vs 825 lines)
- **No complex grid conflicts** or horizontal scrolling
- **Unified modal system** for all booking types
- **Clean, maintainable code** with no redundancy

## 🚀 Quick Integration

### 1. Include Widget Files
```html
<link rel="stylesheet" href="widget.css">
<script src="src/core/dom.js"></script>
<script src="src/transport/supabase.js"></script>
<script src="src/api/venue.js"></script>
<script src="src/api/karaoke.js"></script>
<script src="src/api/wrappers.js"></script>
<script src="src/state/store.js"></script>
<script src="src/state/compat.js"></script>
<script src="src/ui/components/DateField.js"></script>
<script src="src/ui/components/GuestField.js"></script>
<script src="src/ui/components/SlotsGrid.js"></script>
<script src="src/ui/components/BoothSelect.js"></script>
<script src="src/ui/components/HoldBanner.js"></script>
<script src="src/ui/components/Status.js"></script>
<script src="src/features/karaoke/holds.js"></script>
<script src="src/features/karaoke/controller.js"></script>
<script src="src/widget/modal.js"></script>
<script src="src/api/booking.js"></script>
<script src="src/widget/forms.js"></script>
<script src="src/widget/index.js"></script>
```

### 2. Configure API
```javascript
window.GMBookingWidgetConfig = {
    apiKey: 'your-supabase-anon-key',
    apiEndpoint: 'https://your-project.supabase.co/functions/v1'
};
```

### 3. Open Booking Modals
```javascript
// VIP Ticket Booking
GMBookingModal({
    bookingType: 'vip_tickets',
    venue: 'manor',
    showSpecialRequests: true
});

// Venue Hire Booking
GMBookingModal({
    bookingType: 'venue_hire',
    venue: 'both',
    defaultVenueArea: 'upstairs'
});
```

## 🎫 Booking Types

### **VIP Tickets**
- Saturday-only validation
- Venue selection (Manor/Hippie)
- Ticket quantity (1-100)
- Special VIP table requests

### **Venue Hire**
- Full venue booking
- Area selection within venues
- Time slot management
- Guest count tracking

## 📱 Features

- ✅ **Clean Modal Interface** - Professional, responsive design
- ✅ **Mobile Optimized** - Perfect on all screen sizes
- ✅ **No Horizontal Scrolling** - Content fits properly
- ✅ **Consistent Styling** - Same look across booking types
- ✅ **Pre-configuration** - Hide/show fields as needed
- ✅ **Form Validation** - Client-side validation with clear messages
- ✅ **API Integration** - Supabase backend with Bearer auth

## 🔧 Deployment

### Netlify Deployment
1. Deploy this repository to Netlify
2. Set custom domain: `booking-widget.getproductbox.com`
3. Configure DNS CNAME record

### Files Included
- `widget.css` - Clean, simplified styles (244 lines)
- `src/` - Modular JavaScript components
- `index.html` - Demo/landing page
- `test-simple.html` - Testing interface
- `test-matrix.html` - Comprehensive testing interface

## Module Boundaries (Internal)

- `src/transport/` — Supabase client loading and low-level transport
- `src/api/` — Domain APIs: venue and karaoke (no DOM)
- `src/state/` — Tiny state store used by features
- `src/ui/components/` — Pure UI components (no data fetching)
- `src/features/karaoke/` — Feature controllers and hold lifecycle
- `src/widget/index.js` — Public entrypoint wiring (globals, auto-init)

## 📖 API Reference

### `GMBookingModal(config)`

**Required Parameters:**
- `bookingType`: `'vip_tickets'` | `'venue_hire'`

**Optional Parameters:**
- `venue`: `'manor'` | `'hippie'` | `'both'` (default: 'both')
- `theme`: `'light'` | `'dark'` (default: 'light')
- `showSpecialRequests`: `boolean` (default: false)
- `defaultVenueArea`: `string` (for venue hire)
- `preConfig`: Object with pre-filled values

### Pre-configuration Examples
```javascript
// Hide venue selection, pre-fill Manor
GMBookingModal({
    preConfig: {
        venue: 'manor',
        bookingType: 'vip_tickets'
    }
});

// Pre-configured venue hire with area
GMBookingModal({
    venue: 'hippie',
    bookingType: 'venue_hire',
    defaultVenueArea: 'downstairs'
});
```

## 🧹 Simplified Architecture

**What We Removed:**
- ❌ 7 redundant test files
- ❌ 600+ lines of conflicting CSS
- ❌ Complex nested container systems
- ❌ Multiple grid layout conflicts
- ❌ Duplicate form generation code

**What We Kept:**
- ✅ Simple modal structure
- ✅ Clean flexbox layouts
- ✅ Modular form generation
- ✅ Professional styling
- ✅ All booking functionality
 - ✅ Single-file build with modular internals

## 🌐 Browser Support

- Chrome 60+ ✅
- Firefox 55+ ✅
- Safari 12+ ✅
- Edge 79+ ✅
- Mobile browsers ✅

---

**Result**: A widget that "should have been a 5-minute job from the start" - simple, clean, and actually works! 🎯