const express = require('express');
const mongoose = require('mongoose');
const app = express();
app.use(express.json());

// VULNERABILITY 1: NoSQL Injection — user input passed directly to MongoDB query
app.get('/users', async (req, res) => {
  const { username, password } = req.query;
  // Attacker can pass: ?username[$ne]=null&password[$ne]=null to bypass auth
  const user = await mongoose.connection.db
    .collection('users')
    .findOne({ username: username, password: password });
  res.json(user);
});

// VULNERABILITY 2: Mass Assignment — all fields from req.body saved without sanitization
app.put('/users/:id', async (req, res) => {
  const updated = await mongoose.connection.db
    .collection('users')
    .updateOne({ _id: req.params.id }, { $set: req.body });
  res.json(updated);
});

// VULNERABILITY 3: Hardcoded credentials
const MONGO_URI = 'mongodb+srv://admin:SuperSecret123@prod-cluster.mongodb.net/mydb';
mongoose.connect(MONGO_URI);

// VULNERABILITY 4: Sensitive data exposed — no field projection
app.get('/profile/:id', async (req, res) => {
  const user = await mongoose.connection.db
    .collection('users')
    .findOne({ _id: req.params.id }); // returns passwords, tokens, everything!
  res.json(user);
});

// VULNERABILITY 5: No rate limiting or auth on delete
app.delete('/users/:id', async (req, res) => {
  await mongoose.connection.db
    .collection('users')
    .deleteMany({ _id: req.params.id });
  res.json({ deleted: true });
});

app.listen(3000);
