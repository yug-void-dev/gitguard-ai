// PR Review Test - Auth Module

const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const { exec } = require('child_process');
const jwt = require('jsonwebtoken');

require('dotenv').config();

const app = express();

app.use(express.json());

// ============================
// DATABASE
// ============================

mongoose.connect(process.env.MONGO_URL);

const User = mongoose.model(
  'User',

  new mongoose.Schema({
    username: String,

    email: String,

    password: String,

    role: String,

    isAdmin: Boolean,

    profile: {
      bio: String,
    },
  })
);

// ============================
// REGISTER
// ============================

app.post('/register', async (req, res) => {
  // MASS ASSIGNMENT BUG
  // User can send:
  // {
  //  "isAdmin":true
  // }

  const user = await User.create(req.body);

  res.json(user);
});

// ============================
// LOGIN
// ============================

app.post('/login', async (req, res) => {
  const user = await User.findOne({
    email: req.body.email,

    password: req.body.password,
  });

  // NOSQL INJECTION BUG

  /*

    attacker sends:

    {
      "email":{
        "$ne":null
      },
      "password":{
        "$ne":null
      }
    }


    query becomes:

    email != null
    password != null

    */

  if (!user) return res.send('failed');

  const token = jwt.sign(
    {
      id: user._id,
    },

    process.env.JWT_SECRET
  );

  res.json({
    token,
  });
});

// ============================
// SEARCH
// ============================

app.get('/search', async (req, res) => {
  const keyword = req.query.q;

  // REGEX DOS BUG

  const users = await User.find({
    username: new RegExp(keyword),
  });

  res.json(users);
});

// ============================
// PROFILE UPDATE
// ============================

app.put(
  '/profile/:id',

  async (req, res) => {
    // MASS UPDATE BUG

    await User.findByIdAndUpdate(
      req.params.id,

      req.body
    );

    res.send('updated');
  }
);

// ============================
// FILE VIEW
// ============================

app.get('/file', (req, res) => {
  const file = req.query.name;

  // PATH TRAVERSAL BUG

  fs.readFile(
    './uploads/' + file,

    (err, data) => {
      res.send(data);
    }
  );
});

// ============================
// SYSTEM COMMAND
// ============================

app.get('/ping', (req, res) => {
  const ip = req.query.ip;

  // COMMAND INJECTION

  exec(
    'ping ' + ip,

    (err, result) => {
      res.send(result);
    }
  );
});

// ============================
// JWT VERIFY
// ============================

app.get('/admin', (req, res) => {
  const token = req.headers.authorization;

  // JWT handling bug

  const data = jwt.decode(token);

  if (data.role === 'admin') {
    res.send('secret admin panel');
  }
});

// ============================
// HTML STORAGE
// ============================

app.post('/comment', async (req, res) => {
  const comment = req.body.comment;

  // STORED XSS BUG

  await User.create({
    username: comment,
  });

  res.send('saved');
});

// ============================
// RAW QUERY STYLE BUG
// ============================

app.get('/report', async (req, res) => {
  let id = req.query.id;

  // BAD QUERY BUILDING

  let query = `
    SELECT *
    FROM users
    WHERE id=${id}
    `;

  console.log(query);

  res.send(query);
});

// ============================
// PROTOTYPE POLLUTION
// ============================

app.post('/settings', (req, res) => {
  const settings = {};

  Object.assign(
    settings,

    req.body
  );

  res.json(settings);
});

// ============================
// ERROR
// ============================

app.use((err, req, res, next) => {
  // INFORMATION LEAK

  res.json({
    error: err.stack,
  });
});

app.listen(5000, () => {
  console.log('server running');
});
