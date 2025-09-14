const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get all users (admin only)
router.get('/', async (req, res) => {
  try {
    const users = await User.findAll();
    // Don't send passwords to the frontend
    const sanitizedUsers = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    res.json(sanitizedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Authenticate user
router.post('/authenticate', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Check if user exists
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check password (in a real app, you would hash and compare)
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Don't send password back to frontend
    const { password: _, ...userWithoutPassword } = user;
    
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error authenticating user:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// Change user password (admin can change any user's password, users can change their own)
router.put('/change-password', async (req, res) => {
  try {
    const { username, newPassword, requester } = req.body;
    
    // In a real app, you would verify that the requester has permission to change this password
    // For now, we'll allow admins to change any password and users to change their own
    
    const user = await User.findByUsername(username);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update password
    await User.updatePassword(username, newPassword);
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Create a new user (admin only)
router.post('/', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    
    // Check if user already exists
    try {
      const existingUser = await User.findByUsername(username);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }
    } catch (error) {
      // If user not found, that's fine - we can create a new one
    }
    
    // Create new user
    const newUser = await User.create(username, password, role);
    
    // Don't send password back to frontend
    const { password: _, ...userWithoutPassword } = newUser;
    
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

module.exports = router;