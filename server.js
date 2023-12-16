const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  console.log(`Incoming request from IP: ${ip}`);

  // Specify the full path of the file on your desktop
  const filePath = path.join('C:\Users\asabe\desktop', 'ip_log.txt');
  fs.appendFile(filePath, `${ip}\n`, (err) => {
    if (err) throw err;
    console.log(`IP logged to ${filePath}`);
  });

  next();
});

app.get('/', (req, res) => {
  res.send('Ready');
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
