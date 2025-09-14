const path = require('path');
const fs = require('fs');
const QRCode = require('qrcode');
const bwipjs = require('bwip-js');
const { supabase } = require('../db/setup');

function fileSafe(str) {
  return String(str || '').replace(/[^a-z0-9-_]/gi, '_');
}

async function ensureQrAndBarcode(product, dirs) {
  const code = product.barcode || `PROD-${product.id}`;
  // QR Code
  if (!product.qrcode_path) {
    const qrFilename = `${fileSafe(code)}.png`;
    const qrPath = path.join(dirs.qrcodesDir, qrFilename);
    await QRCode.toFile(qrPath, code, { width: 300 });
    product.qrcode_path = `/static/qrcodes/${qrFilename}`;
  }
  // Barcode PNG via bwip-js (pure JS, no native build)
  if (!product.barcode_path) {
    const barcodeFilename = `${fileSafe(code)}.png`;
    const barcodePath = path.join(dirs.barcodesDir, barcodeFilename);
    const png = await bwipjs.toBuffer({
      bcid: 'code128',
      text: code,
      scale: 3,
      height: 10,
      includetext: true,
      textxalign: 'center',
    });
    fs.writeFileSync(barcodePath, png);
    product.barcode_path = `/static/barcodes/${barcodeFilename}`;
  }
}

async function getAll() {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .order('id', { ascending: false });
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data;
}

async function getById(id) {
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data;
}

async function getByCode(code) {
  const { data, error, status } = await supabase
    .from('products')
    .select('*')
    .eq('barcode', code)
    .single();
  // Supabase returns status 406 if not found
  if (error && status === 406) return null;
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data;
}

async function create(data) {
  // Add default GST rate if not provided
  const productData = {
    ...data,
    gst_rate: data.gst_rate || 18.00,
    is_gst_exempt: data.is_gst_exempt || false,
  };
  
  const { data: inserted, error } = await supabase
    .from('products')
    .insert([productData])
    .select()
    .single();
  if (error) throw new Error(error.message || JSON.stringify(error));
  return inserted;
}

async function update(id, data) {
  const { data: updated, error } = await supabase
    .from('products')
    .update(data)
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error(error.message || JSON.stringify(error));
  return updated;
}

async function remove(id) {
  const { error } = await supabase
    .from('products')
    .delete()
    .eq('id', id);
  if (error) throw new Error(error.message || JSON.stringify(error));
}

module.exports = {
  getAll,
  getById,
  getByCode,
  create,
  update,
  remove,
  ensureQrAndBarcode,
};