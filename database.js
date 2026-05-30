const mysql = require('mysql');

// ISSUE 1: Hardcoded credentials
const connection = mysql.createConnection({
Use environment variables or a secure secrets manager

```
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
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
