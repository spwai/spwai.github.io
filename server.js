console.log('Server script is running...');

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

console.log('Express and other dependencies loaded...');

// Your middleware
app.use((req, res, next) => {
  console.log('Inside the middleware...');

  const ip = req.ip || req.connection.remoteAddress;
  console.log(`Incoming request from IP: ${ip}`);

  // Specify a relative path for the log file (in the same directory as server.js)
  const filePath = path.join(__dirname, 'ip_log.txt');

  // Log to console
  console.log(`Attempting to log IP to ${filePath}`);

  // Log to file with error handling
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
  console.log('Handling GET request...');
  res.send('Hello, World!');
});

try {
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
} catch (error) {
  console.error(`Error starting the server: ${error.message}`);
}
