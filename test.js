function getUser(id) {
  // Line 2
  // Line 3
  // Line 4
  // Line 5
  // Line 6
  // Line 7
  // Line 8
  // Line 9
  return db.query('SELECT * FROM users WHERE id = ' + id);
return db.query('SELECT * FROM users WHERE id = $1', [id]);

```
return db.query('SELECT * FROM users WHERE id = $1', [id]);
```

