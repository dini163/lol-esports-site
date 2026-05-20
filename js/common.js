// ========== Data Dragon Config ==========
const DDRAGON_VERSION = '15.10.1';
const DDRAGON_BASE = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}`;
const DDRAGON_IMG = `${DDRAGON_BASE}/img`;

// ========== Utility Functions ==========
function secureUrl(url) {
  if (!url) return '';
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  return url;
}

function championSquareUrl(id) {
  return `${DDRAGON_IMG}/champion/${id}.png`;
}
function championSplashUrl(id, skin = 0) {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${id}_${skin}.jpg`;
}
function championLoadingUrl(id, skin = 0) {
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${id}_${skin}.jpg`;
}
function abilityIconUrl(filename) {
  return `${DDRAGON_IMG}/spell/${filename}`;
}
function passiveIconUrl(filename) {
  return `${DDRAGON_IMG}/passive/${filename}`;
}

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return res.json();
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function formatTime(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function getUrlParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

function stripHtml(html) {
  const tmp = document.createElement('div');
  tmp.innerHTML = html;
  return tmp.textContent || tmp.innerText || '';
}

let _currentAudio = null;
function playAudio(url) {
  if (!url) return;
  if (_currentAudio) {
    _currentAudio.pause();
    _currentAudio.currentTime = 0;
  }
  _currentAudio = new Audio(url);
  _currentAudio.volume = 0.5;
  _currentAudio.play().catch(e => console.error('Audio play failed:', e));
}

// ========== Navigation ==========
function initNav() {
  const hamburger = document.querySelector('.nav-hamburger');
  const links = document.querySelector('.nav-links');
  if (hamburger && links) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      links.classList.toggle('open');
    });
  }
  // Scroll effect
  window.addEventListener('scroll', () => {
    const nav = document.querySelector('.nav');
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 20);
  });
  // Active link
  const current = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === current || (current === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
}

// ========== Navigation HTML ==========
function renderNav() {
  const nav = document.createElement('nav');
  nav.className = 'nav';
  nav.innerHTML = `
    <div class="nav-inner">
      <a href="index.html" class="nav-logo">
        <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        LoL Esports
      </a>
      <div class="nav-links">
        <a href="index.html">Home</a>
        <a href="champions.html">Champions</a>
        <a href="esports.html">Esports</a>
        <a href="transfers.html">Transfers</a>
        <a href="meta.html">Meta</a>
        <a href="lore.html">Universe</a>
      </div>
      <div class="nav-hamburger">
        <span></span><span></span><span></span>
      </div>
    </div>
  `;
  document.body.prepend(nav);
  initNav();
}

// ========== Footer HTML ==========
function renderFooter() {
  const footer = document.createElement('footer');
  footer.className = 'footer';
  footer.innerHTML = `
    <div class="footer-inner">
      <div>
        <div class="footer-brand">LoL Esports Hub</div>
        <p class="footer-desc">Your ultimate destination for League of Legends esports coverage, champion guides, and universe lore.</p>
      </div>
      <div>
        <div class="footer-heading">Explore</div>
        <div class="footer-links">
          <a href="champions.html">Champions</a>
          <a href="esports.html">Esports</a>
          <a href="transfers.html">Transfers</a>
          <a href="meta.html">Meta</a>
          <a href="lore.html">Universe</a>
        </div>
      </div>
      <div>
        <div class="footer-heading">Esports</div>
        <div class="footer-links">
          <a href="esports.html">Schedule</a>
          <a href="esports.html">Standings</a>
          <a href="esports.html">Teams</a>
        </div>
      </div>
      <div>
        <div class="footer-heading">Resources</div>
        <div class="footer-links">
          <a href="https://www.leagueoflegends.com" target="_blank">Official Site</a>
          <a href="https://lolesports.com" target="_blank">LoL Esports</a>
          <a href="https://universe.leagueoflegends.com" target="_blank">Universe</a>
        </div>
      </div>
    </div>
    <div class="footer-bottom">
      &copy; ${new Date().getFullYear()} LoL Esports Hub — Fan Project. Not affiliated with Riot Games.
    </div>
  `;
  document.body.appendChild(footer);
}

// ========== Init Common ==========
document.addEventListener('DOMContentLoaded', () => {
  renderNav();
  renderFooter();
});
