export async function fetchVenueConfig(config, venueFilter = null) {
  const base = (config.apiEndpoint || '').replace(/\/$/, '');
  let url = `${base}/venue-config-api`;
  if (venueFilter) url += `?venue=${venueFilter}`;

  const res = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${config.apiKey}`,
      'x-api-key': config.apiKey,
      'Content-Type': 'application/json'
    }
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  const data = await res.json();
  return venueFilter ? (data.venue ? [data.venue] : []) : (data.venues || []);
}

export async function fetchPricing(config, { venue, venueArea, date, guests, duration = 4 }) {
  const url = `${config.apiEndpoint}/pricing-api`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`
    },
    body: JSON.stringify({ venue, venueArea, date, guests, duration })
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

// UMD attach
if (typeof window !== 'undefined') {
  window.GMVenueAPI = { fetchVenueConfig, fetchPricing };
}


