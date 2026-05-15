let regionsData = [];

document.addEventListener('DOMContentLoaded', async () => {
  initParticles('loreCanvas');
  await loadRegions();
});

async function loadRegions() {
  const container = document.getElementById('regionGrid');
  try {
    regionsData = await fetchJSON('./data/lore-regions.json');
    container.innerHTML = regionsData.map((r, i) => `
      <div class="region-card fade-in-up" style="animation-delay:${i * 0.1}s;border-left:3px solid ${r.color};" onclick="openRegion('${r.id}')">
        <div class="region-card-body">
          <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:0.75rem;">
            <div style="width:12px;height:12px;border-radius:50%;background:${r.color};box-shadow:0 0 10px ${r.color};"></div>
            <h3 class="region-card-name">${r.name}</h3>
          </div>
          <p class="region-card-desc">${r.description.substring(0, 120)}...</p>
          <div style="margin-top:1rem;display:flex;flex-wrap:wrap;gap:0.4rem;">
            ${r.champions.slice(0, 5).map(c => `<span class="tag">${c}</span>`).join('')}
            ${r.champions.length > 5 ? `<span class="tag" style="background:rgba(200,170,110,0.1);color:var(--gold);">+${r.champions.length - 5}</span>` : ''}
          </div>
        </div>
      </div>
    `).join('');
  } catch (e) {
    container.innerHTML = '<div class="loading">Failed to load regions.</div>';
  }
}

function openRegion(id) {
  const r = regionsData.find(r => r.id === id);
  if (!r) return;
  const modal = document.getElementById('regionModal');
  const content = document.getElementById('regionModalContent');
  content.innerHTML = `
    <div style="display:flex;align-items:center;gap:1rem;margin-bottom:1.5rem;">
      <div style="width:16px;height:16px;border-radius:50%;background:${r.color};box-shadow:0 0 15px ${r.color};"></div>
      <h2 style="font-family:var(--font-display);font-size:2rem;color:var(--gold-light);">${r.name}</h2>
    </div>
    <div class="lore-text" style="margin-bottom:2rem;">${r.description}</div>
    <h3 style="color:var(--gold);margin-bottom:1rem;font-size:1.1rem;">Champions of ${r.name}</h3>
    <div class="champion-grid" style="grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:1rem;">
      ${r.champions.map(name => {
        // Try to construct DDragon URL (name might differ from id)
        const id = name.replace(/[' ]/g, '').replace('Cho\'Gath','Chogath').replace('Kog\'Maw','KogMaw').replace('Kha\'Zix','Khazix').replace('Bel\'Veth','Belveth').replace('Rek\'Sai','RekSai').replace('Vel\'Koz','Velkoz').replace('Kai\'Sa','Kaisa').replace('Nunu & Willump','Nunu').replace('Jarvan IV','JarvanIV').replace('Lee Sin','LeeSin').replace('Miss Fortune','MissFortune').replace('Xin Zhao','XinZhao').replace('Twisted Fate','TwistedFate').replace('Tahm Kench','TahmKench').replace('Aurelion Sol','AurelionSol').replace('Dr. Mundo','DrMundo').replace('Master Yi','MasterYi').replace('Renata Glasc','Renata');
        return `
          <a href="champion.html?id=${id}" class="champion-card" style="text-decoration:none;">
            <div style="overflow:hidden;">
              <img class="champion-card-img" src="${championSquareUrl(id)}" alt="${name}" loading="lazy"
                onerror="this.style.display='none'">
            </div>
            <div class="champion-card-body" style="padding:0.6rem;">
              <div class="champion-card-name" style="font-size:0.85rem;">${name}</div>
            </div>
          </a>`;
      }).join('')}
    </div>
  `;
  modal.style.display = 'block';
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('regionModal').style.display = 'none';
  document.body.style.overflow = '';
}

// Close on ESC
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
