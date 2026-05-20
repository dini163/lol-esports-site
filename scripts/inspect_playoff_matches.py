import requests
import json

LEAGUES_TO_TOURNAMENTS = {
    "LPL": "115615907996665826", # group_stage, playoffs
    "LCK": "115548128960088078", # regular_season, road_to_msi
    "LEC": "115548668058343983", # regular_season, playoffs
    "LCS": "115564760172712809"  # regular_season, playoffs
}

API_KEY = "0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z"
HEADERS = {
    "x-api-key": API_KEY,
    "Accept": "application/json"
}

def inspect_matches():
    for league, t_id in LEAGUES_TO_TOURNAMENTS.items():
        print(f"\n=================== {league} (ID: {t_id}) ===================")
        url = "https://prod-relapi.ewp.gg/persisted/gw/getStandings"
        params = {"hl": "en-US", "tournamentId": t_id}
        res = requests.get(url, headers=HEADERS, params=params)
        if res.status_code != 200:
            print(f"Failed to fetch standings: {res.status_code}")
            continue
            
        data = res.json()
        standings = data.get("data", {}).get("standings", [])
        if not standings:
            continue
            
        stages = standings[0].get("stages", [])
        for stage in stages:
            slug = stage.get("slug")
            if "playoff" not in slug.lower() and "msi" not in slug.lower() and "post" not in slug.lower():
                continue
                
            print(f"Playoff Stage: {slug}")
            sections = stage.get("sections", [])
            for i, sec in enumerate(sections):
                matches = sec.get("matches", [])
                print(f"  Section {i}: matches count = {len(matches)}")
                for m_idx, m in enumerate(matches):
                    state = m.get("state")
                    teams = m.get("teams", [])
                    teams_info = []
                    for t in teams:
                        code = t.get("code", "TBD")
                        name = t.get("name", "TBD")
                        img = t.get("image")
                        record = t.get("record")
                        result = m.get("result")
                        wins = (t.get("result") or {}).get("gameWins", 0)
                        teams_info.append(f"{code} ({name}, Image: {img}, Wins: {wins})")
                    print(f"    Match {m_idx} [{state}]: {' vs '.join(teams_info)}")

if __name__ == "__main__":
    inspect_matches()
