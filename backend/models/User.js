const { supabase } = require('../db/setup');

class User {
  static async create(username, password, role = 'employee') {
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          username,
          password, // In a real app, this should be hashed
          role,
          created_at: new Date(),
          updated_at: new Date()
        }
      ])
      .select();

    if (error) throw error;
    return data[0];
  }

  static async findByUsername(username) {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    if (error) throw error;
    return data;
  }

  static async findAll() {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('username');

    if (error) throw error;
    return data;
  }

  static async updatePassword(username, newPassword) {
    const { data, error } = await supabase
      .from('users')
      .update({ 
        password: newPassword,
        updated_at: new Date()
      })
      .eq('username', username)
      .select();

    if (error) throw error;
    return data[0];
  }

  static async updateRole(username, newRole) {
    const { data, error } = await supabase
      .from('users')
      .update({ 
        role: newRole,
        updated_at: new Date()
      })
      .eq('username', username)
      .select();

    if (error) throw error;
    return data[0];
  }
}

module.exports = User;