const express = require('express');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const cors = require('cors');
const net = require('net');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');

dotenv.config();

const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Function to send a test message to C++ server
function sendTestMessageToCppServer() {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.connect(5566, '127.0.0.1', () => {
      console.log('Connected to C++ server');
      const testMessage = 'action:test\nuser_id:test_user\nvideo_id:test_video\n';
      client.write(testMessage);
      console.log('Sent test message:', testMessage);
    });

    client.on('data', (data) => {
      console.log('Received response from C++ server:', data.toString());
      client.destroy();
      resolve(data.toString());
    });

    client.on('close', () => {
      console.log('Connection to C++ server closed');
    });

    client.on('error', (err) => {
      console.error('Error connecting to C++ server:', err.message);
      reject(err);
    });

    // Add a timeout
    client.setTimeout(5000, () => {
      console.error('Connection to C++ server timed out');
      client.destroy();
      reject(new Error('Connection timed out'));
    });
  });
}

// Routes
app.use('/api', userRoutes);

// Redirect the root URL to localhost:3000
app.get('/', (req, res) => {
  res.redirect('http://localhost:3000');
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  
  // Try to connect to C++ server
  try {
    const response = await sendTestMessageToCppServer();
    console.log('Test message sent successfully. C++ server is working.');
  } catch (error) {
    console.error('Failed to connect to C++ server:', error.message);
  }
});