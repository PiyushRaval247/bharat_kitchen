// Optional remote price lookup
// Configure REMOTE_PRICE_API env var to an endpoint that accepts ?barcode= and returns JSON { name?, price? }
// Example response: { name: "Dairy Milk 24g", price: 10.0 }

async function lookupRemotePrice(barcode) {
  const base = process.env.REMOTE_PRICE_API;
  if (!base || !barcode) return null;
  try {
    const url = `${base}${base.includes('?') ? '&' : '?'}barcode=${encodeURIComponent(barcode)}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || (data.price == null && !data.name)) return null;
    return { name: data.name, price: typeof data.price === 'string' ? Number(data.price) : data.price };
  } catch (_) {
    return null;
  }
}

module.exports = { lookupRemotePrice };


