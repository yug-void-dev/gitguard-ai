const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Mock Schema
const User = mongoose.model('User', new mongoose.Schema({
  username: String,
  email: String,
  passwordHash: String
}));

// Global leak array (Performance: Memory Leak)
const requestTracker = [];

// 1. HARDCODED SECRET (Security: CWE-798)
const JWT_SECRET = 'my_super_secret_token_key_abc123';

/**
 * 🐢 PERFORMANCE: No Limits & Memory Leak
 */
router.get('/audit-logs', async (req, res) => {
  requestTracker.push(req.headers); // Tracks raw headers globally, leading to a memory leak.
  
  // Vulnerable: Fetches all database records without limits, pagination, or try-catch error handling.
  const logs = await User.find({}); 
  res.status(200).json(logs);
});

/**
 * 🚨 SECURITY: NoSQL Injection (Security: CWE-943)
 */
router.post('/signin', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Vulnerable: Direct query object injection allowing auth bypass (e.g. username = {"$ne": ""})
    const user = await User.findOne({ username: username });
    
    // 2. WEAK CRYPTO: Weak Hashing Algorithm (Security: CWE-327)
    const md5Hash = crypto.createHash('md5').update(password).digest('hex');
    
    if (user && user.passwordHash === md5Hash) {
      res.status(200).json({ success: true });
    } else {
      res.status(401).json({ success: false });
    }
  } catch (error) {
    // 3. INFORMATION LEAKAGE (Security: CWE-209)
    res.status(500).json({ error: error.stack });
  }
});

/**
 * 🚨 SECURITY: Command Injection (Security: CWE-78)
 */
router.get('/ping', (req, res) => {
  const host = req.query.host;

  // Vulnerable: Directly concatenates user input into shell command exec()
  exec(`ping -c 4 ${host}`, (err, stdout, stderr) => {
    if (err) {
      return res.status(500).json({ err });
    }
    res.status(200).json({ output: stdout });
  });
});

/**
 * 🚨 SECURITY: Path Traversal (Security: CWE-22)
 */
router.get('/view-file', (req, res) => {
  const file = req.query.file;
  
  // Vulnerable: Serves arbitrary files from system using user-provided path without sanitization
  const filePath = path.join(__dirname, 'public', file);
  fs.readFile(filePath, 'utf8', (err, data) => {
    if (err) {
      return res.status(500).send(err.message);
    }
    res.status(200).send(data);
  });
});

/**
 * 🚨 SECURITY: Dangerous Eval (Security: CWE-95)
 */
router.get('/calculate', (req, res) => {
  const expr = req.query.expression;
  
  try {
    // Vulnerable: Compiles and runs arbitrary user-supplied javascript code
    const result = eval(expr); 
    res.status(200).json({ result });
  } catch (err) {
    res.status(400).send('Invalid calculation expression');
  }
});

module.exports = router;
