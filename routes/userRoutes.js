const express = require('express');
const User = require('../models/User');
const jwt = require('jsonwebtoken');
const router = express.Router();
const net = require('net');
const mongoose = require('mongoose');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    console.log('Request denied: Missing token');
    return res.status(401).json({ message: 'Access token is missing or invalid' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      console.log('Request denied: Invalid token');
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    console.log(`Request by user: ${user.userId}`);
    next();
  });
};

// Middleware to log requests
const logRequest = (req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
};

// Apply the logRequest middleware to all routes
router.use(logRequest);

// Function to send view data to C++ server
function sendViewToRecommendationServer(userId, videoId) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    client.connect(5566, '127.0.0.1', () => {
      const request = `action:view\nuser_id:${userId}\nvideo_id:${videoId}\n`;
      client.write(request);
      console.log('Sent view data to recommendation server:', request);
    });

    let responseData = '';

    client.on('data', (chunk) => {
      responseData += chunk.toString();
      if (responseData.endsWith('\n')) {
        console.log('Received response from recommendation server:', responseData);
        const response = responseData.split('\n').reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) acc[key.trim()] = value.trim();
          return acc;
        }, {});
        client.destroy();
        resolve(response);
      }
    });

    client.on('close', () => {
      console.log('Connection to recommendation server closed');
      if (!responseData) {
        reject(new Error('Connection closed without receiving data'));
      }
    });

    client.on('error', (err) => {
      console.error('Error connecting to recommendation server:', err.message);
      reject(err);
    });

    // Add a timeout
    client.setTimeout(5000, () => {
      console.error('Connection to recommendation server timed out');
      client.destroy();
      reject(new Error('Connection timed out'));
    });
  });
}
function getRecommendationsFromServer(userId) {
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    console.log('Attempting to connect to C++ server...');
    client.connect(5566, '127.0.0.1', () => {
      const request = `action:recommend\nuser_id:${userId}\n`;
      console.log('Connected to C++ server, sending request:', request);
      client.write(request);
    });

    let responseData = '';

    client.on('data', (chunk) => {
      console.log('Data received from C++ server:', chunk.toString());
      responseData += chunk.toString();
      if (responseData.endsWith('\n')) {
        console.log('Full response received from C++ server');
        const response = responseData.split('\n').reduce((acc, line) => {
          const [key, value] = line.split(':');
          if (key && value) acc[key.trim()] = value.trim();
          return acc;
        }, {});
        client.destroy();
        resolve(response.recommendations ? response.recommendations.split(',') : []);
      }
    });

    client.on('close', () => {
      console.log('Connection to C++ server closed');
      if (!responseData) {
        console.log('No data received before connection closed');
        reject(new Error('Connection closed without receiving data'));
      }
    });

    client.on('error', (err) => {
      console.error('Error connecting to C++ server:', err.message);
      reject(err);
    });

    client.setTimeout(10000, () => {
      console.error('Connection to C++ server timed out');
      client.destroy();
      reject(new Error('Connection timed out'));
    });
  });
}


// Get 20 videos (10 most viewed and 10 random)
router.get('/videos', authenticateToken, async (req, res) => {
  console.log(`User ${req.user.userId} requested videos`);
  try {
    // Fetch the top 10 most viewed videos
    const mostViewedVideos = await User.aggregate([
      { $unwind: "$videos" },
      { $sort: { "videos.views": -1 } },
      { $limit: 10 },
      { $group: { _id: "$_id", videos: { $push: "$videos" } } },
      { $project: { videos: { $slice: ["$videos", 10] } } }
    ]);

    // Extract the IDs of the most viewed videos
    const mostViewedVideoIds = mostViewedVideos.flatMap(user => user.videos.map(video => video._id));

    // Fetch 10 random videos that are not in the most viewed videos
    const randomVideos = await User.aggregate([
      { $unwind: "$videos" },
      { $match: { "videos._id": { $nin: mostViewedVideoIds } } },
      { $sample: { size: 10 } }
    ]);

    // Combine the most viewed videos and the random videos
    const videos = [...mostViewedVideos.flatMap(user => user.videos), ...randomVideos.map(doc => doc.videos)];
    console.log(videos);
    res.status(200).json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ message: 'Error fetching videos', error });
  }
});

router.get('/videos2', authenticateToken, async (req, res) => {
  console.log(`User ${req.user.userId} requested videos2`);
  try {
    // Fetch the top 10 most viewed videos with owner details
    const mostViewedVideos = await User.aggregate([
      { $unwind: "$videos" },
      { $sort: { "videos.views": -1 } },
      { $limit: 10 },
      { $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "ownerDetails"
      }},
      { $unwind: "$ownerDetails" },
      { $group: {
          _id: "$_id",
          videos: { $push: {
            _id: "$videos._id",
            title: "$videos.title",
            views: "$videos.views",
            url: "$videos.url",
            owner: "$ownerDetails"
          }}
      }},
      { $project: { videos: { $slice: ["$videos", 10] } } }
    ]);

    // Extract the IDs of the most viewed videos
    const mostViewedVideoIds = mostViewedVideos.flatMap(user => user.videos.map(video => video._id));

    // Fetch 10 random videos that are not in the most viewed videos with owner details
    const randomVideos = await User.aggregate([
      { $unwind: "$videos" },
      { $match: { "videos._id": { $nin: mostViewedVideoIds } } },
      { $sample: { size: 10 } },
      { $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "ownerDetails"
      }},
      { $unwind: "$ownerDetails" },
      { $project: {
          _id: 0,
          "videos._id": 1,
          "videos.title": 1,
          "videos.views": 1,
          "videos.url": 1,
          owner: "$ownerDetails"
      }}
    ]);

    // Combine the most viewed videos and the random videos
    const videos = [...mostViewedVideos.flatMap(user => user.videos), ...randomVideos.map(doc => doc.videos)];
    console.log(videos);  
    res.status(200).json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ message: 'Error fetching videos', error });
  }
});

// Create a new user
router.post('/users', async (req, res) => {
  console.log(`New user registration attempt: ${req.body.email}`);
  try {
    const { name, email, password, picture } = req.body;
    const user = new User({ name, email, password, picture });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === 11000) {
      return res.status(400).json({ message: 'Email already exists', error });
    }
    res.status(500).json({ message: 'Error creating user', error });
  }
});

// Get user by ID
router.get('/users/:id', async (req, res) => {
  console.log(`User details requested for ID: ${req.params.id}`);
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user', error });
  }
});

// Update user by ID
router.put('/users/:id', async (req, res) => {
  console.log(`User update attempt for ID: ${req.params.id}`);
  try {
    const { name, password, picture } = req.body;

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.name = name;
    user.password = password;
    user.picture = picture;

    await user.save();

    res.status(200).json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user', error });
  }
});

// Delete user by ID
router.delete('/users/:id', async (req, res) => {
  console.log(`User deletion attempt for ID: ${req.params.id}`);
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user', error });
  }
});

// Get videos for user by ID
router.get('/users/:id/videos', authenticateToken, async (req, res) => {
  console.log(`User ${req.user.userId} requested videos for user ID: ${req.params.id}`);
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.status(200).json(user.videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ message: 'Error fetching videos', error });
  }
});

// Add a video for user by ID
router.post('/users/:id/videos', authenticateToken, async (req, res) => {
  console.log(`User ${req.user.userId} attempted to add a video for user ID: ${req.params.id}`);
  try {
    const userId = req.params.id;
    
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { title, url, description } = req.body;
    const video = { title, url, description };
    user.videos.push(video);
    await user.save();
    res.status(201).json(user.videos[user.videos.length - 1]);
  } catch (error) {
    console.error('Error adding video:', error);
    res.status(500).json({ message: 'Error adding video', error });
  }
});

// Get video details for user by ID and video ID
router.get('/users/:id/videos/:pid', authenticateToken, async (req, res) => {
  console.log(`User ${req.user.userId} requested video details for user ID: ${req.params.id}, video ID: ${req.params.pid}`);
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const video = user.videos.id(req.params.pid);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    res.status(200).json(video);
  } catch (error) {
    console.error('Error fetching video details:', error);
    res.status(500).json({ message: 'Error fetching video details', error });
  }
});

// Increment video views and send data to C++ server
router.put('/users/:id/videos/:pid/increment-views', authenticateToken, async (req, res) => {
  console.log(`User ${req.user.userId} incremented views for user ID: ${req.params.id}, video ID: ${req.params.pid}`);
  try {
    const videoOwner = await User.findOne({ 'videos._id': req.params.pid });
    if (!videoOwner) {
      return res.status(404).json({ message: 'Video not found' });
    }

    const video = videoOwner.videos.id(req.params.pid);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    video.views = (video.views || 0) + 1;
    await videoOwner.save();

    // Send view data to C++ recommendation server
    try {
      const response = await sendViewToRecommendationServer(req.user.userId, req.params.pid);
      console.log('View data sent to recommendation server. Response:', response);
      
      if (response.status !== 'success') {
        console.warn('Unexpected response from recommendation server:', response);
      }
    } catch (error) {
      console.error('Error sending view data to recommendation server:', error.message);
    }

    res.status(200).json(video);
  } catch (error) {
    console.error('Error incrementing video views:', error);
    res.status(500).json({ message: 'Error incrementing video views', error: error.message });
  }
});

// Update video for user by ID and video ID
router.put('/users/:id/videos/:pid', authenticateToken, async (req, res) => {
  console.log(`User ${req.user.userId} attempted to update video for user ID: ${req.params.id}, video ID: ${req.params.pid}`);
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const video = user.videos.id(req.params.pid);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }
    video.title = req.body.title;
    video.url = req.body.url;
    await user.save();
    res.status(200).json(video);
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ message: 'Error updating video', error });
  }
});

// Delete video for user by ID and video ID
router.delete('/users/:id/videos/:pid', authenticateToken, async (req, res) => {
  console.log(`User ${req.user.userId} attempted to delete video for user ID: ${req.params.id}, video ID: ${req.params.pid}`);
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const video = user.videos.id(req.params.pid);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    user.videos.pull({ _id: req.params.pid });
    await user.save();

    res.status(200).json({ message: 'Video deleted successfully' });
  } catch (error) {
    console.error('Error deleting video:', error);
    res.status(500).json({ message: 'Error deleting video', error });
  }
});

// Function to generate JWT for a user
const generateToken = (user) => {
  return jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
};

// Generate JWT for user
router.get('/tokens', async (req, res) => {
  console.log(`Token generation requested for user ID: ${req.params.id}`);
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const token = generateToken(user);

    res.status(200).json({ token });
  } catch (error) {
    console.error('Error generating JWT:', error);
    res.status(500).json({ message: 'Error generating JWT', error });
  }
});

router.post('/users/login', async (req, res) => {
  console.log(`Login attempt for email: ${req.body.email}`);
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.password !== password) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    const token = generateToken(user);

    res.status(200).json({ message: 'Login successful', token, userId: user._id });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ message: 'Error logging in user', error });
  }
});
// New route to get video recommendations
router.get('/recommendations', authenticateToken, async (req, res) => {
  console.log(`User ${req.user.userId} requested video recommendations`);
  try {
    const recommendedVideoIds = await getRecommendationsFromServer(req.user.userId);
    console.log('Recommended video IDs:', recommendedVideoIds);

    // Fetch video details for recommended videos
    const recommendedVideos = await User.aggregate([
      { $unwind: "$videos" },
      { $match: { "videos._id": { $in: recommendedVideoIds.map(id => new mongoose.Types.ObjectId(id)) } } },
      { $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "ownerDetails"
      }},
      { $unwind: "$ownerDetails" },
      { $group: {
          _id: "$_id",
          videos: { $push: {
            _id: "$videos._id",
            title: "$videos.title",
            views: "$videos.views",
            url: "$videos.url",
            owner: "$ownerDetails"
          }}
      }},
      { $project: { videos: 1 } }
    ]);

    // Flatten the result to match the videos2 structure
    const videos = recommendedVideos.flatMap(user => user.videos);

    console.log('Recommended videos:', videos);
    res.status(200).json(videos);
  } catch (error) {
    console.error('Error fetching video recommendations:', error);
    res.status(500).json({ message: 'Error fetching video recommendations', error: error.message });
  }
});


module.exports = router;