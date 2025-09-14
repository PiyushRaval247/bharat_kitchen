function parseEmbeddedPriceFromEAN13(code) {
  // Common variable-weight patterns (retailer-specific). This is a generic heuristic:
  // If first digit is '2' and length is 13, interpret as:
  // 2 + [item:5] + [price:5] + [check:1]; price with 2 decimals
  if (typeof code !== 'string') return null;
  const trimmed = code.replace(/\D/g, '');
  if (trimmed.length !== 13) return null;
  if (trimmed[0] !== '2') return null;
  const baseCode = trimmed.slice(1, 6);
  const priceCentsStr = trimmed.slice(6, 11);
  if (!/^[0-9]{5}$/.test(priceCentsStr)) return null;
  const price = Number.parseInt(priceCentsStr, 10) / 100;
  if (!Number.isFinite(price)) return null;
  return { baseCode, price };
}

module.exports = { parseEmbeddedPriceFromEAN13 };


