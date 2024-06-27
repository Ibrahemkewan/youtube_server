const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: String,
  url: String,
  description: String,
  views: { type: Number, default: 0 }
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  picture: String,
  videos: [videoSchema]
});

// Use mongoose.model() to check if the model already exists
const User = mongoose.models.User || mongoose.model('User', userSchema);

module.exports = User;
