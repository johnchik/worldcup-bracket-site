import fs from 'node:fs/promises';

const dataPath = 'data/worldcup.json';
const fallbackScriptPath = 'data/worldcup-data.js';
const endpoint = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard?dates=20260704-20260720';
const teamNameMap = {
  'United States': 'USA'
};

function isPlaceholderTeam(name = '') {
  return /\b(winner|loser)\b/i.test(name);
}

function teamName(competitor) {
  const name = competitor?.team?.displayName || competitor?.team?.name || null;
  if (!name || isPlaceholderTeam(name)) return null;
  return teamNameMap[name] || name;
}

function numericScore(value) {
  if (value === undefined || value === null || value === '') return null;
  const score = Number(value);
  return Number.isFinite(score) ? score : null;
}

function normalizeStatus(status) {
  const type = status?.type || {};
  if (type.completed || type.state === 'post') return 'FT';
  if (type.state === 'in') return 'LIVE';
  return 'SCHEDULED';
}

function winnerFrom(competitors, status) {
  if (normalizeStatus(status) !== 'FT') return null;
  const winner = competitors.find(competitor => competitor.winner || competitor.advance);
  return teamName(winner);
}

async function writeData(data) {
  const json = JSON.stringify(data, null, 2);
  await fs.writeFile(dataPath, `${json}\n`);
  await fs.writeFile(fallbackScriptPath, `window.WORLD_CUP_DATA = ${json};\n`);
}

const current = JSON.parse(await fs.readFile(dataPath, 'utf8'));
const res = await fetch(endpoint, { headers: { accept: 'application/json' } });
if (!res.ok) throw new Error(`ESPN scoreboard ${res.status}: ${await res.text()}`);

const payload = await res.json();
const eventsById = new Map((payload.events || []).map(event => [String(event.id), event]));
let changed = 0;

for (const match of current.matches) {
  if (!match.espnId) continue;
  const event = eventsById.get(String(match.espnId));
  if (!event) {
    console.log(`No ESPN event found for ${match.id} (${match.espnId})`);
    continue;
  }

  const competition = event.competitions?.[0];
  const competitors = competition?.competitors || [];
  const home = competitors.find(competitor => competitor.homeAway === 'home');
  const away = competitors.find(competitor => competitor.homeAway === 'away');
  const status = normalizeStatus(competition?.status || event.status);
  const updates = {
    date: event.date || match.date,
    home: teamName(home),
    away: teamName(away),
    homeScore: status === 'SCHEDULED' ? null : numericScore(home?.score),
    awayScore: status === 'SCHEDULED' ? null : numericScore(away?.score),
    status,
    winner: winnerFrom(competitors, competition?.status || event.status)
  };

  for (const [key, value] of Object.entries(updates)) {
    if (match[key] !== value) {
      match[key] = value;
      changed += 1;
    }
  }
}

if (!changed) {
  console.log('ESPN data produced no changes');
  process.exit(0);
}

current.source = 'ESPN public scoreboard';
current.generatedAt = new Date().toISOString();
await writeData(current);
console.log(`Updated World Cup data from ESPN (${changed} field changes)`);
