import requests
import json
import os
from datetime import datetime, timedelta

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
        
        data = response.json()
        events = data.get('data', {}).get('schedule', {}).get('events', [])
        
        matches = []
        for event in events:
            match = event.get('match', {})
            teams = match.get('teams', [])
            if len(teams) < 2: continue
            
            # 状态映射
            state = event.get('state')
            status = 'upcoming' if state == 'unstarted' else ('live' if state == 'inProgress' else 'completed')
            
            league = event.get('league', {}).get('name', 'Unknown')
            league_code = league.lower()[:3] # 简化代码
            
            # 尝试获取比分
            strategy = match.get('strategy', {}).get('teams', [])
            score_a = strategy[0].get('result', {}).get('outcome', {}).get('gameWins', 0) if len(strategy) > 0 else 0
            score_b = strategy[1].get('result', {}).get('outcome', {}).get('gameWins', 0) if len(strategy) > 1 else 0

            matches.append({
                "league": league,
                "league_code": league_code,
                "match": f"{teams[0]['name']} vs {teams[1]['name']}",
                "team_a": {"name": teams[0]['name'], "score": score_a},
                "team_b": {"name": teams[1]['name'], "score": score_b},
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
        {"league": "LPL Spring 2025", "league_code": "lpl", "match": "BLG vs TES", 
         "team_a": {"name": "BLG", "score": 2}, "team_b": {"name": "TES", "score": 1},
         "start_time": (now - timedelta(hours=1)).isoformat(), "status": "live"}
    ]

if __name__ == "__main__":
    data = fetch_esports_data()
    os.makedirs('data', exist_ok=True)
    with open('data/schedule.json', 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Updated schedule.json with {len(data)} matches.")
