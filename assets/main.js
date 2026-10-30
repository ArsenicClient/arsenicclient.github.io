// ─── STATE ───
let latestJarUrl = 'https://github.com/ArsenicClient/Arsenic/releases/latest';
let latestReleaseName = null;

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

// ─── PICK RELEASE JAR ───
// Prefer the "(main)" jar; fall back to the release's first .jar asset.
function pickJar(release) {
  const jars = release.assets.filter(a => a.name.endsWith('.jar'));
  return jars.find(a => /main/i.test(a.name)) || jars[0] || null;
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
        dlList.innerHTML = releases.filter(r => !r.draft).map((r, i) => {
          const jars = r.assets.filter(a => a.name.endsWith('.jar'));
          if (jars.length === 0) {
            return `<a class="rel-row" href="${r.html_url}"><span class="rel-tag">${r.tag_name}</span><span class="rel-name">${r.name || r.tag_name}</span><span class="rel-meta">${fmtDate(r.published_at)}</span></a>`;
          }
          const builds = jars.map(j => `<a class="rel-row rel-build" href="${j.browser_download_url}"><span class="rel-name">${j.name}</span><span class="rel-meta">${fmtDate(r.published_at)} · ${fmtBytes(j.size)}</span></a>`).join('');
          const count = `${jars.length} build${jars.length > 1 ? 's' : ''}`;
          return `<details class="rel-card"${i === 0 ? ' open' : ''}><summary><span class="rel-tag">${r.tag_name}</span><span class="rel-name">${r.name || r.tag_name}</span><span class="rel-meta">${fmtDate(r.published_at)} · ${count}</span></summary><div class="rel-builds">${builds}</div></details>`;
        }).join('');
      }

      if (releases.length > 0) {
        const latest = releases[0];
        latestReleaseName = latest.tag_name;

        const badgeEl = document.getElementById('heroBadgeText');
        if (badgeEl) badgeEl.textContent = `${latest.tag_name} now available · 1.8.9 injector`;

        const jar = pickJar(latest);
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
              ${jar.name} &nbsp;·&nbsp; ${fmtBytes(jar.size)} &nbsp;·&nbsp; Released ${fmtDate(latest.published_at)}
            `;
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

// ─── CHANGELOG ───
// Release notes come straight from GitHub; the static entries stay if the API is unreachable.
function esc(t) {
  return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function inline(t) {
  return esc(t)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}
function notes(md, name) {
  let out = '', list = false;
  const close = () => { if (list) { out += '</ul>'; list = false; } };
  for (const raw of (md || '').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) { close(); continue; }
    const h = line.match(/^#{1,6}\s+(.*)/);
    if (h) {
      close();
      // skip a heading that only repeats the release name
      if (!/^arsenic v?[\d.]+/i.test(h[1]) && h[1] !== name) out += `<h4>${inline(h[1])}</h4>`;
      continue;
    }
    const item = line.replace(/^([-*+]|\d+[.)])\s*/, '');
    // drop empty bullets and bare "**Label:**" stubs
    if (!item || /^\*\*[^*]+(:\*\*|\*\*:)$/.test(item)) continue;
    if (!list) { out += '<ul>'; list = true; }
    out += `<li>${inline(item)}</li>`;
  }
  close();
  return out;
}
async function loadChangelog() {
  const el = document.getElementById('changelog');
  const KEY = 'arsenic-releases';
  let releases = null;
  try {
    const c = JSON.parse(sessionStorage.getItem(KEY) || 'null');
    if (c && Date.now() - c.t < 10 * 60 * 1000) releases = c.d;
  } catch (e) {}
  if (!releases) {
    try {
      const res = await fetch('https://api.github.com/repos/ArsenicClient/Arsenic/releases?per_page=100', { headers: { 'Accept': 'application/vnd.github+json' } });
      if (!res.ok) return;
      releases = (await res.json()).filter(r => !r.draft).map(r => ({ tag: r.tag_name, name: r.name, date: r.published_at, url: r.html_url, body: r.body }));
      try { sessionStorage.setItem(KEY, JSON.stringify({ t: Date.now(), d: releases })); } catch (e) {}
    } catch (e) { return; }
  }
  if (!releases.length) return;
  el.innerHTML = releases.map(r => {
    const body = notes(r.body, r.name) || `<p>No notes for this release.</p>`;
    return `<div class="cl-entry"><h3>${esc(r.tag)}</h3><div class="cl-date">${fmtDate(r.date)} · <a href="${r.url}" target="_blank" rel="noopener">GitHub ↗</a></div>${body}</div>`;
  }).join('');
}
if (document.getElementById('changelog')) loadChangelog();

// ─── STARS ───
// Same star count as the landing page nav; reuse its cached GitHub data when there is some.
async function loadStars() {
  const els = document.querySelectorAll('[data-gh="stars"]');
  if (!els.length) return;
  let n = null;
  try { n = JSON.parse(sessionStorage.getItem('arsenic-neon-gh2') || 'null')?.d?.stars ?? null; } catch (e) {}
  if (n == null) {
    try {
      const res = await fetch('https://api.github.com/repos/ArsenicClient/Arsenic');
      if (res.ok) n = (await res.json()).stargazers_count;
    } catch (e) {}
  }
  if (n != null) els.forEach(e => e.textContent = formatNumber(n));
}
loadStars();

// ─── INIT ───
if (document.getElementById('statStars') || document.getElementById('heroBadgeText') || document.getElementById('creditsGrid') || document.getElementById('dlList'))
loadGitHubData();
