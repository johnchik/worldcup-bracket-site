const DATA_URL = './data/worldcup.json';
const ROUND_LABELS = { r16: 'Round of 16', qf: 'Quarter-finals', sf: 'Semi-finals', final: 'Final', third: 'Third Place' };
const BRACKET_COLUMNS = [
  { key: 'r16', className: 'r16', label: ROUND_LABELS.r16, ids: ['r16-1', 'r16-2', 'r16-3', 'r16-4', 'r16-5', 'r16-6', 'r16-7', 'r16-8'] },
  { key: 'qf', className: 'qf', label: ROUND_LABELS.qf, ids: ['qf-1', 'qf-2', 'qf-3', 'qf-4'] },
  { key: 'sf', className: 'sf', label: ROUND_LABELS.sf, ids: ['sf-1', 'sf-2'] },
  { key: 'final', className: 'final', label: 'Final / Third Place', ids: ['final', 'third'] }
];
const MOBILE_COLUMNS = BRACKET_COLUMNS;
const TEAM_META = {
  Argentina: { code: 'ar', zh: '阿根廷' },
  Belgium: { code: 'be', zh: '比利時' },
  Brazil: { code: 'br', zh: '巴西' },
  Canada: { code: 'ca', zh: '加拿大' },
  Colombia: { code: 'co', zh: '哥倫比亞' },
  Croatia: { code: 'hr', zh: '克羅地亞' },
  Denmark: { code: 'dk', zh: '丹麥' },
  Egypt: { code: 'eg', zh: '埃及' },
  England: { code: 'gb-eng', zh: '英格蘭' },
  France: { code: 'fr', zh: '法國' },
  Germany: { code: 'de', zh: '德國' },
  'Korea Republic': { code: 'kr', zh: '韓國' },
  Mexico: { code: 'mx', zh: '墨西哥' },
  Morocco: { code: 'ma', zh: '摩洛哥' },
  Netherlands: { code: 'nl', zh: '荷蘭' },
  Norway: { code: 'no', zh: '挪威' },
  Paraguay: { code: 'py', zh: '巴拉圭' },
  Portugal: { code: 'pt', zh: '葡萄牙' },
  Spain: { code: 'es', zh: '西班牙' },
  Switzerland: { code: 'ch', zh: '瑞士' },
  USA: { code: 'us', zh: '美國' },
  Ukraine: { code: 'ua', zh: '烏克蘭' }
};

function isFinal(status = '') { return ['FT', 'AET', 'PEN', 'Full Time'].some(s => status.toUpperCase().includes(s.toUpperCase())); }
function isLive(status = '') { return ['1H', '2H', 'HT', 'ET', 'P', 'LIVE'].some(s => status.toUpperCase().includes(s)); }
function scoreText(score) { return score === null || score === undefined ? '–' : score; }
function fmtDate(iso) {
  if (!iso) return 'TBD';
  return new Intl.DateTimeFormat('zh-HK', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }).format(new Date(iso));
}
function getLosers(matches) {
  const losers = new Set();
  for (const m of matches) {
    if (!m.winner) continue;
    for (const t of [m.home, m.away]) if (t && t !== m.winner) losers.add(t);
  }
  return losers;
}
function teamRow(match, side, losers, supporters) {
  const team = match[side] || 'TBD';
  const score = side === 'home' ? match.homeScore : match.awayScore;
  const cls = team === match.winner ? 'winner' : losers.has(team) ? 'loser' : '';
  const friend = supporters[team] || '—';
  const meta = teamMeta(team);
  return `<div class="team ${cls}" data-match-id="${match.id}" data-side="${side}" data-team="${attrText(team)}">
    <div class="team-main">
      ${flagHtml(meta, team)}
      <div>
        <div class="name"><span class="tc-name">${meta.zh}</span><span class="en-name">${team}</span></div>
        <div class="friend">${friend}</div>
      </div>
    </div>
    <div class="score">${scoreText(score)}</div>
  </div>`;
}
function matchCard(match, losers, supporters) {
  const live = isLive(match.status) ? 'live' : '';
  const empty = !match.home && !match.away ? 'empty' : '';
  const roundLabel = match.round === 'third' ? `<div class="match-label">${ROUND_LABELS.third}</div>` : '';
  const label = isFinal(match.status) ? 'Full time' : isLive(match.status) ? 'Live' : fmtDate(match.date);
  return `<article class="match ${live} ${empty}" data-match-id="${match.id}">
    <div class="match-meta"><span>${label}</span><span>${match.status}</span></div>
    ${roundLabel}
    ${teamRow(match,'home',losers,supporters)}
    ${teamRow(match,'away',losers,supporters)}
  </article>`;
}
function roundSection(column, byId, losers, supporters, attrs = '', extraClass = '') {
  const cards = column.ids.map(id => byId[id]).filter(Boolean).map(m => matchCard(m, losers, supporters)).join('');
  return `<section class="round ${column.className} ${extraClass}" ${attrs}><h2>${column.label}</h2><div class="round-matches">${cards}</div></section>`;
}
function attrText(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}
function teamMeta(team) {
  if (TEAM_META[team]) return TEAM_META[team];
  if (team === 'TBD') return { code: null, zh: '待定' };
  return { code: null, zh: team };
}
function flagHtml(meta, team) {
  if (!meta.code) return `<span class="flag placeholder" aria-hidden="true"></span>`;
  return `<img class="flag" src="https://flagcdn.com/${meta.code}.svg" alt="${attrText(team)} flag" loading="lazy" />`;
}
function render(data) {
  const matches = autoAdvance(data.matches);
  const byId = Object.fromEntries(matches.map(m => [m.id, m]));
  const losers = getLosers(matches);
  document.getElementById('updated').textContent = `Last updated: ${new Date(data.generatedAt).toLocaleString('zh-HK')}`;
  const tabs = MOBILE_COLUMNS.map((column, index) => `<button class="round-tab ${index === 0 ? 'active' : ''}" type="button" data-target="${column.key}">${column.label}</button>`).join('');
  const desktopBracket = BRACKET_COLUMNS.map(column => roundSection(column, byId, losers, data.supporters)).join('');
  const mobileBracket = MOBILE_COLUMNS.map((column, index) => roundSection(column, byId, losers, data.supporters, `data-round="${column.key}"`, index === 0 ? 'active-round' : '')).join('');
  document.getElementById('bracket').innerHTML = `<nav class="round-tabs" aria-label="Bracket rounds">${tabs}</nav><div class="desktop-bracket">${desktopBracket}</div><div class="mobile-bracket">${mobileBracket}</div>`;
  bindRoundTabs();
  document.getElementById('supporters').innerHTML = `<div class="supporter-grid">${Object.entries(data.supporters).map(([team, person]) => {
    const meta = teamMeta(team);
    return `<span class="supporter ${losers.has(team) ? 'dead' : ''}">${flagHtml(meta, team)}${person} · ${meta.zh}</span>`;
  }).join('')}</div>`;
}
function bindRoundTabs() {
  const bracket = document.getElementById('bracket');
  const mobileBracket = bracket.querySelector('.mobile-bracket');
  const tabs = [...bracket.querySelectorAll('.round-tab')];
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = mobileBracket.querySelector(`[data-round="${tab.dataset.target}"]`);
      if (!target) return;
      mobileBracket.querySelectorAll('.round').forEach(round => round.classList.toggle('active-round', round === target));
      tabs.forEach(t => t.classList.toggle('active', t === tab));
    });
  });
}
function autoAdvance(matches) {
  const cloned = structuredClone(matches);
  const byId = Object.fromEntries(cloned.map(m => [m.id, m]));
  for (const m of cloned) {
    if (!m.winner || !m.nextMatch || !byId[m.nextMatch]) continue;
    const next = byId[m.nextMatch];
    if (!next.home) next.home = m.winner;
    else if (!next.away && next.home !== m.winner) next.away = m.winner;
  }
  const third = byId.third;
  if (third) {
    const semiLosers = ['sf-1', 'sf-2'].map(id => loserFrom(byId[id])).filter(Boolean);
    if (!third.home && semiLosers[0]) third.home = semiLosers[0];
    if (!third.away && semiLosers[1]) third.away = semiLosers[1];
  }
  return cloned;
}
function loserFrom(match) {
  if (!match?.winner) return null;
  return [match.home, match.away].find(team => team && team !== match.winner) || null;
}
async function load() {
  try {
    const res = await fetch(`${DATA_URL}?t=${Date.now()}`);
    if (!res.ok) throw new Error(`Failed to fetch ${DATA_URL}: ${res.status}`);
    render(await res.json());
  } catch (e) {
    if (window.WORLD_CUP_DATA) {
      render(window.WORLD_CUP_DATA);
      return;
    }
    document.getElementById('bracket').innerHTML = `<p>Failed to load World Cup data.</p>`;
    console.error(e);
  }
}
load();
if (location.protocol !== 'file:') setInterval(load, 60_000);
