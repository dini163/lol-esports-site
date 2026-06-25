import requests
import re
import json
import os

def get_ordinal_suffix(n):
    if 11 <= (n % 100) <= 13:
        suffix = 'th'
    else:
        suffix = {1: 'st', 2: 'nd', 3: 'rd'}.get(n % 10, 'th')
    return f"{n}{suffix}"

def secure_url(url):
    if not url:
        return ""
    if url.startswith("http://"):
        return url.replace("http://", "https://")
    return url

def fetch_and_update_rankings():
    url = "https://lolesports.com/en-US/gpr"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5"
    }

    print("Fetching global rankings from Riot GPR page...")
    try:
        r = requests.get(url, headers=headers, timeout=20)
        r.raise_for_status()
    except Exception as e:
        print(f"Error fetching GPR page: {e}")
        # Graceful degradation: keep existing rankings.json instead of failing the workflow
        return

    html = r.text
    print(f"Successfully fetched GPR page. Content length: {len(html)}")

    # Locate ApolloSSRDataTransport pushes
    pattern = r'window\[Symbol\.for\("ApolloSSRDataTransport"\)\]\s*\?\?=\s*\[\]\)\.push\((.*?)\)(?=\s*</script>|\s*;|\))'
    matches = re.findall(pattern, html)
    print(f"Found {len(matches)} push blocks.")

    team_gpr_list = None
    for idx, m in enumerate(matches):
        cleaned = m.replace("undefined", "null")
        try:
            data = json.loads(cleaned)
            rehydrate_data = data.get("rehydrate", {})
            for key, val in rehydrate_data.items():
                if isinstance(val, dict) and "data" in val and "teamGPR" in val["data"]:
                    team_gpr_list = val["data"]["teamGPR"]
                    print(f"Found teamGPR in push block {idx} with rehydrate key '{key}'!")
                    break
            if team_gpr_list:
                break
        except Exception as e:
            continue

    if not team_gpr_list:
        print("Error: Could not locate teamGPR list in any ApolloSSRDataTransport block.")
        # Graceful degradation: keep existing rankings.json instead of failing the workflow
        return

    valid_teams = []
    for tg in team_gpr_list:
        if tg.get("currentTeamGPR") and tg["currentTeamGPR"].get("rank"):
            valid_teams.append(tg)

    if not valid_teams:
        print("Error: No teams with a valid current rank found in teamGPR list.")
        # Graceful degradation: keep existing rankings.json instead of failing the workflow
        return

    # Sort teams by their global rank
    valid_teams.sort(key=lambda x: x["currentTeamGPR"]["rank"])
    print(f"Total parsed global teams: {len(valid_teams)}")

    # Load existing teams data for high-quality metadata joins
    teams_json_path = os.path.join(os.path.dirname(__file__), "..", "data", "teams.json")
    teams_map = {}
    if os.path.exists(teams_json_path):
        try:
            with open(teams_json_path, "r", encoding="utf-8") as f:
                teams_data = json.load(f)
                for t in teams_data:
                    code_upper = t.get("code", "").upper()
                    name_upper = t.get("name", "").upper()
                    teams_map[code_upper] = t
                    teams_map[name_upper] = t
            print(f"Loaded {len(teams_data)} teams from teams.json for metadata mapping.")
        except Exception as e:
            print(f"Warning: Failed to parse teams.json: {e}")

    # Standard League regions mapping
    region_mapping = {
        "lpl": "LPL",
        "lck": "LCK",
        "lec": "LEC",
        "lcs": "LCS",
        "cblol": "CBLOL",
        "cblol-brazil": "CBLOL",
        "pcs": "PCS",
        "vcs": "VCS",
        "ljl": "LJL",
        "lla": "LLA"
    }

    # Dynamic commentaries
    commentaries = {
        "BLG": "Bilibili Gaming continues to demonstrate elite LPL dominance with a highly explosive early-game style. Elk and Knight provide peerless late-game carry insurance while Bin's lane pressure remains unmatched.",
        "GEN": "Gen.G Esports stands as a premier force in the LCK, displaying flawless mid-to-late game macro and suffocating draft flexes led by Chovy and Canyon's veteran control.",
        "T1": "T1 continues to be a top-tier international threat. Faker's unmatched shotcalling combined with Gumayusi's steady teamfight carries ensures they remain championship contenders.",
        "HLE": "Hanwha Life Esports boasts incredible squad synergy with Zeka and Delight orchestrating spectacular skirmishes, backed by robust late-game macro.",
        "G2": "G2 Esports reigns supreme in Europe, combining creative draft flexes and relentless high-tempo map skirmishing that continues to challenge the best in the East.",
        "TES": "Top Esports leverages explosive early skirmishing and immense mechanical prowess, though their high-risk playstyle occasionally exposes mid-game volatility.",
        "JDG": "JDG Esports displays strong teamfight coordination and a solid structural foundation, though recent inconsistency has caused minor setbacks domestically.",
        "DK": "Dplus KIA relies on ShowMaker's brilliant mid-lane playmaking and Lucid's creative jungle paths, making them a lethal dark horse against any opponent.",
        "WBG": "Weibo Gaming possesses immense clutch factor and creative team compositions, often staging spectacular playoff upsets despite regular-season volatility.",
        "FLY": "FlyQuest leads the North American LCS charge, showcasing strong team cohesion, exceptional cross-map skirmishing, and superb objective control.",
        "TL": "Team Liquid features an unyielding defensive macro and highly methodical scaling setups, establishing themselves as a primary title contender in North America.",
        "C9": "Cloud9 shows strong individual laning power and aggressive map control, making them a consistently dangerous contender in the LCS.",
        "FNC": "Fnatic maintains a high-tempo, aggressive playstyle in the LEC, capable of breaking through any defense when their coordination clicks."
    }

    # Track region counters for domestic ranks
    region_counters = {}
    formatted_rankings = []

    for tg in valid_teams:
        current = tg["currentTeamGPR"]
        prev = tg.get("previousTeamGPR") or {}
        team_info = tg.get("team") or {}
        record_info = tg.get("teamMatchRecord") or {}

        rank = current["rank"]
        gpr_score = current.get("gprScore")
        
        # Resolve record
        wins = record_info.get("wins", 0)
        losses = record_info.get("losses", 0)
        total = wins + losses
        winrate_str = f"{wins/total*100:.0f}%" if total > 0 else "0%"
        record_str = f"{wins}-{losses}"

        # Trend resolution
        prev_rank = prev.get("rank") if prev else None
        trend = "stable"
        trend_val = 0
        if prev_rank:
            if rank < prev_rank:
                trend = "up"
                trend_val = prev_rank - rank
            elif rank > prev_rank:
                trend = "down"
                trend_val = rank - prev_rank

        # Team metadata mapping
        raw_code = team_info.get("code", "").upper()
        raw_name = team_info.get("name", "")
        raw_slug = team_info.get("slug", "")

        # Join with teams.json to get high quality attributes
        local_team = teams_map.get(raw_code) or teams_map.get(raw_name.upper())
        
        team_id = local_team.get("id") if local_team else (raw_slug if raw_slug else raw_code.lower())
        team_name = local_team.get("name") if local_team else raw_name
        team_code = local_team.get("code") if local_team else raw_code
        team_image = local_team.get("image") if local_team else secure_url(team_info.get("image"))
        
        # Region mapping
        home_league = team_info.get("homeLeague") or {}
        league_slug = home_league.get("slug", "").lower()
        league_name = home_league.get("name", "")
        
        region = "UNKNOWN"
        if local_team:
            region = local_team.get("region", "UNKNOWN")
        else:
            # Fallback mappings
            for key, mapped_val in region_mapping.items():
                if key in league_slug or key in league_name.lower():
                    region = mapped_val
                    break
            if region == "UNKNOWN":
                region = home_league.get("name", "Other")

        # Increment regional counter
        region_counters[region] = region_counters.get(region, 0) + 1
        domestic_idx = region_counters[region]
        domestic_rank = f"{get_ordinal_suffix(domestic_idx)} in {region}"

        # Generate reason
        reason = commentaries.get(team_code)
        if not reason:
            # Fallback dynamic commentaries
            trend_comment = ""
            if trend == "up":
                trend_comment = f"climbing {trend_val} spots recently"
            elif trend == "down":
                trend_comment = f"experiencing a minor rank drop of {trend_val} spots"
            else:
                trend_comment = "maintaining a highly stable competitive position"

            reason = f"{team_name} occupies a competitive standing in the {region} region, {trend_comment} with a power rating score of {gpr_score} and a {record_str} ({winrate_str}) match record."

        formatted_rankings.append({
            "rank": rank,
            "teamId": team_id,
            "name": team_name,
            "code": team_code,
            "region": region,
            "image": team_image,
            "record": record_str,
            "winrate": winrate_str,
            "rating": float(gpr_score) if gpr_score else 0.0,
            "trend": trend,
            "trendValue": trend_val,
            "domesticRank": domestic_rank,
            "reason": reason
        })

    # Save to data/rankings.json
    rankings_json_path = os.path.join(os.path.dirname(__file__), "..", "data", "rankings.json")
    try:
        with open(rankings_json_path, "w", encoding="utf-8") as f:
            json.dump(formatted_rankings, f, indent=2, ensure_ascii=False)
            f.write('\n')
        print(f"Successfully updated {rankings_json_path} with {len(formatted_rankings)} official GPR team records.")
    except Exception as e:
        print(f"Error saving rankings: {e}")
        # Graceful degradation: keep existing rankings.json instead of failing the workflow
        return

if __name__ == '__main__':
    fetch_and_update_rankings()
