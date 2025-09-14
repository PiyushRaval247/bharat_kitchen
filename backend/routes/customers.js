const express = require('express');
const router = express.Router();
const { supabase } = require('../db/setup');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

// Helper function to convert UTC to IST
const convertToIST = (utcTimestamp) => {
  return dayjs.utc(utcTimestamp).tz('Asia/Kolkata').format();
};

// Simple test route
router.get('/test', (req, res) => {
  console.log('Customer test route accessed');
  res.json({ message: 'Customer routes are working!', timestamp: new Date().toISOString() });
});

// Debug route to check all bills
router.get('/debug-bills', async (req, res) => {
  try {
    const { data: bills, error } = await supabase
      .from('bills')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);
    
    if (error) throw error;
    
    res.json({
      total_bills: bills.length,
      bills: bills.map(b => ({
        id: b.id,
        customer_name: b.customer_name,
        customer_phone: b.customer_phone,
        total: b.total,
        created_at: b.created_at
      }))
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/customers - Get customer history
router.get('/', async (req, res) => {
  console.log('=== Customer history route accessed ===');
  
  try {
    // First, let's just get all bills and see what we have
    const { data: bills, error } = await supabase
      .from('bills')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log('Raw bills from database:', bills?.length || 0);
    console.log('Database error:', error);
    
    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }
    
    if (!bills || bills.length === 0) {
      console.log('No bills found in database');
      return res.json([]);
    }
    
    // Separate bills into named customers and anonymous customers
    const namedCustomerBills = bills.filter(bill => {
      const hasName = bill.customer_name && bill.customer_name.trim() !== '';
      const hasPhone = bill.customer_phone && bill.customer_phone.trim() !== '';
      return hasName || hasPhone;
    });
    
    const anonymousBills = bills.filter(bill => {
      const hasName = bill.customer_name && bill.customer_name.trim() !== '';
      const hasPhone = bill.customer_phone && bill.customer_phone.trim() !== '';
      return !hasName && !hasPhone;
    });
    
    console.log('Bills with customer info:', namedCustomerBills.length);
    console.log('Anonymous bills:', anonymousBills.length);
    
    // Debug: Let's see what some of the bills look like
    if (bills.length > 0) {
      console.log('Sample bill data:', bills.slice(0, 3).map(b => ({
        id: b.id,
        customer_name: b.customer_name,
        customer_phone: b.customer_phone,
        total: b.total
      })));
    }
    
    const customerMap = {};
    
    // Process named customers
    namedCustomerBills.forEach(bill => {
      // Use phone as primary key, fallback to name
      const key = bill.customer_phone || bill.customer_name || `unknown_${bill.id}`;
      
      if (!customerMap[key]) {
        customerMap[key] = {
          customer_name: bill.customer_name || 'N/A',
          customer_phone: bill.customer_phone || 'N/A',
          total_bills: 0,
          total_spent: 0,
          last_visit: convertToIST(bill.created_at),
          customer_type: 'named',
          bills: []
        };
      }
      
      customerMap[key].total_bills += 1;
      customerMap[key].total_spent += Number(bill.total || 0);
      customerMap[key].bills.push({
        bill_id: bill.id,
        total: Number(bill.total || 0),
        created_at: convertToIST(bill.created_at),
        payment_method: bill.payment_method || 'cash'
      });
      
      // Update last visit if this bill is more recent
      if (new Date(bill.created_at) > new Date(customerMap[key].last_visit)) {
        customerMap[key].last_visit = convertToIST(bill.created_at);
      }
    });
    
    // Process anonymous customers - group by date (daily)
    if (anonymousBills.length > 0) {
      console.log('Processing', anonymousBills.length, 'anonymous bills');
      const anonymousGroups = {};
      
      anonymousBills.forEach(bill => {
        // Convert to IST for date grouping
        const istDate = dayjs.utc(bill.created_at).tz('Asia/Kolkata');
        const date = istDate.format('YYYY-MM-DD'); // Get just the date part in IST
        console.log('Processing anonymous bill:', bill.id, 'for IST date:', date);
        
        if (!anonymousGroups[date]) {
          anonymousGroups[date] = {
            customer_name: `Anonymous (${date})`,
            customer_phone: 'Anonymous',
            total_bills: 0,
            total_spent: 0,
            last_visit: convertToIST(bill.created_at),
            customer_type: 'anonymous',
            bills: []
          };
        }
        
        anonymousGroups[date].total_bills += 1;
        anonymousGroups[date].total_spent += Number(bill.total || 0);
        anonymousGroups[date].bills.push({
          bill_id: bill.id,
          total: Number(bill.total || 0),
          created_at: convertToIST(bill.created_at),
          payment_method: bill.payment_method || 'cash'
        });
        
        // Update last visit if this bill is more recent (compare IST times)
        if (new Date(convertToIST(bill.created_at)) > new Date(anonymousGroups[date].last_visit)) {
          anonymousGroups[date].last_visit = convertToIST(bill.created_at);
        }
      });
      
      console.log('Anonymous groups created:', Object.keys(anonymousGroups));
      
      // Add anonymous groups to customer map
      Object.keys(anonymousGroups).forEach(date => {
        customerMap[`anonymous_${date}`] = anonymousGroups[date];
      });
    } else {
      console.log('No anonymous bills found');
    }
    
    const customers = Object.values(customerMap);
    console.log('Final customers to return:', customers.length);
    
    res.json(customers);
    
  } catch (e) {
    console.error('Error in customer route:', e.message);
    console.error('Stack:', e.stack);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;