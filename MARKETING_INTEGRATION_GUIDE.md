# Marketing Site Widget Integration Guide

## 🚨 **URGENT: Update Required**

Your marketing site is currently using the old inline widget which is causing positioning constraints. You need to update to the new modal widget for better flexibility.

## 📋 **Current Issue**
The booking widget appears constrained in a central area instead of being a true full-page overlay.

## ✅ **Solution: Use Modal Widget**

### **Step 1: Update HTML Structure**

**REMOVE this old code:**
```html
<div data-gm-widget="booking" data-venue="manor"></div>
```

**REPLACE with this:**
```html
<!-- Add a button to trigger the modal -->
<button onclick="openBookingModal()" class="your-button-class">
  Book Your Venue
</button>
```

### **Step 2: Add JavaScript Function**

Add this script to your page:

```javascript
function openBookingModal() {
  GMBookingModal({
    venue: 'manor', // or 'hippie' or 'both'
    theme: 'light', // or 'dark'
    defaultVenueArea: 'upstairs', // or 'downstairs' or 'full_venue'
    showSpecialRequests: true
  });
}
```

### **Step 3: Include Updated Files**

Make sure you're using the latest widget files:

```html
<link rel="stylesheet" href="https://booking-widget.getproductbox.com/widget.css">
<script src="https://booking-widget.getproductbox.com/gm-booking-widget-standalone.js"></script>
```

## 🎯 **Different Venue Options**

### **For Manor Venue:**
```javascript
function openManorModal() {
  GMBookingModal({
    venue: 'manor',
    theme: 'light',
    defaultVenueArea: 'upstairs'
  });
}
```

### **For Hippie Venue:**
```javascript
function openHippieModal() {
  GMBookingModal({
    venue: 'hippie',
    theme: 'light',
    defaultVenueArea: 'downstairs'
  });
}
```

### **For Both Venues:**
```javascript
function openBothVenuesModal() {
  GMBookingModal({
    venue: 'both',
    theme: 'light',
    defaultVenueArea: 'upstairs'
  });
}
```

## 🌙 **Dark Theme Option**

If your marketing site has a dark theme:

```javascript
function openDarkModal() {
  GMBookingModal({
    venue: 'manor',
    theme: 'dark',
    defaultVenueArea: 'upstairs'
  });
}
```

## 📱 **Mobile Optimization**

The modal automatically adapts to mobile screens and will:
- Use full screen width on mobile
- Stack form fields vertically
- Maintain touch-friendly button sizes

## 🔧 **Advanced Configuration**

You can customize the modal further:

```javascript
function openCustomModal() {
  GMBookingModal({
    venue: 'both',
    theme: 'light',
    defaultVenueArea: 'full_venue',
    showSpecialRequests: true,
    apiEndpoint: 'your-custom-endpoint',
    apiKey: 'your-api-key'
  });
}
```

## ✅ **Benefits of Modal Approach**

1. **No Layout Constraints** - Modal appears over content
2. **Full Screen Coverage** - Uses available space optimally
3. **Professional Appearance** - Smooth animations and backdrop
4. **Mobile Optimized** - Responsive design
5. **Easy Integration** - Just add a button

## 🚀 **Quick Implementation**

Replace your current widget with this simple button:

```html
<button onclick="GMBookingModal({venue: 'manor'})" 
        style="background: #ff6b35; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer;">
  Book Your Venue
</button>
```

## 📞 **Need Help?**

If you encounter any issues, check:
1. Widget files are loading correctly
2. No JavaScript errors in console
3. Button click is triggering the function

The modal should now appear as a full-page overlay that fills the available space properly! 