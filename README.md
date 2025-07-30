# GM Booking Widget - Deployment

This directory contains the files needed to deploy the GM Booking Widget to Netlify.

## Files

- `index.html` - Landing page for the widget hosting site
- `widget.css` - Widget styles and theming
- `gm-booking-widget-standalone.js` - Standalone widget functionality
- `widget-loader.js` - Auto-initialization script

## Deployment Instructions

### 1. Deploy to Netlify

1. Go to [Netlify](https://netlify.com)
2. Click "New site from Git" or "Deploy manually"
3. Upload the contents of this directory
4. Set the site name to: `booking-widget`
5. Deploy

### 2. Configure Custom Domain

1. In Netlify dashboard, go to Site settings > Domain management
2. Click "Add custom domain"
3. Enter: `booking-widget.getproductbox.com`
4. Follow the DNS configuration instructions

### 3. DNS Configuration

Add this CNAME record to your DNS provider:
```
Type: CNAME
Name: booking-widget
Value: your-netlify-site.netlify.app
```

## Integration URLs

Once deployed, the widget will be available at:

- **CSS**: `https://booking-widget.getproductbox.com/widget.css`
- **JavaScript**: `https://booking-widget.getproductbox.com/gm-booking-widget-standalone.js`

## Usage Example

```html
<!-- Include the widget files -->
<link rel="stylesheet" href="https://booking-widget.getproductbox.com/widget.css">
<script src="https://booking-widget.getproductbox.com/gm-booking-widget-standalone.js"></script>

<!-- Add the widget -->
<div data-gm-widget="booking" data-venue="manor"></div>
```

## Configuration Options

- `data-venue`: "manor", "hippie", or "both"
- `data-venue-area`: "upstairs", "downstairs", or "full_venue"
- `data-theme`: "light" or "dark"
- `data-primary-color`: Any CSS color
- `data-show-special-requests`: "true" or "false" 