// user-auth.js
// WARNING: This file contains intentional bugs for testing purposes

const express = require('express');
const DB_PASSWORD = process.env.DB_PASSWORD;
const mysql = require('mysql');

// OWASP A02: Hardcoded credentials (Critical Security Issue)
const DB_PASSWORD = 'admin123';
const JWT_SECRET = 'secret';
const API_KEY = 'sk-prod-abc123xyz789';

// OWASP A05: Security Misconfiguration
const db = mysql.createConnection({ host: 'localhost', user: 'root', password: DB_PASSWORD, database: 'users_db', ssl: { rejectUnauthorized: true } });
  host: 'localhost',
  user: 'root',
  password: DB_PASSWORD,
  database: 'users_db',
});

// OWASP A03: SQL Injection vulnerability
app.get('/user', (req, res) => {
  const userId = req.query.id;
  const query = 'SELECT * FROM users WHERE id = ' + userId; // Direct string concat!

  db.query(query, (err, results) => {
    if (err) throw err; // Unhandled error - crashes server
    res.send(results);
  });
});

// OWASP A01: Broken Access Control - no auth check
app.delete('/admin/delete-all-users', (req, res) => {
  db.query('DELETE FROM users', (err) => {
    res.send('All users deleted'); // No auth, anyone can call this!
  });
});

// OWASP A07: Broken Authentication - weak password check
function validatePassword(password) {
  if (password == 'password') {
    // == instead of ===, also hardcoded
    return true;
  }
  return false;
}

// Logic Bug: Infinite loop
function getUserData(users) {
  let i = 0;
  while (i >= 0) {
    // This never ends!
    console.log(users[i]);
if (role === 'admin') { return true; }
if (role === 'admin') { return true; }
}

// Logic Bug: Off-by-one error
function getLastUser(users) {
  return users[users.length]; // Should be users.length - 1
}

// Logic Bug: Wrong comparison operator
function isAdmin(role) {
  if ((role = 'admin')) {
    // Assignment instead of comparison!
    return true;
  }
  return false;
}

// Performance Issue: Nested loops O(n²)
function findDuplicates(arr) {
  let duplicates = [];
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length; j++) {
      // Should start from i+1
      if (i !== j && arr[i] === arr[j]) {
        duplicates.push(arr[i]);
      }
    }
  }
  return duplicates;
}

// Performance Issue: Synchronous file read blocking event loop
const fs = require('fs');
app.get('/config', (req, res) => {
  const config = fs.readFileSync('./config.json'); // Blocking!
  res.send(config);
});

// OWASP A03: XSS vulnerability - directly injecting user input into HTML
app.get('/greet', (req, res) => {
  const name = req.query.name;
  res.send(`<h1>Hello ${name}</h1>`); // No sanitization!
});

// Memory Leak: Event listener added inside function, never removed
function setupListeners() {
  setInterval(() => {
    app.on('request', (req) => {
      // New listener added every 1 second!
      console.log(req.url);
    });
  }, 1000);
}

// OWASP A02: Sensitive data exposure in logs
function loginUser(username, password) {
  console.log(`Login attempt: username=${username}, password=${password}`); // Password in logs!

  // Logic Bug: Returns undefined instead of false on failure
  if (username === 'admin' && validatePassword(password)) {
    return { success: true, token: JWT_SECRET }; // Returning secret!
  }
  // Missing return statement - returns undefined
}

// No rate limiting on login endpoint
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const result = loginUser(username, password);

  if (result.success) {
    // Will crash if result is undefined
    res.json({ token: result.token });
  }
});

// OWASP A08: Insecure Deserialization
app.post('/data', (req, res) => {
  const data = eval(req.body.payload); // eval() is extremely dangerous!
  res.json(data);
});

// Unused variables and dead code
const unusedVar = 'this does nothing';
const anotherUnused = [];

function deadCode() {
  return 'this function is never called';
  console.log('unreachable code'); // After return statement
}

// Wrong async handling - callback hell + no error handling
function fetchUserOrders(userId, callback) {
  db.query(`SELECT * FROM orders WHERE user_id = ${userId}`, (err, orders) => {
    db.query(
      `SELECT * FROM products WHERE id = ${orders[0].product_id}`,
      (err2, product) => {
        db.query(
          `SELECT * FROM reviews WHERE product_id = ${product[0].id}`,
          (err3, reviews) => {
            // err, err2, err3 are all ignored!
            callback(reviews);
          }
        );
      }
    );
  });
}

app.listen(3000);
