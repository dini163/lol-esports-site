import json
import urllib.request
import os
from bs4 import BeautifulSoup

def fetch_latest_patch_highlights(major, minor):
    # Construct the patch notes URL based on the mapped 26.x version
    mapped_major = major + 10
    url = f"https://www.leagueoflegends.com/en-us/news/game-updates/league-of-legends-patch-{mapped_major}-{minor}-notes/"
    
    print(f"Fetching highlights from: {url}")
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            html = response.read().decode('utf-8')
        
        soup = BeautifulSoup(html, "html.parser")
        
        # Search for the "Patch Highlights" header
        highlights_header = None
        for h in soup.find_all("h2"):
            if "Patch Highlights" in h.get_text():
                highlights_header = h
                break
        
        if not highlights_header:
            print("Patch Highlights header not found in HTML.")
            return None
            
        highlights = []
        elem = highlights_header.next_element
        while elem:
            if hasattr(elem, 'name'):
                if elem.name == "h2":
                    break
                if elem.name in ["p", "li"]:
                    text = elem.get_text(strip=True)
                    # Clean and filter out empty or too short items
                    if text and text not in highlights and len(text) > 15:
                        # Clean up formatting oddities
                        text = text.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"').replace("to2.5sto", "to 2.5s to")
                        highlights.append(text)
            elem = elem.next_element
            
        if highlights:
            print(f"Successfully parsed {len(highlights)} highlights.")
            return highlights[:4] # Keep top 4 highlights
            
    except Exception as e:
        print(f"Could not fetch/parse patch notes page: {e}")
        
    return None

def update_meta():
    try:
        # 1. Fetch latest version from Data Dragon
        versions_url = 'https://ddragon.leagueoflegends.com/api/versions.json'
        req = urllib.request.Request(versions_url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            versions = json.loads(response.read().decode('utf-8'))
        
        if not versions:
            print("Failed to fetch versions from DDragon.")
            return

        latest_version = versions[0]
        parts = latest_version.split('.')
        major = int(parts[0])
        minor = parts[1]
        
        # Map major from 16 to 26 (Season 26)
        mapped_version = f"{major + 10}.{minor}"
        print(f"Latest Riot Version: {latest_version} -> Mapped: {mapped_version}")

        # 2. Load current meta.json
        meta_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'meta.json')
        if not os.path.exists(meta_path):
            print(f"meta.json not found at {meta_path}")
            return

        with open(meta_path, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # 3. Check if version has changed
        version_changed = (data.get('patch') != mapped_version)
        
        # 4. Fetch dynamic highlights
        new_highlights = fetch_latest_patch_highlights(major, minor)
        
        # 5. Write updates if changed or new highlights fetched
        updated = False
        if version_changed:
            print(f"Patch version changed from {data.get('patch')} to {mapped_version}")
            data['patch'] = mapped_version
            updated = True
            
        if new_highlights:
            print("Updating highlights to match the live patch notes.")
            data['highlights'] = new_highlights
            updated = True
            
        if updated:
            with open(meta_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
                f.write('\n')
            print("Successfully updated data/meta.json with latest patch data.")
        else:
            print("No updates needed for data/meta.json.")

    except Exception as e:
        print(f"Error in update_meta: {e}")

if __name__ == '__main__':
    update_meta()
