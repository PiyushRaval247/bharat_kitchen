const { supabase } = require('../db/setup');

async function getAll() {
  const { data, error } = await supabase.from('vendors').select('*').order('name');
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data || [];
}

async function create(vendorData) {
  // Handle both old format (just name) and new format (full object)
  const data = typeof vendorData === 'string' ? { name: vendorData } : vendorData;
  
  const { data: vendor, error } = await supabase.from('vendors').insert([data]).select().single();
  if (error) throw new Error(error.message || JSON.stringify(error));
  return vendor;
}

async function update(id, vendorData) {
  const { data, error } = await supabase.from('vendors').update(vendorData).eq('id', id).select().single();
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data;
}

async function getById(id) {
  const { data, error } = await supabase.from('vendors').select('*').eq('id', id).single();
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data;
}

async function remove(id) {
  const { error } = await supabase.from('vendors').delete().eq('id', id);
  if (error) throw new Error(error.message || JSON.stringify(error));
  return true;
}

module.exports = { getAll, create, update, getById, remove };
