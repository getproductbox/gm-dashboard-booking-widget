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
<link rel="stylesheet" href="https://booking-widget.getproductbox.com/widget.css">
<script src="https://booking-widget.getproductbox.com/gm-booking-widget-standalone.js"></script>
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
- `gm-booking-widget-standalone.js` - Main widget logic
- `index.html` - Demo/landing page
- `test-simple.html` - Testing interface

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

## 🌐 Browser Support

- Chrome 60+ ✅
- Firefox 55+ ✅
- Safari 12+ ✅
- Edge 79+ ✅
- Mobile browsers ✅

---

**Result**: A widget that "should have been a 5-minute job from the start" - simple, clean, and actually works! 🎯