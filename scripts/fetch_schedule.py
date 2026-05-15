import requests
import json
import os
from datetime import datetime

def fetch_esports_data():
    # 1. 获取 API Key (需要在环境变量中设置，或者手动填入)
    # 获取方式: 访问 https://lolesports.com/schedule，F12 -> Network -> 找到 getSchedule 请求 -> 复制 x-api-key
    api_key = os.environ.get('RIOT_ESPORTS_API_KEY', 'YOUR_API_KEY_HERE')
    
    if api_key == 'YOUR_API_KEY_HERE':
        print("Warning: No API Key found. Using mock data for demo.")
        return get_mock_data()

    # 2. 请求官方 API
    headers = {
        "x-api-key": api_key,
        "Accept": "application/json"
    }
    # 获取当前时间戳用于查询
    start_time = int(datetime.now().timestamp() * 1000)
    end_time = start_time + (7 * 24 * 60 * 60 * 1000) # Next 7 days
    
    url = f"https://esports-api.lolesports.com/persisted/gw/getSchedule?hl=en-US&start={start_time}&end={end_time}"
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()
        data = response.json()
        
        # 3. 解析数据
        events = data.get('data', {}).get('schedule', {}).get('events', [])
        matches = []
        
        for event in events:
            match = event.get('match', {})
            teams = match.get('teams', [])
            if len(teams) < 2: continue
            
            # 简化状态逻辑
            state = event.get('state') # unstarted, inProgress, completed
            status = 'upcoming' if state == 'unstarted' else ('live' if state == 'inProgress' else 'completed')
            
            # 获取联赛名称
            league = event.get('league', {}).get('name', 'Unknown')
            league_code = league.lower().replace(' ', '_')[:3] # Simple code
            
            matches.append({
                "league": league,
                "league_code": league_code,
                "match": f"{teams[0]['name']} vs {teams[1]['name']}",
                "team_a": {"name": teams[0]['name'], "score": match.get('strategy', {}).get('teams', [{}])[0].get('result', {}).get('outcome', {}).get('gameWins', 0)},
                "team_b": {"name": teams[1]['name'], "score": match.get('strategy', {}).get('teams', [{}])[1].get('result', {}).get('outcome', {}).get('gameWins', 0)},
                "start_time": event.get('startTime'),
                "status": status
            })
            
        return matches
        
    except Exception as e:
        print(f"Error fetching API: {e}")
        return get_mock_data()

def get_mock_data():
    from datetime import datetime, timedelta
    now = datetime.utcnow()
    return [
        {
            "league": "LPL Spring 2025", "league_code": "lpl",
            "match": "BLG vs TES",
            "team_a": {"name": "BLG", "score": 2}, "team_b": {"name": "TES", "score": 1},
            "start_time": (now - timedelta(hours=1)).isoformat(), "status": "live"
        },
        {
            "league": "LCK Spring 2025", "league_code": "lck",
            "match": "T1 vs Gen.G",
            "team_a": {"name": "T1", "score": 0}, "team_b": {"name": "Gen.G", "score": 0},
            "start_time": (now + timedelta(hours=2)).isoformat(), "status": "upcoming"
        }
    ]

if __name__ == "__main__":
    data = fetch_esports_data()
    os.makedirs('data', exist_ok=True)
    with open('data/schedule.json', 'w') as f:
        json.dump(data, f, indent=2)
    print(f"Updated schedule.json with {len(data)} matches.")
