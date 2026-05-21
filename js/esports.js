let matchesData = [];
let standingsData = {};
let teamsData = [];
let playersData = {};
let rankingsData = [];
let currentLeagueFilter = 'all';
let currentStandingsRegion = 'LPL';
let currentStandingsMode = 'regular'; // 'regular' or 'playoffs'
let currentTeamsRegion = 'all';
let currentRankingsRegion = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  await loadStandings();
  await Promise.all([loadSchedule(), loadTeams(), loadWorldRankings()]);
  setupLeagueFilters();
  setupStandingsRegion();
  setupStandingsMode();
  setupTeamsRegion();
  setupRankingsRegionFilters();

  // Route tab parameter
  const urlTab = getUrlParam('tab');
  if (urlTab) {
    switchTab(urlTab);
  }

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
    const nameA = m.team_a.code || m.team_a.name;
    const nameB = m.team_b.code || m.team_b.name;
    const logoA = m.team_a.image ? `<img src="${secureUrl(m.team_a.image)}" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:50%;">` : nameA.substring(0, 3);
    const logoB = m.team_b.image ? `<img src="${secureUrl(m.team_b.image)}" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:50%;">` : nameB.substring(0, 3);
    return `
      <div class="match-card${liveClass}">
        <div class="match-league">
          <div class="match-league-name">${m.league}</div>
          <div class="match-league-time">${formatDate(m.start_time)} · ${formatTime(m.start_time)}</div>
        </div>
        <div class="match-team team-a">
          <span class="match-team-name" title="${m.team_a.name}">${nameA}</span>
          <div class="match-team-logo">${logoA}</div>
        </div>
        <div class="match-vs">
          <div class="match-score">${m.team_a.score} : ${m.team_b.score}</div>
          <div class="match-vs-label">${m.status === 'live' ? '<span class="live-dot"></span>LIVE' : m.status === 'upcoming' ? 'UPCOMING' : 'FINAL'}</div>
        </div>
        <div class="match-team team-b">
          <div class="match-team-logo">${logoB}</div>
          <span class="match-team-name" title="${m.team_b.name}">${nameB}</span>
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
    leagues.forEach((slug, i) => {
      if (results[i].status === 'fulfilled' && results[i].value) {
        standingsData[slug.toUpperCase()] = results[i].value;
      }
    });

    // Load fallback / local baseline standings to populate or fill missing playoffs data
    const fallback = await fetchJSON('./data/standings.json');
    Object.keys(fallback).forEach(key => {
      if (!standingsData[key]) {
        standingsData[key] = { regular: [], playoffs: [] };
      }
      
      // If regular is missing or empty, use fallback
      if (!standingsData[key].regular || standingsData[key].regular.length === 0) {
        standingsData[key].regular = (fallback[key].regular || []).map(t => ({
          rank: t.rank,
          team: t.team,
          teamCode: t.teamCode || t.team.substring(0, 3),
          teamImage: t.teamImage || t.image || '',
          wins: t.wins,
          losses: t.losses,
          winrate: t.winrate,
          gameWins: t.gameWins || 0,
          gameLosses: t.gameLosses || 0,
        }));
      }

      // If playoffs is missing or empty, use fallback
      if (!standingsData[key].playoffs || standingsData[key].playoffs.length === 0) {
        standingsData[key].playoffs = (fallback[key].playoffs || []).map(t => ({
          rank: t.rank,
          team: t.team,
          teamCode: t.teamCode || t.team.substring(0, 3),
          teamImage: t.teamImage || t.image || '',
          wins: t.wins,
          losses: t.losses,
          winrate: t.winrate,
          gameWins: t.gameWins || 0,
          gameLosses: t.gameLosses || 0,
        }));
      }
    });

    renderStandings(currentStandingsRegion, currentStandingsMode);
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

  const teams = (mode === 'playoffs' ? data.playoffs : data.regular) || [];
  const modeLabel = mode === 'playoffs' ? 'Playoffs' : 'Regular Season';

  container.innerHTML = `
    <div style="padding:0.75rem 1rem;border-bottom:1px solid var(--border);">
      <span class="tag">${region} ${modeLabel}</span>
    </div>
    <table class="standings-table">
      <thead>
        <tr><th>#</th><th>Team</th><th>W</th><th>L</th><th>Win Rate</th><th>Games</th></tr>
      </thead>
      <tbody>
        ${teams.map(t => {
          const logo = t.teamImage 
            ? `<img src="${secureUrl(t.teamImage)}" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:50%;">` 
            : (t.teamCode || t.team.substring(0, 3));
          return `
            <tr>
              <td class="standings-rank">${t.rank}</td>
              <td><div class="standings-team" title="${t.team}">
                <div class="match-team-logo" style="width:30px;height:30px;font-size:0.6rem;display:flex;align-items:center;justify-content:center;">${logo}</div>
                <div style="display:flex;flex-direction:column;line-height:1.2;">
                  <span style="font-weight:700;color:var(--gold-light);">${t.teamCode || t.team}</span>
                  <span class="full-name-secondary" style="font-size:0.75rem;color:var(--text-muted);font-weight:400;">${t.team}</span>
                </div>
              </div></td>
              <td style="color:var(--blue);font-weight:600;">${t.wins}</td>
              <td style="color:var(--red);font-weight:600;">${t.losses}</td>
              <td class="standings-record">${t.winrate}</td>
              <td style="color:var(--text-secondary);font-size:0.8rem;">${t.gameWins}-${t.gameLosses}</td>
            </tr>`;
        }).join('')}
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
    const [teams, players] = await Promise.all([
      fetchJSON('./data/teams.json'),
      fetchJSON('./data/players.json')
    ]);
    
    // Filter out non-LoL/inactive teams based on standingsData
    const activeTeamCodes = new Set();
    const activeTeamNames = new Set();
    Object.values(standingsData).forEach(leagueData => {
      const allTeams = [...(leagueData.regular || []), ...(leagueData.playoffs || [])];
      allTeams.forEach(t => {
        if (t.teamCode) activeTeamCodes.add(t.teamCode.toUpperCase());
        if (t.team) activeTeamNames.add(t.team.toUpperCase());
      });
    });

    teamsData = teams.filter(t => {
      const codeUpper = (t.code || '').toUpperCase();
      const nameUpper = (t.name || '').toUpperCase();
      const cleanNameUpper = nameUpper.replace(/\s+ESPORTS$/i, '').replace(/\s+GAMING$/i, '').trim();
      
      return activeTeamCodes.has(codeUpper) || 
             activeTeamNames.has(nameUpper) ||
             activeTeamNames.has(cleanNameUpper);
    });

    playersData = players;
    renderTeams(teamsData);
  } catch (e) {
    console.error('Failed to load teams/players:', e);
    document.getElementById('teamsGrid').innerHTML = '<div class="loading">Failed to load teams.</div>';
  }
}

const roleOrder = {
  'TOP': 1,
  'JUNGLE': 2,
  'MID': 3,
  'BOT': 4,
  'BOTTOM': 4,
  'ADC': 4,
  'SUPPORT': 5,
  'SUP': 5
};

function getShortRole(role) {
  if (!role) return '???';
  const r = role.toUpperCase();
  if (r === 'TOP') return 'TOP';
  if (r === 'JUNGLE' || r === 'JGL') return 'JGL';
  if (r === 'MID') return 'MID';
  if (r === 'BOT' || r === 'BOTTOM' || r === 'ADC') return 'BOT';
  if (r === 'SUPPORT' || r === 'SUP') return 'SUP';
  return r;
}

function renderTeams(teams) {
  const container = document.getElementById('teamsGrid');
  if (!teams || teams.length === 0) {
    container.innerHTML = '<div class="loading">No teams found.</div>';
    return;
  }
  
  const filteredTeams = currentTeamsRegion === 'all' 
    ? teams 
    : teams.filter(t => t.region === currentTeamsRegion);
    
  if (filteredTeams.length === 0) {
    container.innerHTML = '<div class="loading">No active teams found for this region.</div>';
    return;
  }
  
  container.innerHTML = filteredTeams.map(t => {
    const logo = t.image 
      ? `<img src="${secureUrl(t.image)}" alt="${t.name}" style="width:100%;height:100%;object-fit:contain;border-radius:50%;">` 
      : `<div style="font-weight:700;font-size:0.9rem;color:var(--gold);">${t.code || t.name.substring(0, 3)}</div>`;
      
    const teamPlayers = [...t.players].map(playerName => {
      const playerObj = playersData[playerName] || { ign: playerName, role: 'UNKNOWN' };
      return playerObj;
    }).sort((a, b) => {
      const orderA = roleOrder[a.role?.toUpperCase()] || 99;
      const orderB = roleOrder[b.role?.toUpperCase()] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a.ign.localeCompare(b.ign);
    });
    
    return `
      <div class="card" style="padding:1.5rem;display:flex;flex-direction:column;justify-content:space-between;transition:transform 0.2s,box-shadow 0.2s;" onmouseover="this.style.transform='translateY(-4px)';this.style.boxShadow='0 8px 24px rgba(0,0,0,0.4)';" onmouseout="this.style.transform='none';this.style.boxShadow='none';">
        <div>
          <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1rem;">
            <div class="match-team-logo" style="width:48px;height:48px;font-size:0.8rem;display:flex;align-items:center;justify-content:center;background:var(--bg-secondary);border:1px solid var(--border);border-radius:50%;overflow:hidden;">${logo}</div>
            <div>
              <div style="font-weight:800;font-size:1.3rem;color:var(--gold-light);line-height:1.1;">${t.code || t.name}</div>
              <div style="font-size:0.8rem;color:var(--text-muted);margin-top:0.15rem;">${t.name}</div>
              <div class="tag" style="margin-top:0.35rem;background:var(--bg-secondary);border-color:var(--gold-dark);color:var(--gold-light);">${t.region}</div>
            </div>
          </div>
          <div style="font-size:0.8rem;color:var(--text-muted);margin-bottom:0.5rem;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Roster</div>
          <div style="display:flex;flex-wrap:wrap;gap:0.5rem;">
            ${teamPlayers.map(p => {
              const shortRole = getShortRole(p.role);
              return `
                <div style="background:var(--bg-secondary);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.4rem 0.7rem;font-size:0.8rem;display:flex;align-items:center;gap:0.4rem;">
                  <span style="color:var(--text-muted);font-size:0.65rem;font-weight:700;">${shortRole}</span> 
                  <a href="player.html?id=${p.ign}" style="color:var(--gold-light);font-weight:600;text-decoration:none;transition:color 0.2s;" onmouseover="this.style.color='var(--gold)'" onmouseout="this.style.color='var(--gold-light)'">${p.ign}</a>
                </div>`;
            }).join('')}
          </div>
        </div>
      </div>`;
  }).join('');
}

function setupTeamsRegion() {
  document.getElementById('teamRegionFilters')?.addEventListener('click', e => {
    if (!e.target.classList.contains('filter-btn')) return;
    document.querySelectorAll('#teamRegionFilters .filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentTeamsRegion = e.target.dataset.region;
    renderTeams(teamsData);
  });
}

// ---- World Rankings ----
async function loadWorldRankings() {
  try {
    rankingsData = await fetchJSON('./data/rankings.json?t=' + Date.now());
    renderWorldRankings(currentRankingsRegion);
  } catch (e) {
    console.error('Failed to load world rankings:', e);
    const container = document.getElementById('rankingsContainer');
    if (container) {
      container.innerHTML = '<div class="loading">Failed to load rankings.</div>';
    }
  }
}

function renderWorldRankings(region) {
  const container = document.getElementById('rankingsContainer');
  if (!container) return;
  
  const filtered = region === 'all' 
    ? rankingsData 
    : rankingsData.filter(t => t.region.toUpperCase() === region.toUpperCase());
    
  if (filtered.length === 0) {
    container.innerHTML = '<div class="loading">No rankings found for this region.</div>';
    return;
  }
  
  container.innerHTML = `
    <table class="rankings-table">
      <thead>
        <tr>
          <th style="width: 70px;">Rank</th>
          <th>Team</th>
          <th>Region</th>
          <th>Record (WR)</th>
          <th>Domestic Rank</th>
          <th>Power Score</th>
          <th style="width: 80px;">Trend</th>
        </tr>
      </thead>
      <tbody>
        ${filtered.map(t => {
          let badgeClass = 'rank-badge';
          if (t.rank === 1) badgeClass += ' rank-badge-1';
          else if (t.rank === 2) badgeClass += ' rank-badge-2';
          else if (t.rank === 3) badgeClass += ' rank-badge-3';
          
          let trendIcon = '●';
          if (t.trend === 'up') trendIcon = '▲ ' + (t.trendValue || '');
          else if (t.trend === 'down') trendIcon = '▼ ' + (t.trendValue || '');
          
          const trendClass = t.trend || 'stable';
          const logo = t.image 
            ? `<img src="${secureUrl(t.image)}" alt="" style="width:100%;height:100%;object-fit:contain;">` 
            : t.code.substring(0,3);
            
          return `
            <tr class="rankings-row" data-team-id="${t.teamId}" data-rank="${t.rank}" onclick="toggleRankingsAccordion(${t.rank})">
              <td style="font-weight:800;"><div class="${badgeClass}">${t.rank}</div></td>
              <td>
                <div class="standings-team">
                  <div class="match-team-logo" style="width:30px;height:30px;font-size:0.6rem;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);border-radius:50%;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">${logo}</div>
                  <div style="display:flex;flex-direction:column;line-height:1.2;">
                    <span style="font-weight:700;color:var(--gold-light);">${t.code}</span>
                    <span class="full-name-secondary" style="font-size:0.75rem;color:var(--text-muted);font-weight:400;">${t.name}</span>
                  </div>
                </div>
              </td>
              <td><span class="region-badge ${t.region.toLowerCase()}">${t.region}</span></td>
              <td style="font-weight:600;color:var(--gold-light);">${t.record} <span style="font-size:0.8rem;color:var(--text-secondary);font-weight:400;">(${t.winrate})</span></td>
              <td style="color:var(--text-secondary);font-size:0.9rem;">${t.domesticRank}</td>
              <td style="font-weight:700;color:var(--blue);font-size:1rem;">${t.rating > 500 ? Math.round(t.rating).toLocaleString() : t.rating.toFixed(1)}</td>
              <td><span class="trend-indicator ${trendClass}" style="gap:0.2rem;">${trendIcon}</span></td>
            </tr>
            <tr class="rankings-detail-row" id="rankings-detail-${t.rank}">
              <td colspan="7">
                <div class="rankings-expanded-content" id="rankings-expanded-content-${t.rank}">
                  <!-- Loaded dynamically inside toggleRankingsAccordion -->
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function setupRankingsRegionFilters() {
  document.getElementById('rankingsRegionFilters')?.addEventListener('click', e => {
    if (!e.target.classList.contains('filter-btn')) return;
    document.querySelectorAll('#rankingsRegionFilters .filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentRankingsRegion = e.target.dataset.region;
    renderWorldRankings(currentRankingsRegion);
  });
}

function toggleRankingsAccordion(rank) {
  const detailRow = document.getElementById(`rankings-detail-${rank}`);
  if (!detailRow) return;
  
  const isExpanded = detailRow.classList.contains('expanded');
  
  // Collapse all details first
  document.querySelectorAll('.rankings-detail-row').forEach(row => {
    row.classList.remove('expanded');
  });
  
  if (!isExpanded) {
    detailRow.classList.add('expanded');
    
    // Render content for this team
    const contentContainer = document.getElementById(`rankings-expanded-content-${rank}`);
    const teamDataFromRank = rankingsData.find(t => t.rank === rank);
    
    if (contentContainer && teamDataFromRank) {
      // Find full roster from teamsData
      const fullTeam = teamsData.find(tm => tm.id === teamDataFromRank.teamId || tm.code === teamDataFromRank.code);
      
      let rosterHTML = '<div style="color:var(--text-muted);font-size:0.9rem;">Roster details currently unavailable.</div>';
      if (fullTeam && fullTeam.players) {
        const teamPlayers = [...fullTeam.players].map(playerName => {
          return playersData[playerName] || { ign: playerName, role: 'UNKNOWN' };
        }).sort((a, b) => {
          const orderA = roleOrder[a.role?.toUpperCase()] || 99;
          const orderB = roleOrder[b.role?.toUpperCase()] || 99;
          if (orderA !== orderB) return orderA - orderB;
          return a.ign.localeCompare(b.ign);
        });
        
        rosterHTML = `
          <div class="roster-grid-compact">
            ${teamPlayers.map(p => {
              const shortRole = getShortRole(p.role);
              return `
                <div class="roster-compact-card">
                  <span class="role">${shortRole}</span>
                  <a href="player.html?id=${p.ign}" class="ign" style="text-decoration:none;">${p.ign}</a>
                </div>`;
            }).join('')}
          </div>
        `;
      }
      
      contentContainer.innerHTML = `
        <div class="expanded-analysis">
          <h4>Analytical Commentary</h4>
          <p>${teamDataFromRank.reason}</p>
        </div>
        <div class="expanded-roster">
          <h4>Active Roster</h4>
          ${rosterHTML}
        </div>
      `;
    }
  }
}
