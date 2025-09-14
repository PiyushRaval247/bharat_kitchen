const Product = require('../models/Product');

async function fetchCatalog(url) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data)) return null;
    return data;
  } catch (_) {
    return null;
  }
}

async function syncOnce({ catalogUrl }) {
  if (!catalogUrl) return { ok: false, reason: 'No catalog URL' };
  const catalog = await fetchCatalog(catalogUrl);
  if (!catalog) return { ok: false, reason: 'Fetch failed or invalid format' };

  const normalized = catalog
    .map((i) => ({
      barcode: i.barcode?.toString()?.trim(),
      name: i.name?.toString()?.trim(),
      price: i.price != null ? Number(i.price) : null,
      stock: i.stock != null ? Number(i.stock) : null,
    }))
    .filter((i) => i.barcode);

  let created = 0;
  let updated = 0;
  for (const item of normalized) {
    const existing = await Product.getByCode(item.barcode);
    if (existing) {
      const toUpdate = {};
      if (item.name) toUpdate.name = item.name;
      if (Number.isFinite(item.price)) toUpdate.price = item.price;
      if (Number.isFinite(item.stock)) toUpdate.stock = item.stock;
      if (Object.keys(toUpdate).length > 0) {
        await Product.update(existing.id, toUpdate);
        updated += 1;
      }
    } else {
      const payload = {
        name: item.name || `Item ${item.barcode}`,
        price: Number.isFinite(item.price) ? item.price : 0,
        stock: Number.isFinite(item.stock) ? item.stock : 0,
        barcode: item.barcode,
      };
      await Product.create(payload);
      created += 1;
    }
  }
  return { created, updated };
}

function startPriceSync({ intervalMs = 15 * 60 * 1000, catalogUrl, logger = console } = {}) {
  if (!catalogUrl) return null;
  const run = async () => {
    const res = await syncOnce({ catalogUrl });
    if (res?.ok === false) {
      logger.warn('[price-sync] skipped:', res.reason);
    } else if (res) {
      logger.log(`[price-sync] synced: +${res.created} created, ${res.updated} updated`);
    }
  };
  // initial run
  run();
  const timer = setInterval(run, intervalMs);
  return () => clearInterval(timer);
}

module.exports = { startPriceSync, syncOnce };