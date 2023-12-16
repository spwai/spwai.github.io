const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Your middleware
app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  console.log(`Incoming request from IP: ${ip}`);

  // Specify the full path of the file on your desktop
  const filePath = path.join('C:\\Users\\asabe\\Desktop\\spwai', 'ip_log.txt');

  // Log to console
  console.log(`Attempting to log IP to ${filePath}`);

  // Log to file
  fs.appendFile(filePath, `${ip}\n`, (err) => {
    if (err) {
      console.error(`Error logging IP: ${err.message}`);
    } else {
      console.log(`IP logged to ${filePath}`);
    }
  });

  next();
});

// Your routes
app.get('/', (req, res) => {
  res.send('Hello, World!');
});

try {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
} catch (error) {
  console.error(`Error starting the server: ${error.message}`);
}
