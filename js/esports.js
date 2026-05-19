let matchesData = [];
let standingsData = {};
let teamsData = [];
let currentLeagueFilter = 'all';
let currentStandingsRegion = 'LPL';
let currentStandingsMode = 'regular'; // 'regular' or 'playoffs'

document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([loadSchedule(), loadStandings(), loadTeams()]);
  setupLeagueFilters();
  setupStandingsRegion();
  setupStandingsMode();
  // Auto-refresh schedule every 60 seconds
  setInterval(() => { loadSchedule(); }, 60000);
});

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.tab-btn[data-tab="${tab}`)?.classList.add('active');
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
}

// ---- Schedule ----
async function loadSchedule() {
  try {
    if (typeof fetchScheduleWithFallback === 'function') {
      matchesData = await fetchScheduleWithFallback(['lpl', 'lck', 'lec', 'lcs']);
    } else {
      matchesData = await fetchJSON('./data/schedule.json?t=' + Date.now());
    }
    renderSchedule(currentLeagueFilter === 'all' ? matchesData : matchesData.filter(m => m.league_code === currentLeagueFilter));
  } catch (e) {
    console.error('Failed to load schedule:', e);
    document.getElementById('scheduleList').innerHTML = '<div class="loading">Failed to load schedule.</div>';
  }
}

function renderSchedule(matches) {
  const container = document.getElementById('scheduleList');
  if (!matches.length) { container.innerHTML = '<div class="loading">No matches found.</div>'; return; }
  
  const now = new Date();
  const todayTime = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  const uniqueDays = [...new Set(matches.map(m => {
    const d = new Date(m.start_time);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  }))].sort((a, b) => a - b);
  
  const pastDays = uniqueDays.filter(d => d < todayTime).reverse();
  const futureDays = uniqueDays.filter(d => d > todayTime);
  const hasToday = uniqueDays.includes(todayTime);
  
  const orderedDays = [];
  if (hasToday) {
    orderedDays.push(todayTime);
    orderedDays.push(...futureDays);
    orderedDays.push(...pastDays);
  } else {
    if (pastDays.length > 0) orderedDays.push(pastDays[0]);
    orderedDays.push(...futureDays);
    if (pastDays.length > 1) orderedDays.push(...pastDays.slice(1));
  }
  
  matches.sort((a, b) => {
    const dA = new Date(a.start_time);
    const dB = new Date(b.start_time);
    const dayA = new Date(dA.getFullYear(), dA.getMonth(), dA.getDate()).getTime();
    const dayB = new Date(dB.getFullYear(), dB.getMonth(), dB.getDate()).getTime();
    const scoreA = orderedDays.indexOf(dayA);
    const scoreB = orderedDays.indexOf(dayB);
    if (scoreA !== scoreB) return scoreA - scoreB;
    return dA - dB;
  });

  container.innerHTML = matches.map(m => {
    const liveClass = m.status === 'live' ? ' live' : '';
    const logoA = m.team_a.image ? `<img src="${m.team_a.image}" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:50%;">` : m.team_a.name.substring(0, 3);
    const logoB = m.team_b.image ? `<img src="${m.team_b.image}" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:50%;">` : m.team_b.name.substring(0, 3);
    return `
      <div class="match-card${liveClass}">
        <div class="match-league">
          <div class="match-league-name">${m.league}</div>
          <div class="match-league-time">${formatDate(m.start_time)} · ${formatTime(m.start_time)}</div>
        </div>
        <div class="match-team team-a">
          <span class="match-team-name">${m.team_a.name}</span>
          <div class="match-team-logo">${logoA}</div>
        </div>
        <div class="match-vs">
          <div class="match-score">${m.team_a.score} : ${m.team_b.score}</div>
          <div class="match-vs-label">${m.status === 'live' ? '<span class="live-dot"></span>LIVE' : m.status === 'upcoming' ? 'UPCOMING' : 'FINAL'}</div>
        </div>
        <div class="match-team team-b">
          <div class="match-team-logo">${logoB}</div>
          <span class="match-team-name">${m.team_b.name}</span>
        </div>
        <div class="match-status ${m.status}">
          ${m.status === 'live' ? '<span class="live-dot"></span> LIVE' : m.status === 'upcoming' ? 'UPCOMING' : 'FINAL'}
        </div>
      </div>`;
  }).join('');
}

function setupLeagueFilters() {
  document.getElementById('leagueFilters')?.addEventListener('click', e => {
    if (!e.target.classList.contains('filter-btn')) return;
    document.querySelectorAll('#leagueFilters .filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentLeagueFilter = e.target.dataset.league;
    renderSchedule(currentLeagueFilter === 'all' ? matchesData : matchesData.filter(m => m.league_code === currentLeagueFilter));
  });
}

// ---- Standings ----
async function loadStandings() {
  try {
    const leagues = ['lpl', 'lck', 'lec', 'lcs'];
    const results = await Promise.allSettled(
      leagues.map(slug => fetchStandings(slug))
    );

    // Check if standings API returned data
    let hasData = false;
    leagues.forEach((slug, i) => {
      if (results[i].status === 'fulfilled' && results[i].value) {
        standingsData[slug.toUpperCase()] = results[i].value;
        hasData = true;
      }
    });

    if (!hasData) {
      // Fallback: calculate from matches + cached data
      const fallback = await fetchJSON('./data/standings.json');
      Object.keys(fallback).forEach(key => {
        if (!standingsData[key]) {
          standingsData[key] = {
            regular: fallback[key].map(t => ({
              rank: t.rank,
              team: t.team,
              teamCode: t.team.substring(0, 3),
              wins: t.wins,
              losses: t.losses,
              winrate: t.winrate,
              gameWins: 0,
              gameLosses: 0,
            })),
          };
        }
      });
    }

    renderStandings('LPL', currentStandingsMode);
  } catch (e) {
    console.error('Failed to load standings:', e);
    document.getElementById('standingsTable').innerHTML = '<div class="loading">Failed to load standings.</div>';
  }
}

function renderStandings(region, mode) {
  const container = document.getElementById('standingsTable');
  const data = standingsData[region];
  if (!data) {
    container.innerHTML = '<div class="loading">No standings data available.</div>';
    return;
  }

  const teams = (mode === 'playoffs' ? data.playoffs : data.regular) || data.regular || [];
  const modeLabel = mode === 'playoffs' ? 'Playoff Bracket' : 'Regular Season';

  container.innerHTML = `
    <div style="padding:0.75rem 1rem;border-bottom:1px solid var(--border);">
      <span class="tag">${region} ${modeLabel}</span>
    </div>
    <table class="standings-table">
      <thead>
        <tr><th>#</th><th>Team</th><th>W</th><th>L</th><th>Win Rate</th><th>Games</th></tr>
      </thead>
      <tbody>
        ${teams.map(t => `
          <tr>
            <td class="standings-rank">${t.rank}</td>
            <td><div class="standings-team">
              <div class="match-team-logo" style="width:30px;height:30px;font-size:0.6rem;">${t.teamCode || t.team.substring(0, 3)}</div>
              ${t.team}
            </div></td>
            <td style="color:var(--blue);font-weight:600;">${t.wins}</td>
            <td style="color:var(--red);font-weight:600;">${t.losses}</td>
            <td class="standings-record">${t.winrate}</td>
            <td style="color:var(--text-secondary);font-size:0.8rem;">${t.gameWins}-${t.gameLosses}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
}

function setupStandingsRegion() {
  document.getElementById('standingsRegion')?.addEventListener('click', e => {
    if (!e.target.classList.contains('filter-btn')) return;
    document.querySelectorAll('#standingsRegion .filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentStandingsRegion = e.target.dataset.region;
    renderStandings(currentStandingsRegion, currentStandingsMode);
  });
}

function setupStandingsMode() {
  // Add regular/playoff toggle if it doesn't exist
  const regionDiv = document.getElementById('standingsRegion');
  if (!regionDiv) return;

  // Check if mode toggle already exists
  if (document.getElementById('standingsMode')) return;

  const modeDiv = document.createElement('div');
  modeDiv.id = 'standingsMode';
  modeDiv.className = 'filter-group';
  modeDiv.style.marginTop = '0.75rem';
  modeDiv.innerHTML = `
    <button class="filter-btn active" data-mode="regular">Regular Season</button>
    <button class="filter-btn" data-mode="playoffs">Playoffs</button>
  `;
  regionDiv.parentNode.insertBefore(modeDiv, regionDiv.nextSibling);

  modeDiv.addEventListener('click', e => {
    if (!e.target.classList.contains('filter-btn')) return;
    modeDiv.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentStandingsMode = e.target.dataset.mode;
    renderStandings(currentStandingsRegion, currentStandingsMode);
  });
}

// ---- Teams ----
async function loadTeams() {
  try {
    teamsData = await fetchJSON('./data/teams.json');
    renderTeams(teamsData);
  } catch (e) {
    document.getElementById('teamsGrid').innerHTML = '<div class="loading">Failed to load teams.</div>';
  }
}

function renderTeams(teams) {
  const container = document.getElementById('teamsGrid');
  container.innerHTML = teams.map(t => `
    <div class="card" style="padding:1.5rem;">
      <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;">
        <div class="match-team-logo" style="width:48px;height:48px;font-size:0.8rem;">${t.name.substring(0, 3)}</div>
        <div>
          <div style="font-weight:700;font-size:1.1rem;color:var(--gold-light);">${t.name}</div>
          <div class="tag" style="margin-top:0.25rem;">${t.region}</div>
        </div>
      </div>
      <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:1px;">Roster</div>
      <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
        ${t.players.map((p, i) => {
          const roles = ['TOP','JGL','MID','BOT','SUP'];
          return `<div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.4rem 0.7rem;font-size:0.8rem;">
            <span style="color:var(--text-muted);font-size:0.65rem;">${roles[i] || ''}</span> <span style="color:var(--gold-light);font-weight:600;">${p}</span>
          </div>`;
        }).join('')}
      </div>
    </div>
  `).join('');
}
