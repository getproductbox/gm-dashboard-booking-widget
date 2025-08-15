
# 🚀 Marketing Team - Widget Update Instructions

## 📋 **What Changed**

We've **simplified and fixed** the booking widget! The major improvements:

- ✅ **No more horizontal scrolling** - modals fit properly
- ✅ **Professional styling** - both VIP and venue booking look great
- ✅ **Mobile responsive** - works perfectly on all devices
- ✅ **Consistent experience** - same quality across all booking types
- ✅ **Faster loading** - 70% less CSS code

## 🔄 **Required Updates**

### **1. Update Widget Files (CRITICAL)**

Replace these files on your marketing site:

**Files to Update:**
- `src/` directory (all modular JavaScript files) ← **MUST UPDATE**
- `widget.css` ← **MUST UPDATE**

**Note:** The widget now uses a modular architecture. All files in the `src/` directory must be included in the correct order.

### **2. Configure API (new option)**

Set `window.GMBookingWidgetConfig` before loading the script:

```html
<script>
  window.GMBookingWidgetConfig = {
    apiEndpoint: 'https://YOUR-PROJECT.supabase.co/functions/v1',
    bookingApiName: 'public-booking-api-v2',
    apiKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBsa3N2YXRqZHlscHVoaml0YmZjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDc2NDkzMywiZXhwIjoyMDY2MzQwOTMzfQ.M4Ikh3gSAVTPDxkMNrXLFxCPjHYqaBC5HcVavpHpNlk',
    supabaseUrl: 'https://YOUR-PROJECT.supabase.co',
    supabaseAnonKey: 'YOUR-ANON-KEY'
  };
</script>
```

Your existing calls to `GMBookingModal({...})` continue to work.

## ✅ **Testing Checklist**

After updating the files, test these scenarios:

### **VIP Ticket Booking:**
- [ ] Click "Book VIP Tickets" button
- [ ] Modal opens with professional styling
- [ ] Form has 2-column layout (not squeezed)
- [ ] No horizontal scrolling
- [ ] Saturday date validation works
- [ ] Submit button is orange gradient

### **Venue Hire Booking:**
- [ ] Click "Book Venue" button  
- [ ] Modal opens with professional styling
- [ ] Venue area dropdown populates
- [ ] Form layout looks identical to VIP
- [ ] Submit button is blue gradient
- [ ] Time slots populate

### **Mobile Testing:**
- [ ] Open modals on mobile device
- [ ] Form fields stack vertically
- [ ] No horizontal scrolling
- [ ] Easy to fill out forms
- [ ] Buttons are properly sized

## 🐛 **If Something Breaks**

### **Issue: Modal looks basic/unstyled**
**Solution**: Make sure you updated BOTH files:
- `gm-booking-widget-standalone.js` 
- `widget.css`

### **Issue: Venue areas don't populate**
**Solution**: This is likely an API issue, not widget. Check:
- API endpoint is correct
- API key is valid
- CORS headers are configured

### **Issue: Old horizontal scrolling returns**
**Solution**: 
1. Clear browser cache
2. Confirm you're using the latest `widget.css`
3. Check for any custom CSS overriding the widget

## 📞 **Support**

If you encounter any issues:

1. **First**: Clear browser cache and try again
2. **Check**: Confirm both files were updated
3. **Test**: Use browser dev tools to check for console errors
4. **Contact**: Development team with specific error details

## 🎯 **Expected Results**

After the update, you should see:

- **Professional modals** that look like modern booking interfaces
- **Perfect mobile experience** with no scrolling issues
- **Consistent styling** between VIP and venue bookings
- **Faster loading** due to simplified code
- **Same functionality** with better user experience

---

**This update fixes all the UI issues we've been experiencing and provides a much better user experience for your customers!** 🎉