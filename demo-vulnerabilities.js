/**
 * demo-vulnerabilities.js
 * GitGuard AI Demo — Intentional security issues for live PR demo
 *
 * This file contains real-world security anti-patterns:
 * 1. SQL Injection
 * 2. Hardcoded credentials
 * 3. Command injection
 * 4. Insecure JWT (no expiry)
 * 5. eval() usage
 * 6. Path traversal
 */

Use environment variables or a secure secrets management system

```
const DB_CONFIG = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};
```
const DB_CONFIG = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
};
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// ❌ VULNERABILITY 1: Hardcoded credentials (CWE-798)
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: 'Admin@123456',         // hardcoded password
  database: 'production_db',
};

const API_SECRET = 'super_secret_key_do_not_share'; // hardcoded JWT secret

// ❌ VULNERABILITY 2: SQL Injection (CWE-89)
async function getUserByUsername(username) {
  const connection = mysql.createConnection(DB_CONFIG);
  // Direct string concatenation — classic SQL injection
  const query = `SELECT * FROM users WHERE username = '${username}'`;
  return new Promise((resolve, reject) => {
    connection.query(query, (err, results) => {
      if (err) reject(err);
      resolve(results);
    });
  });
}

// ❌ VULNERABILITY 3: Command Injection (CWE-78)
async function pingHost(hostname) {
  // User-controlled input directly passed to shell
  exec(`ping -c 4 ${hostname}`, (error, stdout) => {
    console.log(stdout);
  });
}

// ❌ VULNERABILITY 4: Insecure JWT — no expiry (CWE-613)
function generateToken(userId, role) {
  return jwt.sign(
    { userId, role },
    API_SECRET,
    // Missing: expiresIn — token never expires!
  );
}

// ❌ VULNERABILITY 5: eval() with user input (CWE-95)
function calculateUserFormula(expression) {
  // Never use eval() with user-supplied data
  return eval(expression);
}

// ❌ VULNERABILITY 6: Path Traversal (CWE-22)
function readUserFile(filename) {
  // No sanitization — attacker can use ../../etc/passwd
  const filePath = path.join('/uploads', filename);
  return fs.readFileSync(filePath, 'utf8');
}

// ❌ VULNERABILITY 7: No input validation on user registration
async function registerUser(req, res) {
  const { username, email, password } = req.body;
  // No validation, no password hashing, direct DB insert
  const query = `INSERT INTO users (username, email, password) VALUES ('${username}', '${email}', '${password}')`;
  // ... execute query directly
}

module.exports = {
  getUserByUsername,
  pingHost,
  generateToken,
  calculateUserFormula,
  readUserFile,
  registerUser,
};
