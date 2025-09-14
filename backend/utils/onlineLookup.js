// Simple online lookup using Open Food Facts public API.
// Note: This API typically returns product name/brand but NOT price.
// Docs: https://world.openfoodfacts.org/data

async function lookupByBarcode(barcode) {
  try {
    if (!barcode) return null;
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`;
    const res = await fetch(url, { method: 'GET' });
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.product) {
      const name = data.product.product_name || data.product.generic_name || '';
      const brand = data.product.brands || '';
      return {
        barcode,
        name: [name, brand].filter(Boolean).join(' - ') || undefined,
      };
    }
  } catch (_) {
    // ignore network errors; remain offline-first
  }
  return null;
}

module.exports = { lookupByBarcode };


