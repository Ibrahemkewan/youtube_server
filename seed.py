import requests
import random

# Define the API base URL
base_url = 'http://localhost:5000/api'

# Define the users and videos data with unique identifiers
users = [
    {"name": "Alice Smith", "email": "alice.smith@example.com", "password": "password1"},
    {"name": "Bob Johnson", "email": "bob.johnson@example.com", "password": "password2"},
    {"name": "Charlie Brown", "email": "charlie.brown@example.com", "password": "password3"}
]

videos = [
    {"title": "Introduction to Python", "description": "This is the description for the Python intro video.", "url": "https://www.w3schools.com/html/mov_bbb.mp4"},
    {"title": "Advanced Python Techniques", "description": "This is the description for the advanced Python video.", "url": "https://www.w3schools.com/html/movie.mp4"},
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
        break

# Main script
if __name__ == "__main__":
    user_ids = create_users(users)
    tokens = login_users(users)

    for user_id, token in zip(user_ids, tokens):
        add_videos_to_user(user_id, token, videos[:3])  # Add the first 3 videos to each user
