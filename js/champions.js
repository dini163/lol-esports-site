let allChampions = [];

document.addEventListener('DOMContentLoaded', async () => {
  await loadChampions();
  setupFilters();
});

async function loadChampions() {
  const grid = document.getElementById('champGrid');
  try {
    const data = await fetchJSON(`${DDRAGON_BASE}/data/en_US/champion.json`);
    allChampions = Object.values(data.data).sort((a, b) => a.name.localeCompare(b.name));
    document.getElementById('champCount').textContent = allChampions.length;
    renderChampions(allChampions);
  } catch (e) {
    grid.innerHTML = '<div class="loading">Failed to load champion data.</div>';
  }
}

function renderChampions(champs) {
  const grid = document.getElementById('champGrid');
  if (champs.length === 0) {
    grid.innerHTML = '<div class="loading">No champions found.</div>';
    return;
  }
  grid.innerHTML = champs.map((c, i) => `
    <a href="champion.html?id=${c.id}" class="champion-card fade-in-up" style="text-decoration:none;animation-delay:${Math.min(i * 0.03, 1)}s;">
      <div style="overflow:hidden;">
        <img class="champion-card-img" src="${championSquareUrl(c.id)}" alt="${c.name}" loading="lazy">
      </div>
      <div class="champion-card-body">
        <div class="champion-card-name">${c.name}</div>
        <div class="champion-card-title">${c.title}</div>
        <div class="champion-card-tags">${c.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>
      </div>
    </a>
  `).join('');
}

function setupFilters() {
  // Role filters
  document.getElementById('roleFilters').addEventListener('click', e => {
    if (!e.target.classList.contains('filter-btn')) return;
    document.querySelectorAll('#roleFilters .filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    applyFilters();
  });
  // Search
  document.getElementById('champSearch').addEventListener('input', () => applyFilters());
}

function applyFilters() {
  const role = document.querySelector('#roleFilters .filter-btn.active')?.dataset.role || 'all';
  const search = document.getElementById('champSearch').value.toLowerCase().trim();
  let filtered = allChampions;
  if (role !== 'all') {
    filtered = filtered.filter(c => c.tags.includes(role));
  }
  if (search) {
    filtered = filtered.filter(c =>
      c.name.toLowerCase().includes(search) || c.title.toLowerCase().includes(search)
    );
  }
  renderChampions(filtered);
}
