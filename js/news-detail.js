async function initNewsDetail() {
  const container = document.getElementById('newsContent');
  const articleIdParam = getUrlParam('id');
  
  if (!container) return;
  
  try {
    const news = await fetchJSON('./data/news.json');
    if (!news || news.length === 0) {
      renderError(container, "No News Available", "The esports news database is currently empty. Please check back later.");
      return;
    }
    
    // Default to first article if no ID is specified
    let targetId = 1;
    if (articleIdParam) {
      targetId = parseInt(articleIdParam, 10);
    }
    
    const article = news.find(n => n.id === targetId);
    
    if (!article) {
      renderError(container, "Article Not Found", "The article you are trying to view does not exist or has been removed from our system.");
      return;
    }
    
    // Dynamically set page meta
    document.title = `${article.title} — LoL Esports Hub`;
    
    // Format full body paragraphs
    const paragraphs = article.content.split('\n\n')
      .map(p => p.trim())
      .filter(p => p.length > 0)
      .map(p => `<p>${p}</p>`)
      .join('');
      
    // Render gorgeous Riot-style news layout
    container.innerHTML = `
      <section class="news-detail-hero">
        <div class="news-detail-hero-bg" style="background-image: url('${article.image}');"></div>
        <div class="news-detail-hero-gradient"></div>
        <div class="news-detail-hero-info">
          <div class="news-detail-meta">
            <span class="news-detail-tag">${article.tag}</span>
            <span class="news-detail-date">${formatDate(article.date)}</span>
          </div>
          <h1 class="news-detail-title">${article.title}</h1>
        </div>
      </section>
      
      <div class="news-detail-container fade-in-up">
        <article class="news-detail-body">
          ${paragraphs}
        </article>
        
        <div class="news-detail-back-container">
          <a href="index.html" class="news-detail-back-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            <span style="vertical-align:middle;">Back to Home</span>
          </a>
        </div>
      </div>
    `;
    
  } catch (e) {
    console.error("Error loading article detail:", e);
    renderError(container, "System Error", "An error occurred while trying to load the article details. Please refresh the page or try again later.");
  }
}

function renderError(container, title, message) {
  container.innerHTML = `
    <div class="news-detail-error fade-in">
      <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ff4e50" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin-bottom:1.5rem;">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <h2>${title}</h2>
      <p>${message}</p>
      <a href="index.html" class="news-detail-back-btn" style="display:inline-flex;justify-content:center;margin:0 auto;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:middle;margin-right:0.5rem;">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span>Back to Home</span>
      </a>
    </div>
  `;
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  // Let common.js handle nav & footer rendering first
  setTimeout(initNewsDetail, 20);
});
