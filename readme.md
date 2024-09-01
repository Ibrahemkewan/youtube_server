# YouTube Clone Backend Server

This backend server supports a simple YouTube clone application. It is built with Express.js and MongoDB and handles user authentication, video management, and basic CRUD operations for videos and users.



## Features

- User registration and login with JWT authentication
- Video upload, edit, and delete functionalities
- Fetch top 10 most viewed videos and 10 random videos
- Fetch user-specific videos

## Installation and Setup

1. **Clone the Repository:**

   ```bash
   git clone https://github.com/your-repo/youtube-clone-backend.git
   ```

2. **Navigate to the Project Directory:**

   ```bash
   cd youtube-clone-backend
   ```

3. **Install Dependencies:**

   ```bash
   npm install
   ```

4. **Set Up Environment Variables:**

   Create a `.env` file in the root of the project and add the following environment variables:
```
  PORT=5000
  MONGO_URI=mongodb://localhost:27017/youtube-demo-app
  JWT_SECRET=your_secret_key
```

5. **Start the Server:**

   ```bash
   npm start
   ```

   The server will run on `http://localhost:5000`.

## API Endpoints

### User Routes

- **Create a new user:**

  ```http
  POST /api/users
  ```

  **Body:**

  ```json
  {
    "name": "User Name",
    "email": "user@example.com",
    "password": "password123",
    "picture": "https://example.com/picture.jpg"
  }
  ```

- **Login a user:**

  ```http
  POST /api/users/login
  ```

  **Body:**

  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```

- **Get user by ID:**

  ```http
  GET /api/users/:id
  ```

- **Update user by ID:**

  ```http
  PUT /api/users/:id
  ```

  **Body:**

  ```json
  {
    "name": "Updated User Name",
    "password": "newpassword123",
    "picture": "https://example.com/newpicture.jpg"
  }
  ```

- **Delete user by ID:**

  ```http
  DELETE /api/users/:id
  ```

### Video Routes

- **Get 20 videos (10 most viewed and 10 random):**

  ```http
  GET /api/videos
  ```

- **Get top 10 most viewed videos with owner details:**

  ```http
  GET /api/videos2
  ```

- **Get videos for user by ID:**

  ```http
  GET /api/users/:id/videos
  ```

- **Add a video for user by ID:**

  ```http
  POST /api/users/:id/videos
  ```

  **Body:**

  ```json
  {
    "title": "Sample Video",
    "url": "https://example.com/video.mp4",
    "description": "This is a sample video description."
  }
  ```

- **Get video details for user by ID and video ID:**

  ```http
  GET /api/users/:id/videos/:pid
  ```

- **Update video for user by ID and video ID:**

  ```http
  PUT /api/users/:id/videos/:pid
  ```

  **Body:**

  ```json
  {
    "title": "Updated Video Title",
    "url": "https://example.com/updatedvideo.mp4",
    "description": "This is an updated video description."
  }
  ```

- **Increment video views for user by ID and video ID:**

  ```http
  PUT /api/users/:id/videos/:pid/increment-views
  ```

- **Delete video for user by ID and video ID:**

  ```http
  DELETE /api/users/:id/videos/:pid
  ```

## File Structure

```
.
├── config
│   └── db.js              # Database connection setup
├── models
│   └── User.js            # Mongoose user and video schemas
├── routes
│   └── userRoutes.js      # User and video routes
├── .env                   # Environment variables
├── package.json           # Project dependencies and scripts
└── server.js              # Express server setup
```

## Environment Variables

- **MONGO_URI**: MongoDB connection string
- **JWT_SECRET**: Secret key for JWT token generation

---

This README provides an overview of the backend server for the YouTube clone application, detailing its features, installation steps, API endpoints, and file structure. Follow the instructions to set up and run the server locally.
cpp server :

 g++ server.cpp -o server.exe -lws2_32

 run:
 ./server.exe