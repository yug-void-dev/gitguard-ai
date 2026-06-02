const mysql = require('mysql');

// ISSUE 1: Hardcoded credentials
const connection = mysql.createConnection({
Use environment variables or a secure secrets manager

```
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
Use parameterized queries

```
const query = "SELECT * FROM users WHERE id = ?";
connection.query(query, [userId], (err, results) => {
  if (err) throw err;
  console.log(results);
});
```
});
```
  user: 'root',
  password: 'super_secret_password_123', 
});

function getUserData(userId) {
  // ISSUE 2: SQL Injection vulnerability
  const query = "SELECT * FROM users WHERE id = '" + userId + "'";
  
  connection.query(query, (err, results) => {
    if (err) throw err;
    console.log(results);
  });
}
