let regionsData = [];

document.addEventListener('DOMContentLoaded', async () => {
  initParticles('loreCanvas');
  await loadRegions();
});

async function loadRegions() {
  const gridContainer = document.getElementById('regionGrid');
  const mapContainer = document.getElementById('interactiveMap');
  try {
    regionsData = await fetchJSON('./data/lore-regions.json');
    
    // Render Grid
    gridContainer.innerHTML = regionsData.map((r, i) => `
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

    // Pre-defined map coordinates (approximate percentages for top/left)
    const mapCoords = {
      demacia: { top: '45%', left: '20%' },
      noxus: { top: '35%', left: '55%' },
      ionia: { top: '25%', left: '80%' },
      freljord: { top: '15%', left: '35%' },
      shurima: { top: '75%', left: '60%' },
      shadow_isles: { top: '70%', left: '85%' },
      bilgewater: { top: '65%', left: '75%' },
      piltover: { top: '45%', left: '68%' },
      zaun: { top: '50%', left: '68%' },
      targon: { top: '65%', left: '35%' },
      ixtal: { top: '75%', left: '70%' },
      void: { top: '85%', left: '80%' }
    };

    // Render Map Points
    mapContainer.innerHTML += regionsData.map((r, i) => {
      const coords = mapCoords[r.id] || { top: '50%', left: '50%' };
      return `
        <div class="map-point" style="position:absolute; top:${coords.top}; left:${coords.left}; transform:translate(-50%, -50%); cursor:pointer; text-align:center; animation: fadeIn 0.5s ease forwards ${i * 0.1}s; opacity:0;" onclick="openRegion('${r.id}')">
          <div style="width:16px; height:16px; background:${r.color}; border-radius:50%; margin:0 auto; box-shadow:0 0 15px ${r.color}; border:2px solid #fff; transition:transform 0.2s;"></div>
          <div style="margin-top:0.4rem; background:rgba(0,0,0,0.7); padding:0.2rem 0.5rem; border-radius:4px; font-weight:600; font-size:0.8rem; border:1px solid ${r.color}; white-space:nowrap;">${r.name}</div>
        </div>
      `;
    }).join('');

    // Setup Toggle
    document.getElementById('viewToggle').addEventListener('click', e => {
      if (!e.target.classList.contains('filter-btn')) return;
      document.querySelectorAll('#viewToggle .filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      const view = e.target.dataset.view;
      if (view === 'map') {
        mapContainer.style.display = 'block';
        gridContainer.style.display = 'none';
      } else {
        mapContainer.style.display = 'none';
        gridContainer.style.display = 'grid';
      }
    });
    
  } catch (e) {
    gridContainer.innerHTML = '<div class="loading">Failed to load regions.</div>';
    mapContainer.innerHTML = '<div class="loading">Failed to load map.</div>';
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
