// LoL Esports API Client
// Fetches live schedule, standings, and match details from prod-relapi.ewp.gg

const LOL_ESPORTS_API = 'https://prod-relapi.ewp.gg/persisted/gw';
const LOL_ESPORTS_KEY = '0TvQnueqKa5mxJntVWt0w4LpLfEkrV1Ta8rQBb9Z';

// League slug → display name & code mapping
const LEAGUES = {
  lpl:  { name: 'LPL',  fullName: 'LPL Spring 2026' },
  lck:  { name: 'LCK',  fullName: 'LCK Spring 2026' },
  lec:  { name: 'LEC',  fullName: 'LEC Spring 2026' },
  lcs:  { name: 'LCS',  fullName: 'LCS Spring 2026' },
  lta:  { name: 'LTA',  fullName: 'LTA Spring 2026' },
  cblol:{ name: 'CBLOL', fullName: 'CBLOL Split 1 2026' },
  ljl:  { name: 'LJL',  fullName: 'LJL Spring 2026' },
  pcl:  { name: 'PCS',  fullName: 'PCS Spring 2026' },
  vcs:  { name: 'VCS',  fullName: 'VCS Spring 2026' },
  lco:  { name: 'LCO',  fullName: 'LCO Split 1 2026' },
};

// Known league IDs for standings API
const LEAGUE_IDS = {
  lcs:  '98767991299243165',
  lec:  '98767991302996019',
  lck:  '98767991310872058',
  lpl:  '98767991314006698',
  lta:  '105268181859494290',
  cblol:'98767991314006698',
  ljl:  '98767991325878492',
  pcl:  '98767991314006698',
  vcs:  '98767991325878498',
  lco:  '98767991349997325',
};

// Current season slug
const CURRENT_SEASON = 'season_2026';

async function apiFetch(endpoint, params = {}) {
  let urlStr = `${LOL_ESPORTS_API}/${endpoint}`;
  let first = !urlStr.includes('?');
  Object.entries(params).forEach(([k, v]) => {
    urlStr += (first ? '?' : '&') + k + '=' + v;
    first = false;
  });

  const res = await fetch(urlStr, {
    headers: {
      'x-api-key': LOL_ESPORTS_KEY,
      'Accept': 'application/json',
    },
  });
  if (!res.ok) throw new Error(`API ${endpoint}: ${res.status}`);
  return res.json();
}

/**
 * Fetch schedule for a single league (past week + next 7 days)
 */
async function fetchLeagueSchedule(leagueSlug) {
  // Do not pass start/end date as they cause 400 Bad Request
  const data = await apiFetch(`getSchedule?leagueId=${LEAGUE_IDS[leagueSlug] || ''}`, {
    hl: 'en-US'
  });

  const events = data?.data?.schedule?.events || [];
  return events.map(event => parseMatch(event, leagueSlug)).filter(Boolean);
}

/**
 * Fetch schedules for multiple leagues in parallel
 */
async function fetchAllSchedules(leagueSlugs) {
  const slugs = leagueSlugs || Object.keys(LEAGUES);
  const results = await Promise.allSettled(
    slugs.map(slug => fetchLeagueSchedule(slug))
  );
  const all = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') all.push(...r.value);
    else console.warn(`Schedule fetch failed for ${slugs[i]}:`, r.reason);
  });
  return all;
}

/**
 * Fallback: use cached schedule.json if API fails
 */
async function fetchScheduleWithFallback(leagueSlugs) {
  try {
    const matches = await fetchAllSchedules(leagueSlugs);
    if (matches.length > 0) return matches;
  } catch (e) {
    console.warn('Live API failed, falling back to cached data:', e);
  }
  // Fallback to cached schedule.json
  const res = await fetch('./data/schedule.json?t=' + Date.now());
  return res.json();
}

/**
 * Fetch standings for a league
 */
async function fetchStandings(leagueSlug) {
  // Standings are fetched and compiled in the backend via GitHub Action.
  // Direct client-side calls to getStandings are deprecated to avoid 400 Bad Request and rate limits.
  return null;
}

/**
 * Parse a match object from the API response
 */
function parseMatch(event, leagueSlug) {
  const match = event.match || event;
  const teams = match.teams || [];
  if (teams.length < 2) return null;

  const league = LEAGUES[leagueSlug] || { name: leagueSlug.toUpperCase(), fullName: leagueSlug.toUpperCase() };

  const state = event.state || match.state; // unstarted, inProgress, completed
  const status = state === 'unstarted' ? 'upcoming'
    : state === 'inProgress' ? 'live' : 'completed';

  // Score
  let scoreA = teams[0].result?.gameWins || 0;
  let scoreB = teams[1].result?.gameWins || 0;

  return {
    league: league.fullName,
    league_code: league.name.toLowerCase(),
    match: `${teams[0].name} vs ${teams[1].name}`,
    team_a: { name: teams[0].name, code: teams[0].code || teams[0].name.substring(0, 3), score: scoreA, image: secureUrl(teams[0].image) },
    team_b: { name: teams[1].name, code: teams[1].code || teams[1].name.substring(0, 3), score: scoreB, image: secureUrl(teams[1].image) },
    start_time: event.startTime || match.startTime,
    status,
    block_name: event.blockName || match.blockName, // e.g. "Week 1"
    strategy: match.strategy,
  };
}

/**
 * Calculate standings from match data (fallback when standings API fails)
 */
function calculateStandingsFromMatches(matches) {
  const teams = {};
  matches.filter(m => m.status === 'completed').forEach(m => {
    if (!teams[m.team_a.name]) teams[m.team_a.name] = { team: m.team_a.name, teamCode: m.team_a.code, wins: 0, losses: 0, gameWins: 0, gameLosses: 0 };
    if (!teams[m.team_b.name]) teams[m.team_b.name] = { team: m.team_b.name, teamCode: m.team_b.code, wins: 0, losses: 0, gameWins: 0, gameLosses: 0 };

    if (m.team_a.score > m.team_b.score) {
      teams[m.team_a.name].wins++;
      teams[m.team_b.name].losses++;
    } else if (m.team_b.score > m.team_a.score) {
      teams[m.team_b.name].wins++;
      teams[m.team_a.name].losses++;
    }
    teams[m.team_a.name].gameWins += m.team_a.score;
    teams[m.team_a.name].gameLosses += m.team_b.score;
    teams[m.team_b.name].gameWins += m.team_b.score;
    teams[m.team_b.name].gameLosses += m.team_a.score;
  });

  return Object.values(teams)
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
    .map((t, i) => ({
      ...t,
      rank: i + 1,
      winrate: t.wins + t.losses > 0 ? `${Math.round(t.wins / (t.wins + t.losses) * 100)}%` : '0%',
    }));
}
