# User Management Setup

This document explains how to set up user management in the Mall POS system.

## Prerequisites

1. You need a Supabase account and project
2. You should have the Supabase URL and anon key configured in your `.env` file

## Setting up the Users Table

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Run the following SQL to create the users table:

```sql
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Features Implemented

1. **User Management Page**: Admins can now manage users and change passwords
2. **Password Change**: Admins can change their own password and employee passwords
3. **Authentication**: Login now works with the database instead of hardcoded credentials
4. **User Roles**: Proper role-based access control

## How to Use

1. An administrator needs to create user accounts first
2. Log in as an admin
3. Navigate to the "Users" section in the navigation bar
4. Select a user from the dropdown
5. Enter a new password and confirm it
6. Click "Change Password"

## Security Notes

This implementation is for demonstration purposes. In a production environment, you should:

1. Hash passwords before storing them in the database
2. Implement proper session management
3. Add input validation and sanitization
4. Use HTTPS for all communications
5. Implement rate limiting for login attempts