const { supabase } = require('../db/setup');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

async function create({ vendor_id, amount, payment_mode, reference_number, transaction_id, notes, payment_date }) {
  const paymentData = {
    vendor_id,
    amount: Number(amount),
    payment_mode,
    reference_number: reference_number || null,
    transaction_id: transaction_id || null,
    notes: notes || null,
    payment_date: payment_date || new Date().toISOString()
  };

  const { data: payment, error } = await supabase
    .from('vendor_payments')
    .insert([paymentData])
    .select()
    .single();
  
  if (error) throw new Error(error.message || JSON.stringify(error));
  return payment;
}

async function getByVendor(vendorId) {
  const { data, error } = await supabase
    .from('vendor_payments')
    .select('*')
    .eq('vendor_id', vendorId)
    .order('payment_date', { ascending: false });
  
  if (error) throw new Error(error.message || JSON.stringify(error));
  
  // Convert UTC → IST and format
  return data.map(p => ({
    ...p,
    payment_date: dayjs.utc(p.payment_date).tz('Asia/Kolkata').format('YYYY-MM-DD'),
  }));
}

async function getAll() {
  const { data, error } = await supabase
    .from('vendor_payments')
    .select('*, vendors(name)')
    .order('payment_date', { ascending: false });
  
  if (error) throw new Error(error.message || JSON.stringify(error));
  
  // Convert UTC → IST and format
  return data.map(p => ({
    ...p,
    payment_date: dayjs.utc(p.payment_date).tz('Asia/Kolkata').format('YYYY-MM-DD'),
  }));
}

async function remove(id) {
  const { error } = await supabase
    .from('vendor_payments')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message || JSON.stringify(error));
  return true;
}

async function getVendorBalance(vendorId) {
  // Get total purchases for vendor
  const { data: purchases, error: purchaseError } = await supabase
    .from('purchases')
    .select('quantity, price')
    .eq('vendor_id', vendorId);
  
  if (purchaseError) throw new Error(purchaseError.message);
  
  const totalPurchases = purchases.reduce((sum, p) => sum + (p.quantity * p.price), 0);
  
  // Get total payments for vendor
  const { data: payments, error: paymentError } = await supabase
    .from('vendor_payments')
    .select('amount')
    .eq('vendor_id', vendorId);
  
  if (paymentError) throw new Error(paymentError.message);
  
  const totalPayments = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  
  const balance = totalPurchases - totalPayments;
  
  return {
    totalPurchases,
    totalPayments,
    outstandingBalance: balance,
    status: balance > 0 ? 'due' : balance < 0 ? 'advance' : 'settled'
  };
}

module.exports = { create, getByVendor, getAll, remove, getVendorBalance };