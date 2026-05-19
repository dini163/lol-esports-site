// Home page logic
document.addEventListener('DOMContentLoaded', async () => {
  initParticles('heroCanvas');
  loadMatches();
  loadFeaturedChampions();
  loadNews();
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
      <div class="news-card">
        <img class="news-card-img" src="${n.image}" alt="${n.title}" loading="lazy">
        <div class="news-card-body">
          <div class="news-card-tag">${n.tag}</div>
          <h3 class="news-card-title">${n.title}</h3>
          <p style="font-size:0.85rem;color:var(--text-secondary);margin-top:0.5rem;line-height:1.5;">${n.summary}</p>
          <div class="news-card-date">${n.date}</div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = '<div class="loading">Failed to load news.</div>';
  }
}
