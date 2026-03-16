import feedparser
import requests
import time
import json

def monitor_feeds():
    # Finalized Blog Configuration
    # Uses XML for Seth Lui and Miss Tam Chiak (admin subdomain)
    # Uses WP JSON API for Daniel Food Diary (RSS is disabled)
    blogs = {
        "Seth Lui": {
            "url": "https://sethlui.com/feed/",
            "type": "rss"
        },
        "Miss Tam Chiak": {
            "url": "https://admin.misstamchiak.com/feed/",
            "type": "rss"
        },
        "Daniel Food Diary": {
            "url": "https://danielfooddiary.com/wp-json/wp/v2/posts?per_page=3",
            "type": "json"
        }
    }

    # Stealth Headers mimicking a modern Chrome browser on Windows 10
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "en-US,en;q=0.9",
        "Connection": "keep-alive"
    }

    for name, config in blogs.items():
        print(f"\n--- {name} ---")
        
        # Add a 2-second delay between blog checks (Stealth Improvement)
        if name != "Seth Lui":
            time.sleep(2)

        try:
            response = requests.get(config["url"], headers=headers, timeout=20)
            response.raise_for_status()

            if config["type"] == "rss":
                # Handle traditional RSS/XML
                feed = feedparser.parse(response.content)
                if not feed.entries:
                    print(f"No entries found for {name}.")
                    continue
                
                posts = feed.entries[:3]
                for i, entry in enumerate(posts, 1):
                    print(f"{i}. {entry.title}")
                    print(f"   Link: {entry.link}")
            
            elif config["type"] == "json":
                # Handle Daniel Food Diary JSON API
                posts = response.json()
                if not posts:
                    print(f"No posts found for {name}.")
                    continue
                
                for i, post in enumerate(posts, 1):
                    # WP API titles are often nested in 'rendered'
                    title = post.get('title', {}).get('rendered', post.get('title', 'No Title'))
                    link = post.get('link', 'No Link')
                    print(f"{i}. {title}")
                    print(f"   Link: {link}")

        except Exception as e:
            print(f"❌ Error fetching {name}: {e}")

if __name__ == "__main__":
    monitor_feeds()
