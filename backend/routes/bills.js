const express = require('express');
const router = express.Router();

const Printer = require('../utils/printer');
const Product = require('../models/Product');
const { supabase } = require('../db/setup');

// GET /api/bills
router.get('/', async (req, res) => {
  try {
    const { data: bills, error } = await supabase
      .from('bills')
      .select('*')
      .order('id', { ascending: false })
      .limit(50);
    if (error) throw error;
    res.json(bills.map((b) => ({ ...b, total: Number(b.total) })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get sales analytics
router.get('/analytics', async (req, res) => {
  const { period = 'today' } = req.query;
  let dateFrom;
  const today = new Date();
  switch (period) {
    case 'today':
      dateFrom = today.toISOString().split('T')[0];
      break;
    case 'week':
      dateFrom = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
      break;
    case 'month':
      dateFrom = new Date(today.setDate(today.getDate() - 30)).toISOString().split('T')[0];
      break;
    case 'year':
      dateFrom = new Date(today.setDate(today.getDate() - 365)).toISOString().split('T')[0];
      break;
    default:
      dateFrom = new Date().toISOString().split('T')[0];
  }
  try {
    const { data, error } = await supabase
      .from('bills')
      .select('total')
      .gte('created_at', dateFrom);
    if (error) throw error;
    const totals = data.map(b => Number(b.total));
    const total_transactions = totals.length;
    const total_sales = totals.reduce((a, b) => a + b, 0);
    const avg_transaction_value = total_transactions ? total_sales / total_transactions : 0;
    const min_transaction = totals.length ? Math.min(...totals) : 0;
    const max_transaction = totals.length ? Math.max(...totals) : 0;
    res.json({
      period,
      total_transactions,
      total_sales,
      avg_transaction_value,
      min_transaction,
      max_transaction
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get daily sales for charts
router.get('/daily-sales', async (req, res) => {
  const { days = 30 } = req.query;
  const dateFrom = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  try {
    const { data, error } = await supabase
      .from('bills')
      .select('id, total, created_at')
      .gte('created_at', dateFrom);
    if (error) throw error;
    // Group by date
    const grouped = {};
    data.forEach(bill => {
      const date = bill.created_at.split('T')[0];
      if (!grouped[date]) grouped[date] = { date, transactions: 0, sales: 0 };
      grouped[date].transactions += 1;
      grouped[date].sales += Number(bill.total);
    });
    const dailySales = Object.values(grouped).sort((a, b) => b.date.localeCompare(a.date));
    res.json(dailySales);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Get top selling products
router.get('/top-products', async (req, res) => {
  const { period = 'month', limit = 10 } = req.query;
  let dateFrom;
  const today = new Date();
  switch (period) {
    case 'week':
      dateFrom = new Date(today.setDate(today.getDate() - 7)).toISOString().split('T')[0];
      break;
    case 'month':
      dateFrom = new Date(today.setDate(today.getDate() - 30)).toISOString().split('T')[0];
      break;
    case 'year':
      dateFrom = new Date(today.setDate(today.getDate() - 365)).toISOString().split('T')[0];
      break;
    default:
      dateFrom = new Date().toISOString().split('T')[0];
  }
  try {
    // Get bill_items joined with products and bills
    const { data: billItems, error } = await supabase
      .from('bill_items')
      .select('quantity, subtotal, product_id, bills!inner(created_at), products!inner(name, barcode)')
      .gte('bills.created_at', dateFrom);
    if (error) throw error;
    // Aggregate by product
    const grouped = {};
    billItems.forEach(item => {
      const key = item.products.barcode;
      if (!grouped[key]) {
        grouped[key] = {
          name: item.products.name,
          barcode: item.products.barcode,
          total_quantity: 0,
          total_revenue: 0
        };
      }
      grouped[key].total_quantity += item.quantity;
      grouped[key].total_revenue += Number(item.subtotal);
    });
    const topProducts = Object.values(grouped)
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, Number(limit));
    res.json(topProducts);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/bills
router.post('/', async (req, res) => {
  const { items, paymentMethod = 'cash', customerName, customerPhone } = req.body;
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'No items to bill' });
  }
  try {
    // Fetch product details and calculate totals (prices already include GST)
    const withDetails = [];
    let total = 0;
    
    for (const it of items) {
      const prod = await Product.getById(it.productId);
      if (!prod) throw new Error('Invalid product id ' + it.productId);
      
      const itemTotal = Number(prod.price) * it.quantity;
      
      withDetails.push({ 
        ...it, 
        name: prod.name, 
        price: Number(prod.price), 
        subtotal: itemTotal
      });
      
      total += itemTotal;
    }
    
    // Insert bill
    const { data: bill, error: billError } = await supabase
      .from('bills')
      .insert([{
        created_at: new Date().toISOString(),
        total: total,
        payment_method: paymentMethod,
        customer_name: customerName,
        customer_phone: customerPhone
      }])
      .select()
      .single();
    if (billError) throw billError;
    
    const billId = bill.id;
    // Insert bill items and update stock
    for (const it of withDetails) {
      await supabase.from('bill_items').insert([{
        bill_id: billId,
        product_id: it.productId,
        quantity: it.quantity,
        price: it.price,
        subtotal: it.subtotal
      }]);
      // Update stock
      const prod = await Product.getById(it.productId);
      await Product.update(it.productId, { stock: prod.stock - it.quantity });
    }
    // Optionally update sales_summary (can be done with a trigger or extra query)
    await Printer.printReceipt({
      id: billId,
      createdAt: new Date().toISOString(),
      items: withDetails,
      total: total,
    });
    res.status(201).json({ 
      id: billId, 
      total: total,
      items: withDetails
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;