const express = require('express');
const router = express.Router();
const Vendor = require('../models/Vendor');
const VendorPayment = require('../models/VendorPayment');
const { supabase } = require('../db/setup');

// GET /api/vendors
router.get('/', async (req, res) => {
  try {
    const vendors = await Vendor.getAll();
    res.json(vendors);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/vendors/with-products - Only vendors that have associated products
router.get('/with-products', async (req, res) => {
  try {
    // Only get vendors that have products assigned directly (vendor_id column)
    const { data: vendorsFromProducts, error: productsError } = await supabase
      .from('products')
      .select('vendor_id, vendors(id, name)')
      .not('vendor_id', 'is', null);
    
    if (productsError) {
      console.error('Error fetching vendors with products:', productsError);
      return res.status(500).json({ error: productsError.message });
    }
    
    // Create unique vendor list from direct assignments only
    let vendorMap = new Map();
    
    if (vendorsFromProducts) {
      vendorsFromProducts.forEach(item => {
        if (item.vendors) {
          vendorMap.set(item.vendors.id, item.vendors);
        }
      });
    }
    
    // Convert to array
    const uniqueVendors = Array.from(vendorMap.values());
    
    res.json(uniqueVendors);
  } catch (e) {
    console.error('Error in /with-products endpoint:', e);
    // Fallback: return all vendors if there's an error
    try {
      const vendors = await Vendor.getAll();
      res.json(vendors);
    } catch (fallbackError) {
      res.status(500).json({ error: e.message });
    }
  }
});

// POST /api/vendors
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Vendor name required' });
    
    // Support both old format (just name) and new format (full vendor object)
    const vendor = await Vendor.create(req.body);
    res.status(201).json(vendor);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/vendors/:id - Get vendor profile
router.get('/:id', async (req, res) => {
  try {
    const vendor = await Vendor.getById(req.params.id);
    res.json(vendor);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// PUT /api/vendors/:id - Update vendor profile
router.put('/:id', async (req, res) => {
  try {
    const vendor = await Vendor.update(req.params.id, req.body);
    res.json(vendor);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/vendors/:id/balance - Get vendor balance
router.get('/:id/balance', async (req, res) => {
  try {
    const balance = await VendorPayment.getVendorBalance(req.params.id);
    res.json(balance);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/vendors/:id/payments - Get vendor payments
router.get('/:id/payments', async (req, res) => {
  try {
    const payments = await VendorPayment.getByVendor(req.params.id);
    res.json(payments);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/vendors/:id/payments - Add payment for vendor
router.post('/:id/payments', async (req, res) => {
  try {
    const payment = await VendorPayment.create({
      vendor_id: req.params.id,
      ...req.body
    });
    res.status(201).json(payment);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/vendors/:id - Delete vendor
router.delete('/:id', async (req, res) => {
  try {
    const vendorId = req.params.id;
    
    // Check if vendor has any purchases
    const { data: purchases, error: purchaseError } = await supabase
      .from('purchases')
      .select('id')
      .eq('vendor_id', vendorId)
      .limit(1);
    
    if (purchaseError) {
      return res.status(500).json({ error: 'Failed to check vendor purchases: ' + purchaseError.message });
    }
    
    // Check if vendor has any products assigned
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id')
      .eq('vendor_id', vendorId)
      .limit(1);
    
    if (productError) {
      return res.status(500).json({ error: 'Failed to check vendor products: ' + productError.message });
    }
    
    if (purchases && purchases.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete vendor. This vendor has purchase history. Please remove all purchases first.' 
      });
    }
    
    if (products && products.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete vendor. This vendor has products assigned. Please reassign or remove products first.' 
      });
    }
    
    // Delete vendor payments first (foreign key constraint)
    const { error: paymentsError } = await supabase
      .from('vendor_payments')
      .delete()
      .eq('vendor_id', vendorId);
    
    if (paymentsError) {
      return res.status(500).json({ error: 'Failed to delete vendor payments: ' + paymentsError.message });
    }
    
    // Delete the vendor
    const { error: deleteError } = await supabase
      .from('vendors')
      .delete()
      .eq('id', vendorId);
    
    if (deleteError) {
      return res.status(500).json({ error: 'Failed to delete vendor: ' + deleteError.message });
    }
    
    res.status(204).send(); // No content - successful deletion
  } catch (e) {
    console.error('Error deleting vendor:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;