import os
import requests
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

def verify_onemap():
    email = os.getenv("ONEMAP_EMAIL")
    password = os.getenv("ONEMAP_PASSWORD")

    if not email or not password:
        print("❌ Error: ONEMAP_EMAIL or ONEMAP_PASSWORD not found in .env file.")
        return

    url = "https://www.onemap.gov.sg/api/auth/post/getToken"
    data = {
        "email": email,
        "password": password
    }

    try:
        response = requests.post(url, json=data)
        if response.status_code == 200:
            print("✅ Guru Authenticated!")
        else:
            print(f"❌ Authentication Failed: {response.status_code}")
            print(f"Details: {response.text}")
    except Exception as e:
        print(f"❌ An error occurred: {e}")

if __name__ == "__main__":
    verify_onemap()
