# VIP Ticket Booking Implementation

## Overview

The GM Booking Widget has been enhanced to support VIP ticket bookings alongside venue hire bookings. This implementation provides a seamless booking experience with pre-configuration capabilities and dynamic form fields based on the booking type.

## Key Features

### 1. Booking Type Support
- **Venue Hire** (existing functionality)
- **VIP Tickets** (new functionality)

### 2. Pre-configuration System
The widget accepts pre-configuration parameters to automatically set:
- `venue` (manor/hippie)
- `bookingType` (venue_hire/vip_tickets)

```javascript
window.GMBookingWidget.init({
  preConfig: {
    venue: 'manor',
    bookingType: 'vip_tickets'
  }
});
```

### 3. Dynamic Form Fields

#### VIP Tickets Form Fields:
- Customer name (required)
- Email or phone (at least one required)
- Date picker (Saturdays only)
- Ticket quantity (1-100)
- Special requests (optional)
- Venue selection (if not pre-configured)

#### Venue Hire Form Fields:
- Customer name (required)
- Email or phone (at least one required)
- Date picker (any future date)
- Venue area selection (upstairs/downstairs/full_venue)
- Start time (optional)
- End time (optional)
- Guest count (required)
- Special requests (optional)
- Venue selection (if not pre-configured)

### 4. Enhanced Date Picker for VIP Tickets
- Gray out non-Saturday dates
- Only allow selection of Saturday dates
- Show clear visual indication that VIP tickets are Saturday-only
- Display helpful text: "VIP tickets available on Saturdays only"
- Automatic validation and error messages

### 5. Form Validation

#### VIP Tickets Validation:
- Date must be a Saturday
- Ticket quantity: 1-100
- At least one contact method (email or phone)
- Customer name required

#### Venue Hire Validation:
- Date cannot be in the past
- Guest count: minimum 1
- Venue area required
- At least one contact method (email or phone)
- Customer name required

## API Integration

### Updated Authentication
The widget now uses Bearer token authentication:

```javascript
const response = await fetch('https://plksvatjdylpuhjitbfc.supabase.co/functions/v1/public-booking-api', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBla3N2YXRqZHlscHVoaml0YmZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc2NDkzMywiZXhwIjoyMDY2MzQwOTMzfQ.M4Ikh3gSAVTPDxkMNrXLFxCPjHYqaBC5HcVavpHpNlk'
  },
  body: JSON.stringify(bookingData)
});
```

### Request Body Structure

#### VIP Tickets:
```javascript
{
  customerName: "John Doe",
  customerEmail: "john@example.com",
  customerPhone: "+44 123 456 7890",
  bookingType: "vip_tickets",
  venue: "manor",
  bookingDate: "2025-08-02",
  ticketQuantity: 4,
  specialRequests: "VIP table request"
}
```

#### Venue Hire:
```javascript
{
  customerName: "John Doe",
  customerEmail: "john@example.com",
  customerPhone: "+44 123 456 7890",
  bookingType: "venue_hire",
  venue: "manor",
  venueArea: "upstairs",
  bookingDate: "2025-08-02",
  startTime: "19:00",
  endTime: "23:00",
  guestCount: 20,
  specialRequests: "Birthday party setup"
}
```

### Response Handling

#### Success (201):
```javascript
{
  success: true,
  bookingId: "f7a3d08c-d24e-4274-a961-34c2133dbcc5",
  message: "Booking created successfully"
}
```

#### Validation Error (400):
```javascript
{
  success: false,
  message: "Validation failed",
  errors: {
    bookingDate: "VIP tickets are only available on Saturdays"
  }
}
```

## Usage Examples

### Basic VIP Ticket Booking
```javascript
GMBookingModal({
  venue: 'both',
  theme: 'light',
  bookingType: 'vip_tickets',
  showSpecialRequests: true
});
```

### Pre-configured VIP Booking
```javascript
GMBookingModal({
  preConfig: {
    venue: 'manor',
    bookingType: 'vip_tickets'
  },
  theme: 'light',
  showSpecialRequests: true
});
```

### Venue Hire Booking
```javascript
GMBookingModal({
  venue: 'manor',
  theme: 'light',
  bookingType: 'venue_hire',
  defaultVenueArea: 'upstairs',
  showSpecialRequests: true
});
```

### Inline Widget Usage
```javascript
window.GMBookingWidget.init({
  preConfig: {
    venue: 'hippie',
    bookingType: 'vip_tickets'
  },
  theme: 'dark',
  showSpecialRequests: true
});
```

## CSS Enhancements

### VIP Ticket Specific Styles
- Enhanced date picker styling for Saturday-only dates
- VIP-specific color scheme (orange gradient)
- Improved form validation visual feedback
- Success and error animations
- Responsive design for all screen sizes

### Key CSS Classes
- `.vip-date-picker` - Saturday-only date picker
- `.vip-ticket-form` - VIP ticket form styling
- `.vip-modal` - VIP modal specific styles
- `.vip-header` - VIP header styling

## Testing Scenarios

### VIP Ticket Scenarios:
1. **Valid Saturday booking** - Select a Saturday date with valid ticket quantity
2. **Invalid non-Saturday booking** - Try to select a non-Saturday date
3. **Missing required fields** - Submit form without required fields
4. **Invalid ticket quantity** - Enter ticket quantity outside 1-100 range

### Venue Hire Scenarios:
1. **Valid venue hire booking** - Complete form with all required fields
2. **Missing venue area** - Submit without selecting venue area
3. **Invalid guest count** - Enter guest count less than 1
4. **Past date selection** - Try to select a date in the past

## Implementation Priority

The implementation follows the specified priority order:

1. ✅ **Phase 2a**: Update API integration with new authentication
2. ✅ **Phase 2b**: Add VIP ticket form fields and validation
3. ✅ **Phase 2c**: Implement pre-configuration system
4. ✅ **Phase 2d**: Enhance date picker for Saturday-only VIP tickets
5. ✅ **Phase 2e**: Add dynamic form behavior and UX improvements

## Files Modified

1. **gm-booking-widget-standalone.js** - Main widget implementation
2. **widget.css** - Enhanced styling for VIP tickets
3. **index.html** - Updated demo page with VIP functionality
4. **test-vip-booking.html** - Comprehensive test page

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Performance Considerations

- Lazy loading of form fields based on booking type
- Efficient date validation for Saturday-only dates
- Optimized API calls with proper error handling
- Responsive design for mobile devices

## Security Features

- Client-side validation before API calls
- Secure Bearer token authentication
- Input sanitization and validation
- XSS protection through proper escaping

## Future Enhancements

- Multi-language support
- Advanced date picker with calendar view
- Real-time availability checking
- Payment integration
- Booking confirmation emails
- Admin dashboard integration

## Support

For technical support or questions about the VIP ticket implementation, please refer to the test files and documentation provided. 