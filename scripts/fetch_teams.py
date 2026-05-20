import requests
import json
import os
import random

API_KEY = "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z"
HEADERS = {
    "x-api-key": API_KEY,
    "Accept": "application/json"
}

ROLE_ORDER = {
    "top": 0,
    "jungle": 1,
    "mid": 2,
    "bot": 3,
    "bottom": 3,
    "adc": 3,
    "support": 4,
    "sup": 4
}

def normalize_team_code(code):
    if not code:
        return code
    code_upper = code.upper()
    if code_upper == "KRX":
        return "DRX"
    if code_upper == "TLAW":
        return "TL"
    return code

IMAGE_OVERRIDES = {
    # LCK
    ("LCK", "T1"): "https://static.lolesports.com/teams/T1-FullonDark.png",
    ("LCK", "HLE"): "https://static.lolesports.com/teams/hle-2021-color-on-dark.png",
    ("LCK", "GEN"): "https://static.lolesports.com/teams/1773829250929_GENGLOGO_GOLD.png",
    ("LCK", "DK"): "https://static.lolesports.com/teams/1673260049703_DPlusKIALOGO11.png",
    ("LCK", "BFX"): "https://static.lolesports.com/teams/1734691810721_BFXfullcolorfordarkbg.png",
    ("LCK", "DNS"): "https://static.lolesports.com/teams/1767340467921_DN_SOOPerslogo_profile.webp",
    ("LCK", "DRX"): "https://static.lolesports.com/teams/1774247803537_horizontal_EN_Wh.png",
    ("LCK", "BRO"): "https://static.lolesports.com/teams/1716454325887_Nowyprojekt.png",
    ("LCK", "NS"): "https://static.lolesports.com/teams/NSFullonDark.png",
    ("LCK", "KT"): "https://static.lolesports.com/teams/kt_darkbackground.png",

    # LPL
    ("LPL", "BLG"): "https://static.lolesports.com/teams/1682322954525_Bilibili_Gaming_logo_20211.png",
    ("LPL", "TES"): "https://static.lolesports.com/teams/1592592064571_TopEsportsTES-01-FullonDark.png",
    ("LPL", "JDG"): "https://static.lolesports.com/teams/1627457924722_29.png",
    ("LPL", "WBG"): "https://static.lolesports.com/teams/1641202879910_3.png",
    ("LPL", "AL"): "https://static.lolesports.com/teams/1641199582689_.png",
    ("LPL", "NIP"): "https://static.lolesports.com/teams/1673425724696_NIP-Symbol-RGB-NeonYellow1.png",
    ("LPL", "IG"): "https://static.lolesports.com/teams/1634762917340_300px-Invictus_Gaming_logo.png",
    ("LPL", "WE"): "https://static.lolesports.com/teams/1634763008788_220px-Team_WE_logo.png",
    ("LPL", "LNG"): "https://static.lolesports.com/teams/1717487697003_LNGlogo.png",
    ("LPL", "TT"): "https://static.lolesports.com/teams/TT-FullonDark.png",
    ("LPL", "EDG"): "https://static.lolesports.com/teams/1631819297476_edg-2021-worlds.png",
    ("LPL", "LGD"): "https://static.lolesports.com/teams/LGD-FullonDark-1.png",
    ("LPL", "UP"): "https://static.lolesports.com/teams/ultraprime.png",
    ("LPL", "OMG"): "https://static.lolesports.com/teams/1686821355861_OMG_2023_logo-01.png",

    # LEC
    ("LEC", "G2"): "https://static.lolesports.com/teams/G2-FullonDark.png",
    ("LEC", "KC"): "https://static.lolesports.com/teams/1704714951336_KC.png",
    ("LEC", "MKOI"): "https://static.lolesports.com/teams/1734012609283_MKOI_FullColor_Blue.png",
    ("LEC", "GX"): "https://static.lolesports.com/teams/1765897105091_GIANTX-logotype-white.png",
    ("LEC", "NAVI"): "https://static.lolesports.com/teams/1752746833620_NAVI_FullColor.png",
    ("LEC", "VIT"): "https://static.lolesports.com/teams/1675865863968_Vitality_FullColor.png",
    ("LEC", "FNC"): "https://static.lolesports.com/teams/1631819669150_fnc-2021-worlds.png",
    ("LEC", "SK"): "https://static.lolesports.com/teams/1643979272144_SK_Monochrome.png",
    ("LEC", "SHFT"): "https://static.lolesports.com/teams/1765897071435_600px-Shifters_allmode.png",
    ("LEC", "TH"): "https://static.lolesports.com/teams/1672933861879_Heretics-Full-Color.png",

    # LCS
    ("LCS", "C9"): "https://static.lolesports.com/teams/1736924120254_C9Kia_IconBlue_Transparent_2000x2000.png",
    ("LCS", "LYON"): "https://static.lolesports.com/teams/1743717443673_isotypelyon-03.png",
    ("LCS", "TL"): "https://static.lolesports.com/teams/1769357207762_TLAlienware_Minimal_Bug-White.png",
    ("LCS", "FLY"): "https://static.lolesports.com/teams/flyquest-new-on-dark.png",
    ("LCS", "SEN"): "https://static.lolesports.com/teams/1767769784669_Sentinels_2020_Icon.png",
    ("LCS", "SR"): "https://static.lolesports.com/teams/1701424227458_Teams204_Shopify_1632869404072.png",
    ("LCS", "DSG"): "https://static.lolesports.com/teams/1731496922454_Disguised-Wordmark-Yellow-Main.png",
    ("LCS", "DIG"): "https://static.lolesports.com/teams/DIG-FullonDark.png"
}

def get_signature_champions(role):
    role = role.lower()
    if "top" in role:
        return ["Aatrox", "Jax", "Ornn", "Renekton"]
    elif "jungle" in role or "jgl" in role:
        return ["LeeSin", "Viego", "Sejuani", "Graves"]
    elif "mid" in role:
        return ["Azir", "Orianna", "Syndra", "Yone"]
    elif "bot" in role or "adc" in role or "bottom" in role:
        return ["Aphelios", "Jinx", "Zeri", "Kaisa"]
    elif "support" in role or "sup" in role:
        return ["Thresh", "Lulu", "Rakan", "Nautilus"]
    return ["Ahri", "Ezreal", "LeeSin", "Thresh"]

def generate_random_stats():
    return {
        "kda": f"{round(random.uniform(3.2, 5.8), 1)}",
        "cs_per_min": f"{round(random.uniform(8.0, 10.2), 1)}",
        "kill_participation": f"{random.randint(62, 78)}%",
        "win_rate": f"{random.randint(48, 72)}%"
    }

def fetch_and_process_teams():
    api_url = "https://prod-relapi.ewp.gg/persisted/gw/getTeams"
    params = {"hl": "en-US"}
    
    print("Fetching teams from Riot Esports API...")
    try:
        res = requests.get(api_url, headers=HEADERS, params=params)
        if res.status_code != 200:
            print(f"API returned status code: {res.status_code}")
            return
        
        raw_data = res.json()
    except Exception as e:
        print(f"Error fetching teams: {e}")
        return
        
    teams = raw_data.get("data", {}).get("teams", [])
    print(f"Found {len(teams)} total teams in the raw response.")
    
    # Load existing players to preserve biographies and custom edits
    existing_players = {}
    if os.path.exists("data/players.json"):
        try:
            with open("data/players.json", "r", encoding="utf-8") as f:
                existing_players = json.load(f)
            print(f"Loaded {len(existing_players)} existing players to preserve highlights and bio details.")
        except Exception as e:
            print(f"Could not load existing players.json: {e}")
            
    # Load active teams from standings to filter out academy and irrelevant teams
    active_teams_set = set()
    if os.path.exists("data/standings.json"):
        try:
            with open("data/standings.json", "r", encoding="utf-8") as f:
                standings_data = json.load(f)
                for reg, reg_data in standings_data.items():
                    for key in ["regular", "playoffs"]:
                        for team_entry in reg_data.get(key, []):
                            code = team_entry.get("teamCode", "").upper()
                            name = team_entry.get("team", "").upper()
                            if code:
                                active_teams_set.add((reg.upper(), code))
                            if name:
                                active_teams_set.add((reg.upper(), name))
            print(f"Loaded {len(active_teams_set)} active teams from standings for filtering.")
        except Exception as e:
            print(f"Error loading standings.json: {e}")
            
    processed_teams = []
    processed_players = {}
    
    leagues_map = {
        "LPL": "LPL",
        "LCK": "LCK",
        "LEC": "LEC",
        "LCS": "LCS"
    }
    
    for t in teams:
        status = t.get("status")
        # Only process active teams
        if status != "active":
            continue
            
        home_league = t.get("homeLeague")
        if not home_league:
            continue
            
        league_name = home_league.get("name", "").upper()
        region = None
        for key, val in leagues_map.items():
            if key in league_name:
                region = val
                break
                
        if not region:
            continue
            
        team_name = t.get("name")
        team_code = normalize_team_code(t.get("code") or team_name[:3].upper())
        
        # Check if the team is in active standings
        is_active_in_standings = False
        if active_teams_set:
            if (region.upper(), team_code.upper()) in active_teams_set or (region.upper(), team_name.upper()) in active_teams_set:
                is_active_in_standings = True
        else:
            # Fallback if standings.json doesn't exist yet: filter by academy/challenger/youth names
            is_active_in_standings = not any(kw in team_name.lower() for kw in ["academy", "challenger", "youth", "global academy"])
            
        if not is_active_in_standings:
            continue
            
        team_id = t.get("slug") or team_code.lower()
        team_image = t.get("image") or "http://static.lolesports.com/teams/default-team.png"
        
        # Enforce image overrides and https
        override_key = (region, team_code.upper())
        if override_key in IMAGE_OVERRIDES:
            team_image = IMAGE_OVERRIDES[override_key]
        if team_image and team_image.startswith("http://"):
            team_image = team_image.replace("http://", "https://")
        
        raw_players = t.get("players", [])
        if not raw_players:
            continue
            
        valid_players = []
        for p in raw_players:
            ign = p.get("summonerName")
            role = p.get("role")
            if not ign or not role:
                continue
            valid_players.append(p)
            
        if not valid_players:
            continue
            
        # Sort players in standard Top -> Jungle -> Mid -> Bot -> Support order
        valid_players.sort(key=lambda x: ROLE_ORDER.get(x.get("role", "").lower(), 99))
        
        team_player_names = []
        for p in valid_players:
            ign = p.get("summonerName")
            role = p.get("role", "").upper()
            player_img = p.get("image") or "http://static.lolesports.com/players/default-player.png"
            first_name = p.get("firstName", "")
            last_name = p.get("lastName", "")
            full_name = f"{first_name} {last_name}".strip() or ign
            
            team_player_names.append(ign)
            
            # Check if this player already exists in our database
            if ign in existing_players:
                p_data = existing_players[ign].copy()
                p_data["team"] = team_name
                p_data["region"] = region
                p_data["role"] = role
                # Update image if Riot returns a non-default portrait
                if p.get("image"):
                    p_data["image"] = p.get("image")
                processed_players[ign] = p_data
            else:
                # Generate realistic stats and standard premium profile details
                processed_players[ign] = {
                    "id": ign,
                    "name": full_name,
                    "ign": ign,
                    "role": role,
                    "team": team_name,
                    "region": region,
                    "image": player_img,
                    "bio": f"{ign} is a professional League of Legends player competing in the {region} as the {role} for {team_name}. Known for mechanical prowess and dedication to team cohesion.",
                    "signature_champions": get_signature_champions(role),
                    "stats": generate_random_stats(),
                    "highlights": []
                }
                
        processed_teams.append({
            "id": team_id,
            "name": team_name,
            "code": team_code,
            "region": region,
            "image": team_image,
            "players": team_player_names
        })
        
    print(f"Successfully processed {len(processed_teams)} active league teams and {len(processed_players)} players.")
    
    # Save the output files
    os.makedirs('data', exist_ok=True)
    with open('data/teams.json', 'w', encoding="utf-8") as f:
        json.dump(processed_teams, f, indent=2, ensure_ascii=False)
    print("Wrote data/teams.json")
    
    with open('data/players.json', 'w', encoding="utf-8") as f:
        json.dump(processed_players, f, indent=2, ensure_ascii=False)
    print("Wrote data/players.json")

if __name__ == "__main__":
    fetch_and_process_teams()
