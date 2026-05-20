document.addEventListener('DOMContentLoaded', async () => {
  const playerId = getUrlParam('id');
  if (!playerId) { window.location.href = 'esports.html'; return; }
  await loadPlayerDetail(playerId);
});

async function loadPlayerDetail(id) {
  const container = document.getElementById('playerContent');
  try {
    const playersData = await fetchJSON('./data/players.json');
    const p = playersData[id];
    
    if (!p) { 
      container.innerHTML = '<div class="loading" style="padding:8rem 2rem;">Player not found in database. <a href="esports.html" style="color:var(--gold);">Go back</a></div>'; 
      return; 
    }

    document.title = `${p.ign} (${p.name}) — LoL Esports Hub`;

    const statBars = [
      { label: 'KDA', value: p.stats.kda, max: 10 },
      { label: 'CS/Min', value: p.stats.cs_per_min, max: 12 },
      { label: 'Kill Part.', value: parseInt(p.stats.kill_participation), max: 100, suffix: '%' },
      { label: 'Win Rate', value: parseInt(p.stats.win_rate), max: 100, suffix: '%' }
    ];

    container.innerHTML = `
      <!-- Hero -->
      <div class="champ-hero" style="min-height:400px; display:flex; align-items:center;">
        <div class="champ-hero-bg" style="background-image:url('https://images.contentstack.io/v3/assets/bltad9188aa9a70543a/bltc8de06bc5ceb6f2b/5f20fbcbd72b152ce9ab4d67/Esports_Hero.jpg'); opacity:0.3;"></div>
        <div class="champ-hero-gradient" style="background:linear-gradient(to top, var(--bg-body), transparent);"></div>
        <div class="champ-hero-info" style="display:flex; align-items:center; gap:2rem; width:100%; max-width:1200px; margin:0 auto; padding:0 2rem;">
          <img src="${secureUrl(p.image)}" alt="${p.ign}" style="width:200px; height:200px; object-fit:cover; border-radius:50%; border:4px solid var(--gold); background:var(--bg-card);">
          <div>
            <div class="champion-card-tags" style="justify-content:flex-start;margin-bottom:0.75rem;">
              <span class="tag">${p.role}</span>
              <span class="tag" style="background:var(--blue); color:#fff;">${p.team}</span>
              <span class="tag">${p.region}</span>
            </div>
            <h1 class="champ-name">${p.ign}</h1>
            <p class="champ-epithet" style="color:var(--text-secondary);">${p.name}</p>
          </div>
        </div>
      </div>

      <div class="section" style="padding-top:2rem;">
        <!-- Bio & Stats -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:3rem;margin-bottom:3rem;">
          <div>
            <h2 class="section-title" style="font-size:1.4rem;">Biography</h2>
            <p style="color:var(--text-secondary); line-height:1.6; margin-top:1.5rem;">${p.bio}</p>
            
            <h2 class="section-title" style="font-size:1.4rem; margin-top:3rem;">Signature Champions</h2>
            <div style="display:flex; gap:1rem; margin-top:1.5rem;">
              ${p.signature_champions.map(champ => `
                <div style="text-align:center;">
                  <img src="${championSquareUrl(champ)}" alt="${champ}" style="width:64px; height:64px; border-radius:var(--radius-sm); border:2px solid var(--border);">
                  <div style="font-size:0.8rem; margin-top:0.5rem; color:var(--text-muted);">${champ}</div>
                </div>
              `).join('')}
            </div>
          </div>
          
          <div>
            <h2 class="section-title" style="font-size:1.4rem;">Current Split Stats</h2>
            <div style="margin-top:1.5rem;">
              ${statBars.map(s => `
                <div style="margin-bottom:1.5rem;">
                  <div style="display:flex;justify-content:space-between;margin-bottom:0.5rem;">
                    <span style="font-size:0.9rem;color:var(--text-secondary);">${s.label}</span>
                    <span style="font-size:0.9rem;color:var(--gold);font-weight:600;">${s.value}${s.suffix || ''}</span>
                  </div>
                  <div style="height:8px;background:var(--bg-secondary);border-radius:4px;overflow:hidden;">
                    <div style="height:100%;width:${(s.value / s.max) * 100}%;background:linear-gradient(90deg,var(--gold-dark),var(--gold));border-radius:4px;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Highlights -->
        ${p.highlights && p.highlights.length > 0 ? `
          <h2 class="section-title" style="font-size:1.4rem;margin-top:3rem;">Career Highlights</h2>
          <div style="margin-top:1.5rem; display:grid; grid-template-columns:repeat(auto-fill, minmax(400px, 1fr)); gap:2rem;">
            ${p.highlights.map(h => `
              <div class="card" style="overflow:hidden;">
                <div style="position:relative; padding-bottom:56.25%; height:0;">
                  <iframe src="${h.embed_url}" style="position:absolute; top:0; left:0; width:100%; height:100%; border:0;" allowfullscreen></iframe>
                </div>
                <div style="padding:1rem;">
                  <h3 style="font-size:1.1rem; color:var(--text);">${h.title}</h3>
                </div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Back -->
        <div style="margin-top:4rem;">
          <a href="esports.html" class="btn btn-outline">← Back to Esports</a>
        </div>
      </div>
    `;
  } catch (e) {
    console.error(e);
    container.innerHTML = '<div class="loading">Failed to load player data. <a href="esports.html">Go back</a></div>';
  }
}
