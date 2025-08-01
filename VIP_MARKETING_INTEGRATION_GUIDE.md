# 🎫 VIP Ticket Booking - Marketing Integration Guide

## 📋 **Quick Integration Instructions**

### **Step 1: Include Required Files**
Add these files to your marketing site:

```html
<!-- Add to your HTML <head> section -->
<link rel="stylesheet" href="widget.css">
<script src="gm-booking-widget-standalone.js"></script>
```

### **Step 2: Add VIP Ticket Buttons**
Replace or add buttons on your marketing site:

```html
<!-- General VIP Tickets (user can choose Manor or Hippie) -->
<button onclick="openVIPModal()" class="vip-button">
    Book VIP Tickets
</button>

<!-- Manor VIP Tickets (pre-configured) -->
<button onclick="openManorVIPModal()" class="vip-button">
    Book Manor VIP Tickets
</button>

<!-- Hippie VIP Tickets (pre-configured) -->
<button onclick="openHippieVIPModal()" class="vip-button">
    Book Hippie VIP Tickets
</button>
```

### **Step 3: Add JavaScript Functions**
Add this JavaScript to your page (before closing `</body>` tag):

```html
<script>
// ===== VIP TICKET BOOKING FUNCTIONS =====

// General VIP booking (user chooses venue)
function openVIPModal() {
    GMBookingModal({
        venue: 'both',              // Shows Manor and Hippie options
        theme: 'light',             // or 'dark' to match your site
        bookingType: 'vip_tickets', // Important: This enables VIP mode
        showSpecialRequests: true   // Allow special requests field
    });
}

// Manor VIP booking (pre-configured)
function openManorVIPModal() {
    GMBookingModal({
        preConfig: {
            venue: 'manor',
            bookingType: 'vip_tickets'
        },
        theme: 'light',
        showSpecialRequests: true
    });
}

// Hippie VIP booking (pre-configured)
function openHippieVIPModal() {
    GMBookingModal({
        preConfig: {
            venue: 'hippie',
            bookingType: 'vip_tickets'
        },
        theme: 'light',
        showSpecialRequests: true
    });
}
</script>
```

---

## 🎯 **VIP Ticket Features**

### **What VIP Tickets Include:**
- ✅ **Saturday-Only Bookings**: Automatically enforced date validation
- ✅ **Venue Selection**: Manor or Hippie (or pre-configured)
- ✅ **Ticket Quantity**: 1-100 tickets per booking
- ✅ **Customer Details**: Name, email/phone contact
- ✅ **Special Requests**: VIP table requests, dietary requirements, etc.
- ✅ **Professional Layout**: Clean 2-column modal form

### **Form Fields:**
1. **Customer Name** (required)
2. **Email** or **Phone** (at least one required)
3. **Venue** (Manor/Hippie - if not pre-configured)
4. **Booking Date** (Saturday-only with validation)
5. **Number of Tickets** (1-100)
6. **Special Requests** (optional)

---

## 🔧 **Configuration Options**

### **Basic Configuration:**
```javascript
GMBookingModal({
    venue: 'both',              // 'both', 'manor', 'hippie'
    theme: 'light',             // 'light' or 'dark'
    bookingType: 'vip_tickets', // Required for VIP mode
    showSpecialRequests: true   // Show special requests field
});
```

### **Pre-configured Options:**
```javascript
// Pre-configure venue (hides venue selection)
GMBookingModal({
    preConfig: {
        venue: 'manor',         // User won't see venue dropdown
        bookingType: 'vip_tickets'
    },
    theme: 'light',
    showSpecialRequests: true
});
```

### **Theme Options:**
```javascript
// Light theme (default)
theme: 'light'

// Dark theme (for dark marketing sites)
theme: 'dark'
```

---

## 📱 **Responsive Design**

The VIP ticket modal is fully responsive and works on:
- ✅ **Desktop** (600px modal width)
- ✅ **Tablet** (adapts to screen width)
- ✅ **Mobile** (full-screen on small devices)

---

## 🎨 **Styling Integration**

### **Default Button Styling:**
```css
.vip-button {
    background: linear-gradient(135deg, #ff6b35 0%, #e55a2b 100%);
    color: white;
    border: none;
    padding: 12px 24px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.vip-button:hover {
    background: linear-gradient(135deg, #e55a2b 0%, #d44a1a 100%);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
}
```

### **Custom Theme Colors:**
The modal automatically adapts to your theme setting, but you can customize colors in `widget.css` if needed.

---

## 🧪 **Testing**

### **Test Your Integration:**
1. **Open your marketing site**
2. **Click VIP ticket buttons** to verify modals open correctly
3. **Test form validation**: Try non-Saturday dates, invalid quantities
4. **Test different venues**: Manor vs. Hippie pre-configuration
5. **Test responsive design**: Check on mobile/tablet

### **Test Scenarios:**
- ✅ **Valid Saturday booking** (should work)
- ❌ **Non-Saturday date** (should show error)
- ❌ **Missing required fields** (should show validation)
- ❌ **Invalid ticket quantity** (should enforce 1-100 range)

---

## 🚀 **Deployment Checklist**

- [ ] **Files uploaded**: `widget.css` and `gm-booking-widget-standalone.js`
- [ ] **HTML updated**: VIP ticket buttons added
- [ ] **JavaScript added**: Modal functions included
- [ ] **Testing completed**: All VIP scenarios work
- [ ] **Responsive tested**: Works on mobile/tablet
- [ ] **Theme matches**: Light/dark theme suits your site

---

## 📞 **API Integration**

The VIP ticket bookings automatically submit to:
- **Endpoint**: `https://plksvatjdylpuhjitbfc.supabase.co/functions/v1/public-booking-api`
- **Method**: POST
- **Authentication**: Bearer token (handled automatically)

### **VIP Ticket Data Structure:**
```json
{
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "customerPhone": "+44 123 456 7890",
  "bookingType": "vip_tickets",
  "venue": "manor",
  "bookingDate": "2025-08-02",
  "ticketQuantity": 4,
  "specialRequests": "VIP table request"
}
```

---

## 🆘 **Support**

If you encounter any issues:
1. **Check console** for JavaScript errors
2. **Verify file paths** are correct
3. **Test with simplified button** first
4. **Check network tab** for API errors

**Need help?** Contact the development team with:
- Screenshot of the issue
- Browser console errors
- Steps to reproduce

---

## ✨ **Example Marketing Page Integration**

```html
<!DOCTYPE html>
<html>
<head>
    <title>Your Marketing Site</title>
    <link rel="stylesheet" href="widget.css">
    <script src="gm-booking-widget-standalone.js"></script>
</head>
<body>
    <!-- Your existing content -->
    
    <!-- VIP Tickets Section -->
    <section class="vip-section">
        <h2>VIP Saturday Nights</h2>
        <p>Experience our exclusive VIP Saturday nights with premium service!</p>
        
        <!-- VIP Ticket Buttons -->
        <button onclick="openVIPModal()" class="vip-button">
            Book VIP Tickets
        </button>
        
        <button onclick="openManorVIPModal()" class="vip-button">
            Book Manor VIP
        </button>
        
        <button onclick="openHippieVIPModal()" class="vip-button">
            Book Hippie VIP
        </button>
    </section>

    <script>
        // VIP Ticket Functions
        function openVIPModal() {
            GMBookingModal({
                venue: 'both',
                theme: 'light',
                bookingType: 'vip_tickets',
                showSpecialRequests: true
            });
        }
        
        function openManorVIPModal() {
            GMBookingModal({
                preConfig: { venue: 'manor', bookingType: 'vip_tickets' },
                theme: 'light',
                showSpecialRequests: true
            });
        }
        
        function openHippieVIPModal() {
            GMBookingModal({
                preConfig: { venue: 'hippie', bookingType: 'vip_tickets' },
                theme: 'light',
                showSpecialRequests: true
            });
        }
    </script>
</body>
</html>
```

**That's it! Your VIP ticket booking is ready to go! 🎉**