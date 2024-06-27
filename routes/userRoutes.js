const express = require('express');
const User = require('../models/User');
const jwt = require('jsonwebtoken');

const router = express.Router();

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Access token is missing or invalid' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};// Get 20 videos (10 most viewed and 10 random)
router.get('/videos', authenticateToken, async (req, res) => {
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

    res.status(200).json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ message: 'Error fetching videos', error });
  }
});
router.get('/videos2', authenticateToken, async (req, res) => {
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
            url: "$videos.url",  // Include the video URL
            owner: "$ownerDetails"  // Include all owner details
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
          "videos.url": 1,  // Include the video URL
          owner: "$ownerDetails"  // Include all owner details
      }}
    ]);

    // Combine the most viewed videos and the random videos
    const videos = [...mostViewedVideos.flatMap(user => user.videos), ...randomVideos.map(doc => doc.videos)];

    res.status(200).json(videos);
  } catch (error) {
    console.error('Error fetching videos:', error);
    res.status(500).json({ message: 'Error fetching videos', error });
  }
});



// Create a new user
router.post('/users', async (req, res) => {
  try {
    const { name, email, password, picture } = req.body;
    const user = new User({ name, email, password, picture });
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.code === 11000) { // Duplicate key error
      return res.status(400).json({ message: 'Email already exists', error });
    }
    res.status(500).json({ message: 'Error creating user', error });
  }
});

// Get user by ID
router.get('/users/:id', async (req, res) => {
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
// Update user by ID
// Update user by ID
router.put('/users/:id', async (req, res) => {
  try {
    const { name, password, picture } = req.body;

    // Find the user by ID
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user fields, excluding email
    user.name = name;
    user.password = password;
    user.picture = picture;

    // Save the updated user
    await user.save();

    res.status(200).json(user);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user', error });
  }
});



// Delete user by ID
router.delete('/users/:id', async (req, res) => {
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
router.post('/users/:id/videos',authenticateToken,  async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Validate if the userId is a valid ObjectId
    if (!userId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { title, url,description } = req.body;
    const video = { title, url,description };
    user.videos.push(video);
    await user.save();
    res.status(201).json(user.videos[user.videos.length - 1]); // Return the last added video, including _id
  } catch (error) {
    console.error('Error adding video:', error);
    res.status(500).json({ message: 'Error adding video', error });
  }
});



// Get video details for user by ID and video ID
router.get('/users/:id/videos/:pid',authenticateToken,  async (req, res) => {
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
router.put('/users/:id/videos/:pid/increment-views', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const video = user.videos.id(req.params.pid);
    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    // Increment the view count
    video.views = (video.views || 0) + 1;

    await user.save();
    res.status(200).json(video);
  } catch (error) {
    console.error('Error incrementing video views:', error);
    res.status(500).json({ message: 'Error incrementing video views', error });
  }
});
// Update video for user by ID and video ID
router.put('/users/:id/videos/:pid',authenticateToken,  async (req, res) => {
  console.log(req.body);
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
    console.log(user);
    res.status(200).json(video);
  } catch (error) {
    console.error('Error updating video:', error);
    res.status(500).json({ message: 'Error updating video', error });
  }
});
// Delete video for user by ID and video ID
router.delete('/users/:id/videos/:pid',authenticateToken, async (req, res) => {
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
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a JWT token
    const token = generateToken(user);

    res.status(200).json({ token });
  } catch (error) {
    console.error('Error generating JWT:', error);
    res.status(500).json({ message: 'Error generating JWT', error });
  }
});
// Get videos for user by ID
router.get('/users/:id/videos', authenticateToken, async (req, res) => {
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
router.post('/users/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find the user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if the password matches
    if (user.password !== password) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    // Generate a JWT token
    const token = generateToken(user);

    res.status(200).json({ message: 'Login successful', token, userId: user._id });
  } catch (error) {
    console.error('Error logging in user:', error);
    res.status(500).json({ message: 'Error logging in user', error });
  }
});
module.exports = router;
