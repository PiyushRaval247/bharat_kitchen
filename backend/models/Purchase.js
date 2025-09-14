const { supabase } = require('../db/setup');
const Product = require('./Product');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');

dayjs.extend(utc);
dayjs.extend(timezone);

async function create({ vendor_id, product_id, quantity, price }) {
  // Create individual purchase record for each transaction
  const now = new Date();
  
  // Ensure we have a unique timestamp for each purchase
  const uniqueTimestamp = new Date(now.getTime() + Math.random() * 100).toISOString();
  
  const purchaseData = {
    vendor_id,
    product_id,
    quantity,
    price,
    purchased_at: uniqueTimestamp
  };
  
  console.log('Creating NEW purchase record (no aggregation):', purchaseData);
  
  const { data: purchase, error } = await supabase
    .from('purchases')
    .insert([purchaseData])
    .select()
    .single();
  
  if (error) {
    console.error('Purchase creation error:', error);
    throw new Error(error.message || JSON.stringify(error));
  }
  
  console.log('SUCCESS: Individual purchase record created:', purchase);

  // Update product stock
  const product = await Product.getById(product_id);
  if (!product) throw new Error('Product not found');
  
  const newStock = Number(product.stock) + Number(quantity);
  console.log(`Updating product ${product_id} stock: ${product.stock} + ${quantity} = ${newStock}`);
  
  await Product.update(product_id, { stock: newStock });

  return purchase;
}

/**
 * Retrieves all purchases, including vendor and product details.
 *
 * @return {Promise<Array>} An array of purchase objects.
 * @throws {Error} If there was an error retrieving the data.
 */
async function getAll() {
  const { data, error } = await supabase
    .from('purchases')
    .select('*, vendors(name), products(name, barcode)')
    .order('purchased_at', { ascending: false });
  if (error) throw new Error(error.message || JSON.stringify(error));

  // Convert UTC → IST and format
  return data.map(p => ({
    ...p,
    purchased_at: dayjs.utc(p.purchased_at).tz('Asia/Kolkata').format('YYYY-MM-DD'),
  }));
}
async function remove(id) {
  const { error } = await supabase
    .from('purchases')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message || JSON.stringify(error));
  return true;
}

module.exports = { create, getAll,remove };
