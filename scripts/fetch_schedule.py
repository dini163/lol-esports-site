import requests
import json
import os
from datetime import datetime, timedelta

def normalize_team_code(code):
    if not code:
        return code
    code_upper = code.upper()
    if code_upper == "KRX":
        return "DRX"
    if code_upper == "TLAW":
        return "TL"
    return code

def fetch_esports_data():
    # 新的端点 URL (不再需要 x-api-key 或者使用通用 Key)
    API_URL = "https://prod-relapi.ewp.gg/persisted/gw/getSchedule"
    
    # 社区通用 Key
    DEFAULT_API_KEY = "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z"
    
    api_key = os.environ.get('RIOT_ESPORTS_API_KEY', DEFAULT_API_KEY)
    
    headers = {
        "x-api-key": api_key,
        "Accept": "application/json"
    }
    
    # 获取近 7 天的赛程
    start_time = int((datetime.utcnow() - timedelta(days=1)).timestamp() * 1000)
    end_time = int((datetime.utcnow() + timedelta(days=7)).timestamp() * 1000)
    
    params = {
        "hl": "en-US",
        "start": start_time,
        "end": end_time
    }
 
    try:
        response = requests.get(API_URL, headers=headers, params=params)
        
        if response.status_code != 200:
            print(f"API Error: {response.status_code} - {response.text}")
            return get_mock_data()
        
        data = response.json() or {}
        data_obj = data.get('data') or {}
        schedule_obj = data_obj.get('schedule') or {}
        events = schedule_obj.get('events') or []
        
        matches = []
        for event in events:
            if not event: continue
            match = event.get('match') or {}
            teams = match.get('teams') or []
            if len(teams) < 2: continue
            
            # 状态映射
            state = event.get('state')
            status = 'upcoming' if state == 'unstarted' else ('live' if state == 'inProgress' else 'completed')
            
            league_obj = event.get('league') or {}
            league = league_obj.get('name', 'Unknown') or 'Unknown'
            league_code = league.lower()[:3] # 简化代码
            
            # 尝试获取比分
            t0 = teams[0] or {}
            t1 = teams[1] or {}
            
            t0_res = t0.get('result') or {}
            t1_res = t1.get('result') or {}
            
            score_a = t0_res.get('gameWins', 0) or 0
            score_b = t1_res.get('gameWins', 0) or 0
 
            t0_name = t0.get('name') or 'T1'
            t1_name = t1.get('name') or 'T2'
 
            # Load teams map for high-res images
            TEAMS_MAP = {}
            if os.path.exists("data/teams.json"):
                try:
                    with open("data/teams.json", "r", encoding="utf-8") as f:
                        teams_list = json.load(f)
                        for t in teams_list:
                            reg = t.get("region", "").upper()
                            co = t.get("code", "").upper()
                            img = t.get("image")
                            if reg and co:
                                TEAMS_MAP[(reg, co)] = img
                                TEAMS_MAP[co] = img # Fallback
                except Exception as e:
                    print(f"Error loading teams.json for schedule: {e}")

            team_a_code = normalize_team_code(t0.get('code') or t0_name[:3].upper())
            team_b_code = normalize_team_code(t1.get('code') or t1_name[:3].upper())
            
            team_a_image = t0.get('image') or ''
            team_b_image = t1.get('image') or ''

            # Extract region from league name
            region = None
            league_upper = league.upper()
            for r in ["LPL", "LCK", "LEC", "LCS"]:
                if r in league_upper:
                    region = r
                    break

            # Resolve unified images from TEAMS_MAP
            if region:
                team_a_image = TEAMS_MAP.get((region, team_a_code.upper())) or TEAMS_MAP.get(team_a_code.upper()) or team_a_image
                team_b_image = TEAMS_MAP.get((region, team_b_code.upper())) or TEAMS_MAP.get(team_b_code.upper()) or team_b_image
            else:
                team_a_image = TEAMS_MAP.get(team_a_code.upper()) or team_a_image
                team_b_image = TEAMS_MAP.get(team_b_code.upper()) or team_b_image

            if team_a_image and team_a_image.startswith("http://"):
                team_a_image = team_a_image.replace("http://", "https://")
            if team_b_image and team_b_image.startswith("http://"):
                team_b_image = team_b_image.replace("http://", "https://")

            matches.append({
                "league": league,
                "league_code": league_code,
                "match": f"{team_a_code} vs {team_b_code}",
                "team_a": {"name": t0_name, "code": team_a_code, "score": score_a, "image": team_a_image},
                "team_b": {"name": t1_name, "code": team_b_code, "score": score_b, "image": team_b_image},
                "start_time": event.get('startTime'),
                "status": status
            })
        
        return matches if matches else get_mock_data()

    except Exception as e:
        print(f"Network Error: {e}")
        return get_mock_data()

def get_mock_data():
    now = datetime.utcnow()
    return [
        {
            "league": "LPL Spring 2025",
            "league_code": "lpl",
            "match": "BLG vs TES",
            "team_a": {
                "name": "Bilibili Gaming",
                "code": "BLG",
                "score": 2,
                "image": "http://static.lolesports.com/teams/1682322954525_Bilibili_Gaming_logo_20211.png"
            },
            "team_b": {
                "name": "Top Esports",
                "code": "TES",
                "score": 1,
                "image": "http://static.lolesports.com/teams/1592592064571_TopEsportsTES-01-FullonDark.png"
            },
            "start_time": (now - timedelta(hours=1)).isoformat(),
            "status": "live"
        }
    ]

if __name__ == "__main__":
    data = fetch_esports_data()
    os.makedirs('data', exist_ok=True)
    with open('data/schedule.json', 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Updated schedule.json with {len(data)} matches.")
