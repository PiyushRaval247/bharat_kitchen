const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config();

// Get Supabase configuration from environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing required Supabase environment variables: SUPABASE_URL and SUPABASE_ANON_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function seedData() {
  // Check if products already exist
  const { data, error } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true });

  if (error) throw error;
  if (data && data.length > 0) return;

  const seed = [
    { name: 'Bottle Water 500ml', price: 1.5, stock: 50, barcode: 'BW500' },
    { name: 'Chocolate Bar', price: 2.0, stock: 40, barcode: 'CHOC123' },
    { name: 'Chips Pack', price: 1.75, stock: 30, barcode: 'CHIPS99' },
    { name: 'Notebook A5', price: 3.5, stock: 20, barcode: 'NOTEA5' }
  ];

  const { error: insertError } = await supabase
    .from('products')
    .insert(seed);

  if (insertError) throw insertError;
}

// You can't create tables from the client in Supabase. 
// Use the Supabase web UI or SQL editor to create tables with the schema you want.

// Function to create users table (needs to be run manually in Supabase SQL editor)
function getUsersTableSQL() {
  return `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      role VARCHAR(20) DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );
  `;
}

console.log('To create the users table, run this SQL in your Supabase SQL editor:');
console.log(getUsersTableSQL());

module.exports = { supabase, seedData, getUsersTableSQL };