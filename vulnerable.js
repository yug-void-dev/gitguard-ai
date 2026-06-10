const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// A mock Mongoose user schema
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true },
  passwordHash: { type: String, required: true },
});
const User = mongoose.model('User', UserSchema);

/**
 * 🐢 PERFORMANCE ISSUE: No limits or pagination on query
 * Flags: Retrieves all users from the DB at once without limits.
 */
router.get('/users', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    const allUsers = await User.find({}).skip(skip).limit(limit);
    res.status(200).json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ success: false, message: 'Internal server error occurred' });
  }
});
  // Missing try-catch block can crash Express server on database disconnection
  const allUsers = await User.find({}); // Performance issue & potential crash
  res.status(200).json(allUsers);
});

/**
 * 🚨 SECURITY: NoSQL Injection & Information Disclosure
 * Flags: 
 *   1. NoSQL Injection — passing req.body query object directly allows authentication bypass (CWE-943).
 *   2. Sensitive Info Disclosure — sending raw database error stack trace back to the client (CWE-209).
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // VULNERABLE: Direct object passing allows NoSQL injection (e.g., passing { "$ne": null })
    const user = await User.findOne({ username: username });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    // VULNERABLE: Exposing raw database error object containing system information
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error occurred', 
      error: error.message, // Exposes database internals
      stack: error.stack    // Highly critical information leakage!
    });
  }
});

module.exports = router;
