(function(root){
    async function submitPublicBooking(config, bookingData) {
        // Use direct fetch approach since it's working reliably
        const base = (config.apiEndpoint || '').replace(/\/$/, '');
        const endpointUrl = config.bookingApiName
            ? `${base}/${config.bookingApiName}`
            : (/public-booking-api(\-v2)?$/i.test(base) ? base : `${base}/public-booking-api`);
        
        console.log('[GM] Submitting booking to:', endpointUrl);
        
        const res = await fetch(endpointUrl, {
            method: 'POST',
            mode: 'cors',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': config.apiKey
            },
            body: JSON.stringify(bookingData)
        });
        
        let data = null;
        try { 
            data = await res.json(); 
        } catch (_) {}
        
        if (!res.ok) {
            const err = new Error((data && data.message) || res.statusText);
            err.status = res.status;
            throw err;
        }
        
        console.log('[GM] Booking submitted successfully:', data);
        return data || { success: true };
    }

    root.GMBookingAPI = { submitPublicBooking };
})(typeof window !== 'undefined' ? window : this);


