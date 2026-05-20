document.addEventListener('DOMContentLoaded', async () => {
  initParticles('metaCanvas');
  await loadMetaData();
});

async function loadMetaData() {
  const patchContainer = document.getElementById('patchNotes');
  const tierContainer = document.getElementById('tierList');
  
  try {
    const data = await fetchJSON('./data/meta.json');
    
    // Render Patch Notes
    patchContainer.innerHTML = `
      <div style="background:var(--bg-secondary); border:1px solid var(--border); border-radius:var(--radius-md); padding:2rem;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
          <h2 style="font-size:1.5rem; color:var(--gold-light); margin:0;">Patch ${data.patch} Highlights</h2>
          <span class="tag" style="background:var(--gold-dark); color:#fff;">Live</span>
        </div>
        <ul style="list-style:none; padding:0; margin:0; display:grid; gap:1rem;">
          ${data.highlights.map(h => `
            <li style="display:flex; gap:1rem; align-items:flex-start;">
              <span style="color:var(--gold); font-size:1.2rem; line-height:1;">•</span>
              <span style="color:var(--text); line-height:1.5;">${h}</span>
            </li>
          `).join('')}
        </ul>
      </div>
    `;

    // Render Tier List
    let tierHTML = '';
    const tierColors = {
      'S': '#ff4e50',
      'A': '#f9d423',
      'B': '#a8ff78',
      'C': '#4facfe'
    };

    for (const [tier, champs] of Object.entries(data.tiers)) {
      const color = tierColors[tier] || 'var(--gold)';
      tierHTML += `
        <div style="display:flex; background:var(--bg-card); border:1px solid var(--border); border-radius:var(--radius-sm); overflow:hidden; margin-bottom:1.5rem;">
          <div style="background:${color}; width:80px; display:flex; align-items:center; justify-content:center; font-size:2rem; font-weight:800; color:#000;">
            ${tier}
          </div>
          <div style="padding:1.5rem; flex:1; display:grid; grid-template-columns:repeat(auto-fill, minmax(300px, 1fr)); gap:1.5rem;">
            ${champs.map(c => {
              // Format id for ddragon URL
              const id = c.champion.replace(/[' ]/g, '');
              return `
                <a href="champion.html?id=${id}" style="display:flex; gap:1rem; text-decoration:none; align-items:center; background:var(--bg-secondary); padding:0.8rem; border-radius:var(--radius-sm); border:1px solid transparent; transition:border 0.2s;">
                  <img src="${championSquareUrl(id)}" alt="${c.champion}" style="width:48px; height:48px; border-radius:50%; border:2px solid ${color};" onerror="this.style.display='none'">
                  <div>
                    <div style="font-weight:600; color:var(--text); display:flex; align-items:center; gap:0.5rem;">
                      ${c.champion} <span style="font-size:0.65rem; background:rgba(255,255,255,0.1); padding:0.1rem 0.4rem; border-radius:4px; color:var(--text-muted);">${c.role}</span>
                    </div>
                    <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.3rem;">${c.reason}</div>
                  </div>
                </a>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }
    tierContainer.innerHTML = tierHTML;
    
  } catch (e) {
    console.error(e);
    patchContainer.innerHTML = '<div class="loading">Failed to load patch notes.</div>';
    tierContainer.innerHTML = '<div class="loading">Failed to load tier list.</div>';
  }
}
