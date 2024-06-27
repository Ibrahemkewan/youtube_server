import requests
import random

# Define the API base URL
base_url = 'http://localhost:5000/api'

# Define the users and videos data
users = [
    {"name": "User1", "email": "user1@example.com", "password": "password1"},
    {"name": "User2", "email": "user2@example.com", "password": "password2"},
    {"name": "User3", "email": "user3@example.com", "password": "password3"}
]

videos = [
    {"title": "Sample Video 1", "description": "This is the description for sample video 1.", "url": "https://www.w3schools.com/html/mov_bbb.mp4"},
    {"title": "Sample Video 2", "description": "This is the description for sample video 2.", "url": "https://www.w3schools.com/html/movie.mp4"},
    {"title": "Sample Video 3", "description": "This is the description for sample video 3.", "url": "https://www.w3schools.com/html/mov_bbb.mp4"},
    {"title": "Sample Video 4", "description": "This is the description for sample video 4.", "url": "https://www.w3schools.com/html/movie.mp4"},
    {"title": "Sample Video 5", "description": "This is the description for sample video 5.", "url": "https://www.w3schools.com/html/mov_bbb.mp4"},
    {"title": "Sample Video 6", "description": "This is the description for sample video 6.", "url": "https://www.w3schools.com/html/movie.mp4"},
    {"title": "Sample Video 7", "description": "This is the description for sample video 7.", "url": "https://www.w3schools.com/html/mov_bbb.mp4"},
    {"title": "Sample Video 8", "description": "This is the description for sample video 8.", "url": "https://www.w3schools.com/html/movie.mp4"},
    {"title": "Sample Video 9", "description": "This is the description for sample video 9.", "url": "https://www.w3schools.com/html/mov_bbb.mp4"},
    {"title": "Sample Video 10", "description": "This is the description for sample video 10.", "url": "https://www.w3schools.com/html/movie.mp4"}
]

# List of random image URLs from Lorem Picsum
image_urls = [
"https://images.pexels.com/photos/3408744/pexels-photo-3408744.jpeg",
"https://images.pexels.com/photos/624015/pexels-photo-624015.jpeg",
"https://images.pexels.com/photos/572897/pexels-photo-572897.jpeg"
]
# Function to create users
def create_users(users):
    user_ids = []
    for user in users:
        user['picture'] = random.choice(image_urls)  # Add random image URL to user
        response = requests.post(f'{base_url}/users', json=user)
        if response.status_code == 201:
            print(f"Created user: {user['name']}")
            user_ids.append(response.json()['_id'])
        else:
            print(f"Failed to create user: {user['name']}")
    return user_ids

# Function to log in users and get tokens
def login_users(users):
    tokens = []
    for user in users:
        response = requests.post(f'{base_url}/users/login', json={"email": user["email"], "password": user["password"]})
        if response.status_code == 200:
            print(f"Logged in user: {user['name']}")
            tokens.append(response.json()['token'])
        else:
            print(f"Failed to log in user: {user['name']}")
    return tokens

# Function to add videos to a user
def add_videos_to_user(user_id, token, videos):
    headers = {"Authorization": f"Bearer {token}"}
    for video in videos:
        response = requests.post(f'{base_url}/users/{user_id}/videos', json=video, headers=headers)
        if response.status_code == 201:
            print(f"Added video: {video['title']} to user: {user_id}")
        else:
            print(f"Failed to add video: {video['title']} to user: {user_id}")

# Main script
if __name__ == "__main__":
    user_ids = create_users(users)
    tokens = login_users(users)

    for user_id, token in zip(user_ids, tokens):
        add_videos_to_user(user_id, token, videos[:3])  # Add the first 3 videos to each user
