let transfersData = { timeline: [], free_agents: [] };
let currentRegion = 'all';

document.addEventListener('DOMContentLoaded', async () => {
  initParticles('heroCanvas');
  await loadTransfersData();
  setupFilters();
  switchTab('timeline'); // Default tab
});

function switchTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.tab-btn[data-tab="${tab}"]`)?.classList.add('active');
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`tab-${tab}`)?.classList.add('active');
}

async function loadTransfersData() {
  try {
    transfersData = await fetchJSON('./data/transfers.json');
    renderTimeline();
    renderFreeAgents();
  } catch (e) {
    console.error('Failed to load transfers data:', e);
    document.getElementById('transferTimeline').innerHTML = '<div class="loading">Failed to load transfer data.</div>';
    document.getElementById('freeAgentsGrid').innerHTML = '<div class="loading">Failed to load free agents.</div>';
  }
}

function renderTimeline() {
  const container = document.getElementById('transferTimeline');
  const items = currentRegion === 'all' ? transfersData.timeline : transfersData.timeline.filter(t => t.region === currentRegion);
  
  if (!items.length) {
    container.innerHTML = '<div class="loading" style="padding:2rem;">No transfer activity found for this region.</div>';
    return;
  }

  container.innerHTML = items.map(t => {
    const isRumor = t.type === 'Rumor';
    const tagColor = isRumor ? 'var(--blue)' : 'var(--gold)';
    const bgCard = 'var(--bg-card)';
    
    return `
      <div style="position:relative; margin-bottom:2rem; padding-left:1.5rem;">
        <div style="position:absolute; left:-6px; top:1.2rem; width:10px; height:10px; border-radius:50%; background:${tagColor};"></div>
        <div class="card" style="padding:1.5rem; background:${bgCard}; border-left:3px solid ${tagColor};">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:0.5rem; flex-wrap:wrap; gap:0.5rem;">
            <div style="display:flex; align-items:center; gap:0.5rem;">
              <span class="tag" style="background:${tagColor}; color:#000;">${t.type}</span>
              <span class="tag">${t.region}</span>
              <span style="font-size:0.85rem; color:var(--text-muted);">${formatDate(t.date)}</span>
            </div>
          </div>
          <h3 style="font-size:1.2rem; margin-bottom:0.5rem; color:var(--text);">
            <strong style="color:var(--gold-light);">${t.player}</strong> (${t.role})
          </h3>
          <div style="font-size:0.95rem; margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem; color:var(--text-secondary);">
            <span style="text-decoration:line-through; opacity:0.7;">${t.from_team}</span>
            <span>→</span>
            <strong style="color:var(--text);">${t.to_team}</strong>
          </div>
          <p style="font-size:0.9rem; color:var(--text-muted); line-height:1.5;">${t.description}</p>
        </div>
      </div>
    `;
  }).join('');
}

function renderFreeAgents() {
  const container = document.getElementById('freeAgentsGrid');
  const items = currentRegion === 'all' ? transfersData.free_agents : transfersData.free_agents.filter(f => f.region === currentRegion);
  
  if (!items.length) {
    container.innerHTML = '<div class="loading" style="grid-column:1/-1;">No free agents found for this region.</div>';
    return;
  }

  container.innerHTML = items.map(f => `
    <div class="card" style="padding:1.2rem;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1rem;">
        <h4 style="font-size:1.1rem; color:var(--gold-light);">${f.player}</h4>
        <span style="font-size:0.75rem; background:var(--bg-secondary); padding:0.2rem 0.5rem; border-radius:4px; color:var(--text-muted);">${f.role}</span>
      </div>
      <div style="font-size:0.85rem; margin-bottom:0.5rem; color:var(--text-secondary);">
        Prev: <strong>${f.prev_team}</strong>
      </div>
      <div style="font-size:0.85rem; display:flex; justify-content:space-between; align-items:center;">
        <span class="tag">${f.region}</span>
        <span style="color:var(--blue);">${f.status}</span>
      </div>
    </div>
  `).join('');
}

function setupFilters() {
  document.getElementById('regionFilters')?.addEventListener('click', e => {
    if (!e.target.classList.contains('filter-btn')) return;
    document.querySelectorAll('#regionFilters .filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    currentRegion = e.target.dataset.region;
    renderTimeline();
    renderFreeAgents();
  });
}
