const mysql = require('mysql');

// ISSUE 1: Hardcoded credentials
const connection = mysql.createConnection({
  host: 'localhost',
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
