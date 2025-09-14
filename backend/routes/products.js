const express = require('express');
const router = express.Router();
const { supabase } = require('../db/setup');

const Product = require('../models/Product');
const { parseEmbeddedPriceFromEAN13 } = require('../utils/barcode');
const { lookupByBarcode } = require('../utils/onlineLookup');
const { lookupRemotePrice } = require('../utils/remotePrice');
const multer = require('multer');
const XLSX = require('xlsx');

// GET /api/products
router.get('/', async (req, res) => {
  const { paths } = req.context;
  try {
    const products = await Product.getAll();
    
    // Fetch vendor information for each product from both direct assignment and purchases
    const productsWithVendors = await Promise.all(products.map(async (product) => {
      let primaryVendor = null;
      
      // First, check if product has a direct vendor_id assignment
      if (product.vendor_id) {
        const { data: directVendor, error: directError } = await supabase
          .from('vendors')
          .select('id, name')
          .eq('id', product.vendor_id)
          .single();
        
        if (!directError && directVendor) {
          primaryVendor = {
            id: directVendor.id,
            name: directVendor.name
          };
        }
      }
      
      // If no direct vendor, fall back to purchase-based lookup
      if (!primaryVendor) {
        const { data: recentPurchase, error } = await supabase
          .from('purchases')
          .select('vendor_id, vendors(name)')
          .eq('product_id', product.id)
          .order('purchased_at', { ascending: false })
          .limit(1);
        
        if (!error && recentPurchase && recentPurchase.length > 0) {
          primaryVendor = {
            id: recentPurchase[0].vendor_id,
            name: recentPurchase[0].vendors?.name || 'Unknown'
          };
        }
      }
      
      // Get all vendors who have supplied this product (from purchases)
      const { data: allVendors, error: vendorsError } = await supabase
        .from('purchases')
        .select('vendor_id, vendors(name)')
        .eq('product_id', product.id);
      
      if (vendorsError) {
        console.warn('Error fetching all vendors for product', product.id, ':', vendorsError.message);
      }
      
      // Ensure QR and barcode exist
      await Product.ensureQrAndBarcode(product, paths);
      await Product.update(product.id, { qrcode_path: product.qrcode_path, barcode_path: product.barcode_path });
      
      return {
        ...product,
        price: Number(product.price),
        stock: Number(product.stock),
        primary_vendor: primaryVendor,
        all_vendors: allVendors ? allVendors.map(v => ({
          id: v.vendor_id,
          name: v.vendors?.name || 'Unknown'
        })) : []
      };
    }));
    
    res.json(productsWithVendors);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/products/scan/:code
router.get('/scan/:code', async (req, res) => {
  try {
    const raw = req.params.code;
    let product = await Product.getByCode(raw);

    // Try variable-weight barcode parse if not found
    let overridePrice = null;
    if (!product) {
      const parsed = parseEmbeddedPriceFromEAN13(raw);
      if (parsed) {
        product = await Product.getByCode(parsed.baseCode);
        if (product) overridePrice = parsed.price;
      }
    }

    if (!product) {
      // Optional online lookup for product name/brand (no price)
      const suggestion = await lookupByBarcode(raw);
      // Optional remote price API for price/name
      const remote = await lookupRemotePrice(raw);
      if (suggestion || remote) {
        return res.status(404).json({
          error: 'Product not found',
          suggestion: {
            barcode: raw,
            name: remote?.name || suggestion?.name,
            price: remote?.price ?? undefined,
          },
        });
      }
      return res.status(404).json({ error: 'Product not found' });
    }
    const payload = { ...product };
    if (overridePrice != null) payload.price = overridePrice;
    res.json(payload);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/products
router.post('/', async (req, res) => {
  const { paths } = req.context;
  const { name, price, stock, barcode, wholesale_price, vendor_id, gst_rate, is_gst_exempt } = req.body;

  if (!name || price == null) {
    return res.status(400).json({ error: 'name and price are required' });
  }

  try {
    let created = await Product.create({
      name,
      price,
      stock: stock || 0,
      barcode,
      wholesale_price: wholesale_price || 0,
      vendor_id: vendor_id || null,
      gst_rate: gst_rate || 18,
      is_gst_exempt: is_gst_exempt || false
    });

    await Product.ensureQrAndBarcode(created, paths);

    created = await Product.update(created.id, {
      qrcode_path: created.qrcode_path,
      barcode_path: created.barcode_path,
    });

    res.status(201).json(created);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


// PUT /api/products/:id
router.put('/:id', async (req, res) => {
  const { paths } = req.context;
  const id = Number(req.params.id);
  try {
    const existing = await Product.getById(id);
    if (!existing) return res.status(404).json({ error: 'Not found' });
    
    // First update with all the request data
    let merged = await Product.update(id, req.body);
    
    // Ensure QR and barcode paths are generated
    await Product.ensureQrAndBarcode(merged, paths);
    
    // Update again with the QR/barcode paths, preserving all other fields
    const updated = await Product.update(id, {
      ...req.body, // Keep all the original update data
      qrcode_path: merged.qrcode_path,
      barcode_path: merged.barcode_path,
    });
    
    res.json(updated);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  const id = Number(req.params.id);
  await Product.remove(id);
  res.json({ ok: true });
});

// Bulk import CSV/XLSX
const upload = multer({ storage: multer.memoryStorage() });
router.post('/import', upload.single('file'), async (req, res) => {
  const { paths } = req.context;
  if (!req.file) return res.status(400).json({ error: 'No file' });
  
  console.log('Import request received:', {
    filename: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype
  });
  
  try {
    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const wsName = wb.SheetNames[0];
    const ws = wb.Sheets[wsName];
    if (!ws) return res.status(400).json({ error: 'No sheet found' });
    
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '', raw: false });
    console.log(`Processing ${rows.length} rows from import file`);
    
    // Expect columns: name, price, stock, barcode (optional), wholesale_price (optional)
    let created = 0, updated = 0;
    for (const r of rows) {
      try {
        const payload = {
          name: String(r.name || '').trim(),
          price: Number(String(r.price || '0').replace(/[^0-9.]/g, '')),
          stock: Number(String(r.stock || '0').replace(/[^0-9.]/g, '')),
          barcode: String(r.barcode || '').trim() || null,
          wholesale_price: Number(String(r.wholesale_price || '0').replace(/[^0-9.]/g, '')),
        };
        
        // Only add vendor_id if it exists in the CSV and is valid
        if (r.vendor_id && Number(r.vendor_id)) {
          payload.vendor_id = Number(r.vendor_id);
        }
        
        if (!payload.name) {
          console.log('Skipping row with empty name:', r);
          continue;
        }
        
        console.log('Processing product:', payload.name);
        
        if (payload.barcode) {
          const existing = await Product.getByCode(payload.barcode);
          if (existing) {
            await Product.update(existing.id, payload);
            updated += 1;
            console.log('Updated existing product:', payload.name);
            continue;
          }
        }
        
        await Product.create(payload);
        created += 1;
        console.log('Created new product:', payload.name);
      } catch (rowError) {
        console.error('Error processing row:', r, rowError.message);
        // Continue with next row instead of failing entire import
      }
    }
    
    console.log(`Import completed: ${created} created, ${updated} updated`);
    
    // Generate QR/barcodes for all products that don't have them
    const all = await Product.getAll();
    for (const p of all) {
      if (!p.qrcode_path || !p.barcode_path) {
        try {
          // Ensure barcode exists (generate if missing)
          if (!p.barcode) {
            const newBarcode = `PROD-${p.id}`;
            await Product.update(p.id, { barcode: newBarcode });
            p.barcode = newBarcode;
          }
          // Generate QR/barcode images
          await Product.ensureQrAndBarcode(p, paths);
          await Product.update(p.id, { 
            qrcode_path: p.qrcode_path, 
            barcode_path: p.barcode_path 
          });
        } catch (qrError) {
          console.error('Error generating QR/barcode for product:', p.id, qrError.message);
        }
      }
    }
    
    res.json({ ok: true, created, updated });
  } catch (e) {
    console.error('Import error:', e.message, e.stack);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;