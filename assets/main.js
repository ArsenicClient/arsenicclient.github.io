// ─── STATE ───
let latestJarUrl = 'https://github.com/ArsenicClient/Arsenic/releases/latest';
let latestReleaseName = null;

// ─── LUCIDE ICONS ───
document.addEventListener('DOMContentLoaded', () => {
  if (typeof lucide !== 'undefined') lucide.createIcons();
});

// ─── DOWNLOAD HANDLER ───
function triggerDownload() {
  if (latestJarUrl) {
    window.location.href = latestJarUrl;
  }
}

// ─── FORMAT NUMBER ───
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ─── ANIMATE COUNTER ───
function animCount(el, target, suffix = '') {
  if (!el || isNaN(target)) return;
  el.classList.remove('loading');
  let cur = 0;
  const step = Math.max(1, target / 60);
  const t = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = Math.floor(cur).toLocaleString() + suffix;
    if (cur >= target) clearInterval(t);
  }, 20);
}

// ─── FORMAT BYTES ───
function fmtBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

// ─── FORMAT DATE ───
function fmtDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── FETCH GITHUB DATA ───
async function loadGitHubData() {
  const REPO = 'ArsenicClient/Arsenic';
  const BASE = 'https://api.github.com';
  const HEADERS = { 'Accept': 'application/vnd.github+json' };

  try {
    const [repoRes, releasesRes] = await Promise.all([
      fetch(`${BASE}/repos/${REPO}`, { headers: HEADERS }),
      fetch(`${BASE}/repos/${REPO}/releases?per_page=100`, { headers: HEADERS }),
    ]);

    if (repoRes.ok) {
      const repo = await repoRes.json();
      animCount(document.getElementById('statStars'), repo.stargazers_count);
      animCount(document.getElementById('statForks'), repo.forks_count);
    }

    if (releasesRes.ok) {
      const releases = await releasesRes.json();
      animCount(document.getElementById('statReleases'), releases.length);

      let totalDownloads = 0;
      releases.forEach(release => {
        release.assets.forEach(asset => {
          totalDownloads += asset.download_count;
        });
      });

      const dlEl = document.getElementById('statDownloads');
      if (dlEl) {
        dlEl.classList.remove('loading');
        const formatted = formatNumber(totalDownloads);
        dlEl.style.opacity = '0';
        dlEl.textContent = formatted;
        setTimeout(() => {
          dlEl.style.transition = 'opacity 0.8s ease';
          dlEl.style.opacity = '1';
        }, 100);
        animCount(dlEl, totalDownloads);
      }

      const dlList = document.getElementById('dlList');
      if (dlList) {
        dlList.innerHTML = releases.slice(0, 8).map(r => {
          const j = r.assets.find(a => a.name.endsWith('.jar'));
          const href = j ? j.browser_download_url : r.html_url;
          const size = j ? ' · ' + fmtBytes(j.size) : '';
          return `<a class="rel-row" href="${href}"><span class="rel-tag">${r.tag_name}</span><span class="rel-name">${r.name || r.tag_name}</span><span class="rel-meta">${fmtDate(r.published_at)}${size}</span></a>`;
        }).join('');
      }

      if (releases.length > 0) {
        const latest = releases[0];
        latestReleaseName = latest.tag_name;

        const badgeEl = document.getElementById('heroBadgeText');
        if (badgeEl) badgeEl.textContent = `${latest.tag_name} now available · 1.8.9 injector`;

        const jar = latest.assets.find(a => a.name.endsWith('.jar'));
        if (jar) {
          latestJarUrl = jar.browser_download_url;

          const label = `Download ${latest.tag_name}`;
          const heroLabel = document.getElementById('heroDownloadLabel');
          const ctaLabel = document.getElementById('ctaDownloadLabel');
          if (heroLabel) heroLabel.textContent = label;
          if (ctaLabel) ctaLabel.textContent = label;

          const meta = document.getElementById('releaseFileMeta');
          if (meta) {
            meta.style.opacity = '1';
            meta.innerHTML = `
              <i data-lucide="file" style="width:12px;height:12px;flex-shrink:0;"></i>
              ${jar.name} &nbsp;·&nbsp; ${fmtBytes(jar.size)} &nbsp;·&nbsp; Released ${fmtDate(latest.published_at)}
            `;
            if (typeof lucide !== 'undefined') lucide.createIcons();
          }
        } else {
          latestJarUrl = latest.html_url;
        }

        const year = new Date(latest.published_at).getFullYear();
        const footerCopy = document.getElementById('footerCopy');
        if (footerCopy) {
          footerCopy.textContent = `© ${year} ArsenicClient · MIT License · ${latest.tag_name}`;
        }
      }
    }

    const commitRes = await fetch(
      `${BASE}/repos/${REPO}/commits?per_page=1`,
      { headers: HEADERS }
    );
    if (commitRes.ok) {
      const link = commitRes.headers.get('Link') || '';
      const match = link.match(/page=(\d+)>; rel="last"/);
      if (match) {
        animCount(document.getElementById('statCommits'), parseInt(match[1]));
      }
    }

    const ROLES = ['Lead Dev','Contributor','Contributor','Contributor','Contributor','Contributor'];

    const contribRes = await fetch(
      `${BASE}/repos/${REPO}/contributors?per_page=6`,
      { headers: HEADERS }
    );
    if (contribRes.ok) {
      const contributors = await contribRes.json();
      const cards = document.querySelectorAll('#creditsGrid .credit-card');
      contributors.slice(0, 6).forEach((contrib, i) => {
        const card = cards[i];
        if (!card) return;
        card.href = contrib.html_url;
        const av = card.querySelector('.credit-av');
        if (av) av.innerHTML = `<img src="${contrib.avatar_url}&s=96" alt="${contrib.login}" loading="lazy">`;
        const name = card.querySelector('.credit-name');
        if (name) name.textContent = contrib.login;
        const role = card.querySelector('.credit-role');
        if (role) role.textContent = ROLES[i] ?? 'Contributor';
      });
    }

  } catch (err) {
    console.error('GitHub API error:', err);
    const badgeEl = document.getElementById('heroBadgeText');
    if (badgeEl) badgeEl.textContent = 'v3.0 now available · 1.8.9';
    ['statStars','statCommits','statReleases','statDownloads','statForks'].forEach(id => {
      const el = document.getElementById(id);
      if (el) { el.textContent = '—'; el.classList.add('loading'); }
    });
  }
}

// ─── SCROLL REVEAL ───
const revealEls = document.querySelectorAll('.reveal');
const revObs = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); revObs.unobserve(e.target); } });
}, { threshold: 0.1 });
revealEls.forEach(el => revObs.observe(el));

// ─── STAT COUNTER TRIGGER ON SCROLL ───
const statsObs = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      statsObs.unobserve(e.target);
    }
  });
}, { threshold: 0.4 });
const statsRow = document.querySelector('.stats-row');
if (statsRow) statsObs.observe(statsRow);

// ─── VIDEO ───
function loadVideo() {
  window.open('https://www.youtube.com/watch?v=rcNm_LSZh-E', '_blank');
}

// ─── NAV SCROLL ───
const navEl = document.getElementById('nav');
if (navEl) window.addEventListener('scroll', () => {
  navEl.style.background = window.scrollY > 40
    ? 'rgba(8,8,9,0.95)'
    : 'rgba(8,8,9,0.7)';
});

// ─── INIT ───
if (document.getElementById('statStars') || document.getElementById('heroBadgeText') || document.getElementById('creditsGrid') || document.getElementById('dlList'))
loadGitHubData();
