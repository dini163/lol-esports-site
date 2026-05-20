import requests
import json
import sys

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

def inspect():
    for league, t_id in LEAGUES_TO_TOURNAMENTS.items():
        print(f"\n=================== {league} (ID: {t_id}) ===================")
        url = "https://prod-relapi.ewp.gg/persisted/gw/getStandings"
        params = {"hl": "en-US", "tournamentId": t_id}
        try:
            res = requests.get(url, headers=HEADERS, params=params)
            print(f"Status Code: {res.status_code}")
            if res.status_code != 200:
                print(f"Failed to fetch standings: {res.status_code}")
                continue
                
            data = res.json()
            standings = data.get("data", {}).get("standings", [])
            if not standings:
                print("Empty standings list")
                continue
                
            stages = standings[0].get("stages", [])
            print(f"Stages found: {len(stages)}")
            for stage in stages:
                slug = stage.get("slug")
                print(f"  Stage: {slug} | Type: {stage.get('type')}")
                sections = stage.get("sections", [])
                print(f"    Found {len(sections)} sections.")
                for i, sec in enumerate(sections):
                    rankings = sec.get("rankings", [])
                    matches = sec.get("matches", [])
                    print(f"      Section {i}: rankings count = {len(rankings)}, matches count = {len(matches)}")
                    if rankings:
                        print(f"        Rankings team 1 details:")
                        r0 = rankings[0]
                        print(f"          Ordinal: {r0.get('ordinal')}")
                        for t in r0.get("teams", [])[:2]:
                            print(f"            Team: {t.get('code')} ({t.get('name')}), Image: {t.get('image')}, Record: {t.get('record')}")
                    if matches:
                        print(f"        Sample match 1 state: {matches[0].get('state')}")
                        print(f"          Teams: {[t.get('code') for t in matches[0].get('teams', [])]}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    inspect()
