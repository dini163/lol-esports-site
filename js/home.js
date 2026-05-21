// Home page logic
document.addEventListener('DOMContentLoaded', async () => {
  initParticles('heroCanvas');
  
  // Wait for all asynchronous sections to load so the page has correct scrollable height
  await Promise.allSettled([
    loadMatches(),
    loadFeaturedChampions(),
    loadNews(),
    loadRankings()
  ]);
  
  // Restore scroll position if returning from an article or champion details
  const savedScroll = sessionStorage.getItem('homeScrollPos');
  if (savedScroll) {
    setTimeout(() => {
      window.scrollTo({
        top: parseInt(savedScroll, 10),
        behavior: 'instant'
      });
      sessionStorage.removeItem('homeScrollPos');
    }, 50);
  }
  
  // Save scroll position when navigating to news or champion details
  document.addEventListener('click', (e) => {
    const cardLink = e.target.closest('.news-card-link') || e.target.closest('.champion-card') || e.target.closest('.ranking-item');
    if (cardLink) {
      sessionStorage.setItem('homeScrollPos', window.scrollY);
    }
  });

  // Auto-refresh matches every 60 seconds
  setInterval(loadMatches, 60000);
});

async function loadMatches() {
  const container = document.getElementById('matchList');
  try {
    let matches;
    if (typeof fetchScheduleWithFallback === 'function') {
      matches = await fetchScheduleWithFallback(['lpl', 'lck', 'lec', 'lcs']);
    } else {
      matches = await fetchJSON('./data/schedule.json?t=' + Date.now());
    }
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
    
    const top = matches.slice(0, 8);
    container.innerHTML = top.map(m => {
      const time = formatTime(m.start_time);
      const date = formatDate(m.start_time);
      const liveClass = m.status === 'live' ? ' live' : '';
      const logoA = m.team_a.image ? `<img src="${m.team_a.image}" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:50%;">` : m.team_a.name.substring(0, 3);
      const logoB = m.team_b.image ? `<img src="${m.team_b.image}" alt="" style="width:100%;height:100%;object-fit:contain;border-radius:50%;">` : m.team_b.name.substring(0, 3);
      return `
        <div class="match-card${liveClass}">
          <div class="match-league">
            <div class="match-league-name">${m.league}</div>
            <div class="match-league-time">${date} · ${time}</div>
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
  } catch (e) {
    console.error('Failed to load matches:', e);
    container.innerHTML = '<div class="loading">Failed to load matches.</div>';
  }
}

async function loadFeaturedChampions() {
  const container = document.getElementById('featuredChamps');
  try {
    const data = await fetchJSON(`${DDRAGON_BASE}/data/en_US/champion.json`);
    const featured = ['Ahri','Yasuo','Jinx','Lux','Thresh','Zed','LeeSin','Ezreal','Kaisa','Jhin','Yone','Akali'];
    const champs = featured.map(id => data.data[id]).filter(Boolean);
    container.innerHTML = champs.map(c => `
      <a href="champion.html?id=${c.id}" class="champion-card" style="text-decoration:none;">
        <div style="overflow:hidden;">
          <img class="champion-card-img" src="${championSquareUrl(c.id)}" alt="${c.name}" loading="lazy">
        </div>
        <div class="champion-card-body">
          <div class="champion-card-name">${c.name}</div>
          <div class="champion-card-title">${c.title}</div>
          <div class="champion-card-tags">${c.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div>
        </div>
      </a>
    `).join('');
  } catch (e) {
    container.innerHTML = '<div class="loading">Failed to load champions.</div>';
  }
}

async function loadNews() {
  const container = document.getElementById('newsGrid');
  try {
    const news = await fetchJSON('./data/news.json');
    container.innerHTML = news.slice(0, 6).map(n => `
      <a href="news.html?id=${n.id}" class="news-card-link">
        <div class="news-card">
          <img class="news-card-img" src="${n.image}" alt="${n.title}" loading="lazy">
          <div class="news-card-body">
            <div class="news-card-tag">${n.tag}</div>
            <h3 class="news-card-title">${n.title}</h3>
            <p style="font-size:0.85rem;color:var(--text-secondary);margin-top:0.5rem;line-height:1.5;">${n.summary}</p>
            <div class="news-card-date">${n.date}</div>
          </div>
        </div>
      </a>
    `).join('');
  } catch (e) {
    container.innerHTML = '<div class="loading">Failed to load news.</div>';
  }
}

async function loadRankings() {
  const container = document.getElementById('rankingsSidebar');
  if (!container) return;
  try {
    const rankings = await fetchJSON('./data/rankings.json?t=' + Date.now());
    // Get Top 10 teams for the homepage sidebar
    const topRankings = rankings.slice(0, 10);
    
    container.innerHTML = `
      <div class="rankings-list">
        ${topRankings.map(t => {
          let badgeClass = 'rank-badge';
          if (t.rank === 1) badgeClass += ' rank-badge-1';
          else if (t.rank === 2) badgeClass += ' rank-badge-2';
          else if (t.rank === 3) badgeClass += ' rank-badge-3';
          
          let trendIcon = '●';
          if (t.trend === 'up') trendIcon = '▲ ' + (t.trendValue || '');
          else if (t.trend === 'down') trendIcon = '▼ ' + (t.trendValue || '');
          
          const trendClass = t.trend || 'stable';
          
          return `
            <div class="ranking-item" onclick="location.href='esports.html?tab=rankings'">
              <div class="ranking-item-left">
                <div class="${badgeClass}">${t.rank}</div>
                <div class="match-team-logo" style="width:28px;height:28px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,0.05);border-radius:50%;overflow:hidden;border:1px solid rgba(255,255,255,0.1);">
                  <img src="${secureUrl(t.image)}" alt="" style="width:100%;height:100%;object-fit:contain;">
                </div>
                <span style="font-weight:700;color:var(--gold-light);">${t.code}</span>
                <span class="region-badge ${t.region.toLowerCase()}">${t.region}</span>
              </div>
              <div class="ranking-item-right">
                <span class="trend-indicator ${trendClass}" style="font-size:0.7rem;gap:0.2rem;">${trendIcon}</span>
                <span class="rating-index">${t.rating > 500 ? Math.round(t.rating).toLocaleString() : t.rating.toFixed(1)}</span>
              </div>
            </div>`;
        }).join('')}
      </div>
      <div style="margin-top:1.2rem;text-align:center;">
        <a href="esports.html?tab=rankings" class="btn btn-outline" style="font-size:0.8rem;padding:0.4rem 1.2rem;width:100%;justify-content:center;border-color:var(--border);">View Detailed Roster Analysis</a>
      </div>
    `;
  } catch (e) {
    console.error('Failed to load rankings:', e);
    container.innerHTML = '<div class="loading">Failed to load rankings.</div>';
  }
}
