const express = require('express');
const fs = require('fs');

const app = express();
const PORT = 3000;

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  console.log(`Incoming request from IP: ${ip}`);

  // Log IP to a text file
  fs.appendFile('ip_log.txt', `${ip}\n`, (err) => {
    if (err) throw err;
    console.log('IP logged to ip_log.txt');
  });

  next();
});

app.get('/', (req, res) => {
  res.send('Hello, World!');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
