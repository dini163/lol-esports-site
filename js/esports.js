let matchesData = [];
let standingsData = {};
let teamsData = [];

document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([loadSchedule(), loadStandings(), loadTeams()]);
  setupLeagueFilters();
  setupStandingsRegion();
});

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.tab-btn[data-tab="${tab}"]`)?.classList.add('active');
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
}

// ---- Schedule ----
async function loadSchedule() {
  try {
    matchesData = await fetchJSON('./data/schedule.json?t=' + Date.now());
    renderSchedule(matchesData);
  } catch (e) {
    document.getElementById('scheduleList').innerHTML = '<div class="loading">Failed to load schedule.</div>';
  }
}

function renderSchedule(matches) {
  const container = document.getElementById('scheduleList');
  const priority = { live: 1, upcoming: 2, completed: 3 };
  matches.sort((a, b) => priority[a.status] - priority[b.status]);
  if (!matches.length) { container.innerHTML = '<div class="loading">No matches found.</div>'; return; }
  container.innerHTML = matches.map(m => {
    const liveClass = m.status === 'live' ? ' live' : '';
    return `
      <div class="match-card${liveClass}">
        <div class="match-league">
          <div class="match-league-name">${m.league}</div>
          <div class="match-league-time">${formatDate(m.start_time)} · ${formatTime(m.start_time)}</div>
        </div>
        <div class="match-team">
          <div class="match-team-logo">${m.team_a.name.substring(0,3)}</div>
          ${m.team_a.name}
        </div>
        <div class="match-vs">
          <div class="match-score">${m.team_a.score} : ${m.team_b.score}</div>
          <div class="match-vs-label">${m.status === 'live' ? '<span class="live-dot"></span>LIVE' : m.status === 'upcoming' ? 'UPCOMING' : 'FINAL'}</div>
        </div>
        <div class="match-team right">
          ${m.team_b.name}
          <div class="match-team-logo">${m.team_b.name.substring(0,3)}</div>
        </div>
        <div class="match-status ${m.status}">
          ${m.status === 'live' ? '● LIVE' : m.status === 'upcoming' ? 'UPCOMING' : 'FINAL'}
        </div>
      </div>`;
  }).join('');
}

function setupLeagueFilters() {
  document.getElementById('leagueFilters')?.addEventListener('click', e => {
    if (!e.target.classList.contains('filter-btn')) return;
    document.querySelectorAll('#leagueFilters .filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    const league = e.target.dataset.league;
    renderSchedule(league === 'all' ? matchesData : matchesData.filter(m => m.league_code === league));
  });
}

// ---- Standings ----
async function loadStandings() {
  try {
    standingsData = await fetchJSON('./data/standings.json');
    renderStandings('LPL');
  } catch (e) {
    document.getElementById('standingsTable').innerHTML = '<div class="loading">Failed to load standings.</div>';
  }
}

function renderStandings(region) {
  const container = document.getElementById('standingsTable');
  const teams = standingsData[region] || [];
  container.innerHTML = `
    <table class="standings-table">
      <thead>
        <tr><th>#</th><th>Team</th><th>W</th><th>L</th><th>Win Rate</th></tr>
      </thead>
      <tbody>
        ${teams.map(t => `
          <tr>
            <td class="standings-rank">${t.rank}</td>
            <td><div class="standings-team"><div class="match-team-logo" style="width:30px;height:30px;font-size:0.6rem;">${t.team.substring(0,3)}</div>${t.team}</div></td>
            <td style="color:var(--blue);font-weight:600;">${t.wins}</td>
            <td style="color:var(--red);font-weight:600;">${t.losses}</td>
            <td class="standings-record">${t.winrate}</td>
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
    renderStandings(e.target.dataset.region);
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
        <div class="match-team-logo" style="width:48px;height:48px;font-size:0.8rem;">${t.name.substring(0,3)}</div>
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
