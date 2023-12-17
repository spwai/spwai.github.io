const express = require('express');
const fs = require('fs');
const app = express();
const port = 3000;

// Middleware to log IP addresses
app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const timestamp = new Date().toISOString();
  const logEntry = `${timestamp} - ${ip}\n`;

  // Log to a file (append)
  fs.appendFile('ip_log.txt', logEntry, (err) => {
    if (err) {
      console.error('Error writing to log file:', err);
    }
  });

  next();
});

// Serve your website content
app.get('/', (req, res) => {
  res.send('Welcome to your website!');
});

// Start the server
app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});
