const express = require('express');
const router = express.Router();
const { printLabel, printLabelsBatch, getAvailablePrinters, testPrinter } = require('../utils/printer');
const Product = require('../models/Product');

// GET /api/printer/available - Get available printers
router.get('/available', async (req, res) => {
  try {
    const printers = await getAvailablePrinters();
    res.json(printers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/printer/test - Test printer connection
router.post('/test', async (req, res) => {
  try {
    const { printerInterface } = req.body;
    const result = await testPrinter(printerInterface);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/printer/label - Print product label
router.post('/label', async (req, res) => {
  try {
    const { productId, copies = 1, labelConfig = {} } = req.body;
    
    // Get product details using Product model
    const product = await Product.getById(productId);
    
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    
    // For Windows print environment, we prepare the data and let frontend handle printing
    const result = await printLabel(product, copies, labelConfig);
    
    if (result) {
      res.json({ 
        success: true, 
        message: `${copies} label(s) ready for printing`,
        product: product,
        copies: copies,
        labelConfig: labelConfig
      });
    } else {
      res.status(500).json({ error: 'Failed to prepare label for printing' });
    }
  } catch (error) {
    console.error('Print label error:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/printer/labels/batch - Print multiple product labels efficiently
router.post('/labels/batch', async (req, res) => {
  try {
    const { products, labelConfig = {} } = req.body; // products: [{ id, copies }]
    
    // Get all product details using Product model
    const productDetails = [];
    
    for (const item of products) {
      try {
        const product = await Product.getById(item.id);
        
        if (product) {
          productDetails.push({
            product,
            copies: item.copies || 1
          });
        }
      } catch (error) {
        console.warn(`Failed to fetch product ${item.id}:`, error.message);
        // Continue with other products
      }
    }
    
    if (productDetails.length === 0) {
      return res.status(400).json({ error: 'No valid products found' });
    }
    
    // For Windows print environment, prepare data for frontend printing
    const success = await printLabelsBatch(productDetails, labelConfig);
    
    if (success) {
      const totalLabels = productDetails.reduce((sum, p) => sum + p.copies, 0);
      res.json({ 
        success: true, 
        message: `${totalLabels} labels ready for printing`,
        totalPrinted: totalLabels,
        productsProcessed: productDetails.length,
        productDetails: productDetails, // Send product data for frontend printing
        labelConfig: labelConfig
      });
    } else {
      res.status(500).json({ error: 'Failed to prepare labels for printing' });
    }
  } catch (error) {
    console.error('Batch print error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;