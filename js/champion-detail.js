document.addEventListener('DOMContentLoaded', async () => {
  const champId = getUrlParam('id');
  if (!champId) { window.location.href = 'champions.html'; return; }
  await loadChampionDetail(champId);
});

async function loadChampionDetail(id) {
  const container = document.getElementById('champContent');
  try {
    const [detailData, quotesData] = await Promise.all([
      fetchJSON(`${DDRAGON_BASE}/data/en_US/champion/${id}.json`),
      fetchJSON('./data/quotes.json').catch(() => ({}))
    ]);
    const c = detailData.data[id];
    if (!c) { container.innerHTML = '<div class="loading">Champion not found.</div>'; return; }

    document.title = `${c.name} — LoL Esports Hub`;
    const quotes = quotesData[id] || quotesData[c.name] || [];
    const spells = c.spells || [];
    const passive = c.passive;

    // Build abilities array: passive + QWER
    const abilities = [];
    if (passive) abilities.push({ name: passive.name, desc: passive.description, icon: passiveIconUrl(passive.image.full), key: 'P' });
    spells.forEach((s, i) => {
      abilities.push({ name: s.name, desc: s.description, icon: abilityIconUrl(s.image.full), key: ['Q','W','E','R'][i] });
    });

    // Stats
    const stats = c.info || {};
    const statBars = [
      { label: 'Attack', value: stats.attack || 0 },
      { label: 'Defense', value: stats.defense || 0 },
      { label: 'Magic', value: stats.magic || 0 },
      { label: 'Difficulty', value: stats.difficulty || 0 }
    ];

    container.innerHTML = `
      <!-- Hero -->
      <div class="champ-hero">
        <div class="champ-hero-bg" style="background-image:url('${championSplashUrl(id)}')"></div>
        <div class="champ-hero-gradient"></div>
        <div class="champ-hero-info">
          <div class="champion-card-tags" style="justify-content:flex-start;margin-bottom:0.75rem;">
            ${(c.tags||[]).map(t => `<span class="tag">${t}</span>`).join('')}
          </div>
          <h1 class="champ-name">${c.name}</h1>
          <p class="champ-epithet">${c.title}</p>
        </div>
      </div>

      <div class="section">
        <!-- Stats -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:2rem;margin-bottom:3rem;">
          <div>
            <h2 class="section-title" style="font-size:1.4rem;">Champion Stats</h2>
            <div style="margin-top:1.5rem;">
              ${statBars.map(s => `
                <div style="margin-bottom:1rem;">
                  <div style="display:flex;justify-content:space-between;margin-bottom:0.3rem;">
                    <span style="font-size:0.85rem;color:var(--text-secondary);">${s.label}</span>
                    <span style="font-size:0.85rem;color:var(--gold);">${s.value}/10</span>
                  </div>
                  <div style="height:6px;background:var(--bg-secondary);border-radius:3px;overflow:hidden;">
                    <div style="height:100%;width:${s.value * 10}%;background:linear-gradient(90deg,var(--gold-dark),var(--gold));border-radius:3px;transition:width 0.8s ease;"></div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
          <div>
            <h2 class="section-title" style="font-size:1.4rem;">Base Stats</h2>
            <div style="margin-top:1.5rem;display:grid;grid-template-columns:1fr 1fr;gap:0.75rem;">
              ${[
                ['HP', c.stats.hp],
                ['Armor', c.stats.armor],
                ['AD', c.stats.attackdamage],
                ['AS', c.stats.attackspeed],
                ['MR', c.stats.spellblock],
                ['MS', c.stats.movespeed],
                ['Range', c.stats.attackrange],
                ['HP Regen', c.stats.hpregen]
              ].map(([l,v]) => `
                <div style="background:var(--bg-card);border:1px solid var(--border);border-radius:var(--radius-sm);padding:0.6rem 0.8rem;">
                  <div style="font-size:0.75rem;color:var(--text-muted);">${l}</div>
                  <div style="font-size:1.1rem;font-weight:700;color:var(--gold-light);">${v}</div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Abilities -->
        <h2 class="section-title" style="font-size:1.4rem;">Abilities</h2>
        <div class="abilities" id="abilityIcons">
          ${abilities.map((a, i) => `
            <div class="ability-icon ${i === 0 ? 'active' : ''}" data-index="${i}" onclick="selectAbility(${i})">
              <img src="${a.icon}" alt="${a.name}" title="[${a.key}] ${a.name}">
            </div>
          `).join('')}
        </div>
        <div class="ability-detail" id="abilityDetail">
          <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
            <span style="font-size:0.75rem;background:var(--gold-dark);color:#fff;padding:0.15rem 0.5rem;border-radius:4px;">${abilities[0]?.key || 'P'}</span>
            <span class="ability-name">${abilities[0]?.name || ''}</span>
          </div>
          <p class="ability-desc">${abilities[0]?.desc || ''}</p>
        </div>

        <!-- Lore -->
        <h2 class="section-title" style="font-size:1.4rem;margin-top:3rem;">Lore</h2>
        <div class="lore-text" style="margin-top:1rem;">${c.lore || c.blurb || 'No lore available.'}</div>

        <!-- Quotes -->
        ${quotes.length > 0 ? `
          <h2 class="section-title" style="font-size:1.4rem;margin-top:3rem;">Voice Lines</h2>
          <div style="margin-top:1rem;">
            ${quotes.map(q => `
              <div class="quote-card">
                <p class="quote-text">"${q.text}"</p>
                <p class="quote-context">— ${q.context}</p>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <!-- Back -->
        <div style="margin-top:3rem;">
          <a href="champions.html" class="btn btn-outline">← Back to Champions</a>
        </div>
      </div>
    `;

    // Store abilities data globally for selection
    window._abilities = abilities;
  } catch (e) {
    container.innerHTML = '<div class="loading">Failed to load champion data. <a href="champions.html">Go back</a></div>';
  }
}

function selectAbility(index) {
  const abilities = window._abilities;
  if (!abilities || !abilities[index]) return;
  const a = abilities[index];
  document.querySelectorAll('.ability-icon').forEach(el => el.classList.remove('active'));
  document.querySelector(`.ability-icon[data-index="${index}"]`)?.classList.add('active');
  document.getElementById('abilityDetail').innerHTML = `
    <div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
      <span style="font-size:0.75rem;background:var(--gold-dark);color:#fff;padding:0.15rem 0.5rem;border-radius:4px;">${a.key}</span>
      <span class="ability-name">${a.name}</span>
    </div>
    <p class="ability-desc">${a.desc}</p>
  `;
}
