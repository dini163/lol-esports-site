import requests
from bs4 import BeautifulSoup
import json
import os
import re
from datetime import datetime

url = "https://lol.fandom.com/api.php"
headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
}

PAGES = [
    {"page": "Roster Swaps/2026 Preseason/Americas", "region": "LCS"},
    {"page": "Roster Swaps/2025 Midseason/Americas", "region": "LCS"},
    {"page": "Roster Swaps/2025 Preseason/Americas", "region": "LCS"},
    {"page": "Roster Swaps/2026 Preseason/EMEA", "region": "LEC"},
    {"page": "Roster Swaps/2025 Midseason/EMEA", "region": "LEC"},
    {"page": "Roster Swaps/2025 Preseason/EMEA", "region": "LEC"},
    {"page": "Roster Swaps/2026 Preseason/Korea", "region": "LCK"},
    {"page": "Roster Swaps/2025 Midseason/Korea", "region": "LCK"},
    {"page": "Roster Swaps/2025 Preseason/Korea", "region": "LCK"},
    {"page": "Roster Swaps/2026 Preseason/China", "region": "LPL"},
    {"page": "Roster Swaps/2025 Midseason/China", "region": "LPL"},
    {"page": "Roster Swaps/2025 Preseason/China", "region": "LPL"}
]

# Static high-profile free agents for 2026
STATIC_FREE_AGENTS = [
    { "player": "ShowMaker", "region": "LCK", "role": "MID", "prev_team": "DK", "status": "Exploring Options" },
    { "player": "TheShy", "region": "LPL", "role": "TOP", "prev_team": "WBG", "status": "Taking a break" },
    { "player": "Tarzan", "region": "LPL", "role": "JGL", "prev_team": "WBG", "status": "Open to offers" },
    { "player": "Scout", "region": "LPL", "role": "MID", "prev_team": "LNG", "status": "Exploring Options" },
    { "player": "Viper", "region": "LCK", "role": "BOT", "prev_team": "HLE", "status": "Negotiating" },
    { "player": "Jankos", "region": "LEC", "role": "JGL", "prev_team": "TH", "status": "Looking for team" },
    { "player": "Bwipo", "region": "LCS", "role": "TOP", "prev_team": "FLY", "status": "Looking for team" }
]

def clean_text(text):
    if not text:
        return ""
    # Remove footnote brackets e.g. [10], and zero-width spaces/tabs
    text = re.sub(r'\[\d+\]', '', text)
    text = text.replace('\u2060', '').replace('\xa0', ' ').strip()
    return text

def parse_role(role_str):
    role_str = role_str.lower()
    if "top" in role_str: return "TOP"
    if "jungle" in role_str or "jgl" in role_str or "jungler" in role_str: return "JGL"
    if "mid" in role_str: return "MID"
    if "bot" in role_str or "adc" in role_str or "carry" in role_str: return "BOT"
    if "support" in role_str or "sup" in role_str: return "SUP"
    return "MID" # Fallback

def normalize_team(team):
    team_clean = clean_text(team)
    if not team_clean or team_clean.lower() in ["unknown", "none", "free agent", ""]:
        return "Unknown"
    
    t_upper = team_clean.upper()
    
    # LCK Teams
    if "HANWHA" in t_upper or t_upper == "HLE": return "HLE"
    if "GEN.G" in t_upper or "GEN G" in t_upper or t_upper == "GEN": return "GEN"
    if "DPLUS" in t_upper or "DK" in t_upper or "DAMWON" in t_upper: return "DK"
    if "KT ROLSTER" in t_upper or t_upper == "KT": return "KT"
    if "KWANGDONG" in t_upper or "KDF" in t_upper or "FREECS" in t_upper: return "KDF"
    if "FEARX" in t_upper or "BNK" in t_upper or "FOX" in t_upper: return "FOX"
    if "BRION" in t_upper or "BRO" in t_upper or "OKSAVINGSBANK" in t_upper: return "BRO"
    if "NONGSHIM" in t_upper or "NS" in t_upper: return "NS"
    if "DRX" in t_upper: return "DRX"
    if "T1" in t_upper: return "T1"
    
    # LPL Teams
    if "BILIBILI" in t_upper or t_upper == "BLG": return "BLG"
    if "TOP ESPORTS" in t_upper or t_upper == "TES": return "TES"
    if "JD GAMING" in t_upper or "JDG" in t_upper: return "JDG"
    if "WEIBO" in t_upper or t_upper == "WBG": return "WBG"
    if "NINJAS IN" in t_upper or t_upper == "NIP": return "NIP"
    if "FUNPLUS" in t_upper or t_upper == "FPX": return "FPX"
    if "EDWARD" in t_upper or t_upper == "EDG": return "EDG"
    if "ROYAL NEVER" in t_upper or t_upper == "RNG": return "RNG"
    if "LNG" in t_upper: return "LNG"
    if "INVICTUS" in t_upper or t_upper == "IG": return "IG"
    if "LGD" in t_upper: return "LGD"
    if "ULTRA PRIME" in t_upper or t_upper == "UP": return "UP"
    if "RARE ATOM" in t_upper or t_upper == "RA": return "RA"
    if "TEAM WE" in t_upper or t_upper == "WE": return "WE"
    if "ANYONE'S" in t_upper or t_upper == "AL": return "AL"
    if "THUNDERTALK" in t_upper or t_upper == "TT": return "TT"
    
    # LEC Teams
    if "G2" in t_upper: return "G2"
    if "FNATIC" in t_upper or t_upper == "FNC": return "FNC"
    if "KARMINE" in t_upper or t_upper == "KC": return "KC"
    if "GIANTX" in t_upper or t_upper == "GX": return "GX"
    if "ROGUE" in t_upper or t_upper == "RGE": return "RGE"
    if "VITALITY" in t_upper or t_upper == "VIT": return "VIT"
    if "HERETICS" in t_upper or t_upper == "TH": return "TH"
    if "MAD LIONS" in t_upper or "KOI" in t_upper or t_upper == "MDK": return "MDK"
    if "SK GAMING" in t_upper or t_upper == "SK": return "SK"
    if "BDSA" in t_upper or "BDS" in t_upper: return "BDS"
    
    # LCS / Americas Teams
    if "TEAM LIQUID" in t_upper or t_upper == "TL": return "TL"
    if "CLOUD9" in t_upper or t_upper == "C9": return "C9"
    if "FLYQUEST" in t_upper or t_upper == "FLY": return "FLY"
    if "DIGNITAS" in t_upper or t_upper == "DIG": return "DIG"
    if "SHOPIFY" in t_upper or t_upper == "SR": return "SR"
    if "100 THIEVES" in t_upper or t_upper == "100T" or "100" in t_upper: return "100T"
    
    # Clean up long names if too wordy
    if len(team_clean) > 15:
        acronym = "".join([w[0] for w in team_clean.split() if w[0].isupper()])
        if len(acronym) >= 2:
            return acronym
            
    return team_clean

def extract_team(cell):
    if not cell:
        return "Unknown"
    a_tags = cell.find_all("a")
    for a in a_tags:
        title = a.get("title")
        if title:
            # Ignore edit and utility links
            if any(kw in title for kw in ["Data:", "Special:", "File:", "Edit", "History"]):
                continue
            return title
    # Fallback to text
    text = clean_text(cell.get_text(strip=True))
    if not text or text.lower() in ["unknown", "none", ""]:
        return "Unknown"
    return text

def main():
    print("Fetching live roster transfers...")
    timeline = []
    current_id = 1
    
    for entry in PAGES:
        page_name = entry["page"]
        default_region = entry["region"]
        print(f"Parsing page: {page_name}")
        
        params = {
            "action": "parse",
            "page": page_name,
            "prop": "text",
            "format": "json"
        }
        
        try:
            res = requests.get(url, headers=headers, params=params, timeout=12)
            res.raise_for_status()
            data = res.json()
            if "error" in data:
                print(f"  Error loading {page_name}: {data['error'].get('info')}")
                continue
                
            html = data.get("parse", {}).get("text", {}).get("*", "")
            soup = BeautifulSoup(html, "html.parser")
            tables = soup.find_all("table")
            
            parsed_count = 0
            for tbl in tables:
                rows = tbl.find_all("tr")
                if not rows:
                    continue
                headers_cells = [cell.get_text(strip=True) for cell in rows[0].find_all(["th", "td"])]
                
                # Check if it is a roster swaps table
                if any(h in headers_cells for h in ["Player", "Leaves", "Joins"]):
                    is_timeline = any(h in headers_cells for h in ["Date"])
                    
                    for r in rows[1:]:
                        cells = r.find_all(["td", "th"])
                        if not cells or len(cells) < 4:
                            continue
                            
                        # Skip subheader rows
                        first_cell_text = clean_text(cells[0].get_text(strip=True))
                        if first_cell_text in ["Player", "Date", ""]:
                            continue
                            
                        if is_timeline:
                            # Table 3 Style chronological Timeline
                            if len(cells) < 8:
                                continue
                            date_raw = clean_text(cells[0].get_text(strip=True))
                            if not re.match(r'^\d{4}-\d{2}-\d{2}$', date_raw):
                                continue
                            status = clean_text(cells[1].get_text(strip=True))
                            player = clean_text(cells[3].get_text(strip=True))
                            from_team = normalize_team(extract_team(cells[5]))
                            to_team = normalize_team(extract_team(cells[8]))
                            
                            role_str = ""
                            # Extract role from role sprite
                            for idx_role in [6, 9]:
                                if idx_role < len(cells):
                                    sprite = cells[idx_role].find(class_="role-sprite")
                                    if sprite and sprite.get("title"):
                                        role_str = sprite.get("title")
                                        break
                            role = parse_role(role_str)
                            
                            status_type = "Confirmed" if "Confirmed" in status or "Official" in status else "Rumor"
                        else:
                            # Table 2 Style Player Swaps table
                            player = clean_text(cells[0].get_text(strip=True))
                            dates = []
                            for cell in cells:
                                cell_t = clean_text(cell.get_text(strip=True))
                                m = re.search(r'\d{4}-\d{2}-\d{2}', cell_t)
                                if m:
                                    dates.append(m.group(0))
                            date_raw = dates[-1] if dates else ""
                            if not date_raw:
                                continue
                                
                            if len(cells) == 11:
                                from_team = normalize_team(extract_team(cells[3]))
                                to_team = normalize_team(extract_team(cells[8]))
                            else:
                                c1_text = clean_text(cells[1].get_text(strip=True)).lower()
                                if any(kw in c1_text for kw in ["free agent", "retired", "inactive", "break"]):
                                    from_team = "Free Agent"
                                    to_team = normalize_team(extract_team(cells[4]))
                                else:
                                    from_team = normalize_team(extract_team(cells[3]))
                                    to_team_text = clean_text(cells[-1].get_text(strip=True)).lower()
                                    if any(kw in to_team_text for kw in ["free agent", "retired", "inactive", "break"]):
                                        to_team = "Free Agent"
                                    else:
                                        to_team = "Free Agent"
                                        
                            role_str = ""
                            for cell in cells:
                                txt = clean_text(cell.get_text(strip=True))
                                if txt in ["Top", "Jungle", "Mid", "Bot", "Support"]:
                                    role_str = txt
                                    break
                            role = parse_role(role_str)
                            status_type = "Confirmed"
                            
                        # Create gorgeous Riot-style descriptive texts
                        if status_type == "Confirmed":
                            if from_team in ["Unknown", "Free Agent"]:
                                desc = f"{player} has officially signed with {to_team} as their starting {role.lower()} laner."
                            elif to_team in ["Unknown", "Free Agent"]:
                                desc = f"{player} has officially parted ways with {from_team} to become a free agent."
                            else:
                                desc = f"{player} has officially transferred to {to_team} from {from_team}."
                        else:
                            desc = f"Reports suggest {player} is in advanced negotiations to join {to_team} from {from_team}."
                            if to_team in ["Unknown", "Free Agent"]:
                                desc = f"Reports indicate {player} is exploring their options outside of {from_team}."
                                
                        # Avoid duplicates: if same player is already tracked on the same date, skip
                        duplicate = False
                        for t in timeline:
                            if t["player"] == player and t["date"] == date_raw and t["from_team"] == from_team and t["to_team"] == to_team:
                                duplicate = True
                                break
                        if not duplicate:
                            timeline.append({
                                "id": current_id,
                                "date": date_raw,
                                "region": default_region,
                                "type": status_type,
                                "player": player,
                                "role": role,
                                "from_team": from_team,
                                "to_team": to_team,
                                "description": desc
                            })
                            current_id += 1
                            parsed_count += 1
                            
            print(f"  Parsed {parsed_count} transfers from {page_name}.")
            
        except Exception as e:
            print(f"  Exception parsing {page_name}: {e}")
            
    # Sort timeline by date descending
    timeline = [t for t in timeline if t.get("date")]
    timeline.sort(key=lambda x: x["date"], reverse=True)
    
    # Re-assign IDs in sorted order
    for idx, t in enumerate(timeline):
        t["id"] = idx + 1
        
    # Write to transfers.json (write all timeline moves, no slicing, to display complete history)
    out_data = {
        "timeline": timeline,
        "free_agents": STATIC_FREE_AGENTS
    }
    
    out_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "transfers.json")
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(out_data, f, ensure_ascii=False, indent=2)
        
    print(f"Successfully updated data/transfers.json with {len(timeline)} timeline moves and {len(STATIC_FREE_AGENTS)} free agents.")

if __name__ == "__main__":
    main()
