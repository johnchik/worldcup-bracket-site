import fs from 'node:fs/promises';

const key = process.env.API_FOOTBALL_KEY;
const forceUpdate = process.env.FORCE_UPDATE === 'true';
const endpoint = 'https://v3.football.api-sports.io/fixtures?league=1&season=2026';
const fallbackPath = 'data/worldcup.json';
const fallbackScriptPath = 'data/worldcup-data.js';
const expectedMatchCount = 16;

async function writeData(data) {
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(fallbackPath, json);
  await fs.writeFile(fallbackScriptPath, `window.WORLD_CUP_DATA = ${json};\n`);
}

function normalizeStatus(short) {
  if (['FT', 'AET', 'PEN'].includes(short)) return short;
  if (['1H', '2H', 'HT', 'ET', 'P', 'BT', 'LIVE'].includes(short)) return 'LIVE';
  return 'SCHEDULED';
}
function winnerFrom(fx) {
  const h = fx.teams?.home;
  const a = fx.teams?.away;
  if (h?.winner) return h.name;
  if (a?.winner) return a.name;
  return null;
}
function roundFrom(raw = '') {
  const r = raw.toLowerCase();
  if (r.includes('round of 16') || r.includes('8th final')) return 'r16';
  if (r.includes('quarter')) return 'qf';
  if (r.includes('semi')) return 'sf';
  if (r.includes('third') || r.includes('3rd') || r.includes('play-off')) return 'third';
  if (r === 'final' || r.includes('final')) return 'final';
  return null;
}
function slotId(round, index) {
  if (round === 'r16') return `r16-${index + 1}`;
  if (round === 'qf') return `qf-${index + 1}`;
  if (round === 'sf') return `sf-${index + 1}`;
  if (round === 'third') return 'third';
  return 'final';
}
function nextMatch(round, index) {
  if (round === 'r16') return `qf-${Math.floor(index / 2) + 1}`;
  if (round === 'qf') return `sf-${Math.floor(index / 2) + 1}`;
  if (round === 'sf') return 'final';
  return null;
}
function isCurrentOrUpcoming(match) {
  return !['FT', 'AET', 'PEN'].includes(match.status);
}
function isInsideUpdateWindow(match, now = new Date()) {
  if (!isCurrentOrUpcoming(match)) return false;
  if (match.status === 'LIVE') return true;
  if (!match.date) return false;
  const kickoff = new Date(match.date).getTime();
  if (Number.isNaN(kickoff)) return false;
  const t = now.getTime();
  const beforeKickoff = 30 * 60 * 1000;
  const afterKickoff = 5 * 60 * 60 * 1000;
  return t >= kickoff - beforeKickoff && t <= kickoff + afterKickoff;
}
function shouldFetch(current) {
  if (forceUpdate) return true;
  if (!Array.isArray(current.matches) || current.matches.length === 0) return true;
  return current.matches.some(match => isInsideUpdateWindow(match));
}
function assertUsableMatches(matches) {
  if (matches.length < expectedMatchCount) {
    throw new Error(`Refusing to overwrite bracket with ${matches.length} normalized matches; expected ${expectedMatchCount}`);
  }
  const ids = new Set(matches.map(match => match.id));
  const requiredIds = [
    'r16-1', 'r16-2', 'r16-3', 'r16-4', 'r16-5', 'r16-6', 'r16-7', 'r16-8',
    'qf-1', 'qf-2', 'qf-3', 'qf-4',
    'sf-1', 'sf-2',
    'third', 'final'
  ];
  const missing = requiredIds.filter(id => !ids.has(id));
  if (missing.length) {
    throw new Error(`Refusing to overwrite bracket; normalized API data is missing ${missing.join(', ')}`);
  }
}

const current = JSON.parse(await fs.readFile(fallbackPath, 'utf8'));
if (!shouldFetch(current)) {
  console.log('No match is inside the API update window; skipping API-Football request');
  process.exit(0);
}
if (!key) {
  console.log('API_FOOTBALL_KEY missing; keeping existing data/worldcup.json');
  process.exit(0);
}
const res = await fetch(endpoint, { headers: { 'x-apisports-key': key } });
if (!res.ok) throw new Error(`API-Football ${res.status}: ${await res.text()}`);
const payload = await res.json();
await fs.writeFile('data/raw-fixtures.json', JSON.stringify(payload, null, 2));

const knockout = (payload.response || [])
  .map(fx => ({ fx, round: roundFrom(fx.league?.round || '') }))
  .filter(x => x.round)
  .sort((a,b) => new Date(a.fx.fixture.date) - new Date(b.fx.fixture.date));
const grouped = { r16: [], qf: [], sf: [], final: [] };
grouped.third = [];
for (const x of knockout) grouped[x.round].push(x.fx);
const matches = [];
for (const round of ['r16','qf','sf']) {
  grouped[round].forEach((fx, i) => matches.push({
    id: slotId(round, i), apiId: String(fx.fixture.id), round,
    date: fx.fixture.date,
    home: fx.teams?.home?.name || null,
    away: fx.teams?.away?.name || null,
    homeScore: fx.goals?.home ?? null,
    awayScore: fx.goals?.away ?? null,
    status: normalizeStatus(fx.fixture?.status?.short),
    winner: winnerFrom(fx),
    nextMatch: nextMatch(round, i)
  }));
}
const finalFx = grouped.final.find(fx => /final/i.test(fx.league?.round || ''));
const thirdFx = grouped.third[0];
if (thirdFx) matches.push({
  id: 'third', apiId: String(thirdFx.fixture.id), round: 'third', date: thirdFx.fixture.date,
  home: thirdFx.teams?.home?.name || null, away: thirdFx.teams?.away?.name || null,
  homeScore: thirdFx.goals?.home ?? null, awayScore: thirdFx.goals?.away ?? null,
  status: normalizeStatus(thirdFx.fixture?.status?.short), winner: winnerFrom(thirdFx), nextMatch: null
});
if (finalFx) matches.push({
  id: 'final', apiId: String(finalFx.fixture.id), round: 'final', date: finalFx.fixture.date,
  home: finalFx.teams?.home?.name || null, away: finalFx.teams?.away?.name || null,
  homeScore: finalFx.goals?.home ?? null, awayScore: finalFx.goals?.away ?? null,
  status: normalizeStatus(finalFx.fixture?.status?.short), winner: winnerFrom(finalFx), nextMatch: null
});

assertUsableMatches(matches);
await writeData({ ...current, source: 'API-Football league=1 season=2026', generatedAt: new Date().toISOString(), matches });
