const express = require('express');
const router = express.Router();
const Purchase = require('../models/Purchase');
const Product = require('../models/Product');
const multer = require("multer");
const XLSX = require("xlsx");
const { supabase } = require('../db/setup');

const upload = multer({ storage: multer.memoryStorage() });
// GET /api/purchases
router.get('/', async (req, res) => {
  try {
    const purchases = await Purchase.getAll();
    res.json(purchases);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/purchases/getByProductAndVendor
router.get('/getByProductAndVendor', async (req, res) => {
  try {
    const { product_id, vendor_id } = req.query;
    if (!product_id || !vendor_id) {
      return res.status(400).json({ error: 'product_id and vendor_id are required' });
    }

    const { data: purchase, error } = await supabase
      .from('purchases')
      .select('*')
      .eq('product_id', product_id)
      .eq('vendor_id', vendor_id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      throw error;
    }

    res.json(purchase || null);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/purchases
router.post('/', async (req, res) => {
  try {
    const { vendor_id, product_id, quantity, price } = req.body;
    if (!vendor_id || !product_id || !quantity || !price)
      return res.status(400).json({ error: 'All fields required' });
    
    console.log('Received purchase request:', { vendor_id, product_id, quantity, price });
    
    // Check existing purchases for this vendor-product combination (for debugging)
    const { data: existingPurchases, error: checkError } = await supabase
      .from('purchases')
      .select('*')
      .eq('vendor_id', vendor_id)
      .eq('product_id', product_id);
    
    console.log('Existing purchases for this vendor-product:', existingPurchases);
    
    // Always create a new purchase record for each transaction
    // This allows tracking individual daily purchases instead of cumulative quantities
    const purchase = await Purchase.create({ vendor_id, product_id, quantity, price });
    
    console.log('Created purchase:', purchase);
    
    res.status(201).json(purchase);
  } catch (e) {
    console.error('Purchase creation failed:', e);
    res.status(500).json({ error: e.message });
  }
});

// Test endpoint to check purchase records for debugging
router.get('/debug/:vendorId/:productId', async (req, res) => {
  try {
    const { vendorId, productId } = req.params;
    const { data, error } = await supabase
      .from('purchases')
      .select('*, vendors(name), products(name)')
      .eq('vendor_id', vendorId)
      .eq('product_id', productId)
      .order('purchased_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});


router.post("/import", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const vendorId = Number(req.body.vendor_id);
    if (!vendorId) return res.status(400).json({ error: "vendor_id is required" });

    const wb = XLSX.read(req.file.buffer, { type: "buffer" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: "", raw: false });

    let created = 0,
      updated = 0,
      purchasesAdded = 0;

    for (const r of rows) {
      const qty = Number(r.quantity || 0);
      if (!r.name || !qty) continue;

      const payload = {
        name: String(r.name || "").trim(),
        price: Number(String(r.price || "0").replace(/[^0-9.]/g, "")),
        stock: qty,
        barcode: String(r.barcode || "").trim() || null,
      };

      let product;

      if (payload.barcode) {
        const existing = await Product.getByCode(payload.barcode);
        if (existing) {
          await Product.incrementStock(existing.id, qty);
          product = existing;
          updated++;
        }
      }

      if (!product) {
        product = await Product.create(payload);
        created++;
      }

      await Purchase.create({
        vendor_id: vendorId,
        product_id: product.id,
        quantity: qty,
        price: payload.price,
      });
      purchasesAdded++;
    }

    res.json({ ok: true, created, updated, purchasesAdded });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    // 1. Find the purchase first (to get product_id and quantity)
    const { data: purchase, error: findError } = await supabase
      .from('purchases')
      .select('product_id, quantity')
      .eq('id', id)
      .single();

    if (findError || !purchase) {
      return res.status(404).json({ error: 'Purchase not found' });
    }

    // 2. Get the current stock of that product
    const { data: product, error: productError } = await supabase
      .from('products')
      .select('stock')
      .eq('id', purchase.product_id)
      .single();

    if (productError || !product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // 3. Update product stock (subtract purchase quantity)
    const newStock = product.stock - purchase.quantity;

    const { error: updateError } = await supabase
      .from('products')
      .update({ stock: newStock })
      .eq('id', purchase.product_id);

    if (updateError) {
      console.error("Stock update failed:", updateError);
      return res.status(400).json({ error: updateError.message });
    }

    // 4. Now delete the purchase row
    const { error: deleteError } = await supabase
      .from('purchases')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error("Delete purchase failed:", deleteError);
      return res.status(400).json({ error: deleteError.message });
    }

    res.status(204).send();
  } catch (err) {
    console.error("DELETE /purchases/:id failed:", err);
    res.status(500).json({ error: err.message });
  }
});




module.exports = router;
