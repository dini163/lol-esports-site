// Home page logic
document.addEventListener('DOMContentLoaded', async () => {
  initParticles('heroCanvas');
  loadMatches();
  loadFeaturedChampions();
  loadNews();
});

async function loadMatches() {
  const container = document.getElementById('matchList');
  try {
    const matches = await fetchJSON('./data/schedule.json?t=' + Date.now());
    const priority = { live: 1, upcoming: 2, completed: 3 };
    matches.sort((a, b) => priority[a.status] - priority[b.status]);
    const top = matches.slice(0, 4);
    container.innerHTML = top.map(m => {
      const d = new Date(m.start_time);
      const time = formatTime(m.start_time);
      const date = formatDate(m.start_time);
      const liveClass = m.status === 'live' ? ' live' : '';
      return `
        <div class="match-card${liveClass}">
          <div class="match-league">
            <div class="match-league-name">${m.league}</div>
            <div class="match-league-time">${date} · ${time}</div>
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
  } catch (e) {
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
