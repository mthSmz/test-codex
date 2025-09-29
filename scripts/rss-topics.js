/*
 scripts/rss-topics.js
 Dépendances : rss-parser, lodash, node-fetch@2
 Installer si nécessaire : npm install rss-parser lodash node-fetch@2

 Ce fichier :
 - fetch chaque RSS via node-fetch avec User-Agent pour éviter les blocages
 - parse le XML avec rss-parser.parseString()
 - journalise erreurs / status / nombre d'items / durée
 - retourne le JSON final (date, top, topByCategory)
*/

const Parser = require('rss-parser');
const parser = new Parser();
const _ = require('lodash');
const fetch = require('node-fetch'); // version 2.x

const DEFAULT_FEEDS = [
  "https://feeds.bbci.co.uk/news/rss.xml",
  "https://www.reuters.com/rssFeed/topNews",
  "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
  "https://www.lemonde.fr/rss/une.xml",
  "https://www.lefigaro.fr/rss/figaro_actualites.xml",
  "https://www.france24.com/fr/rss",
  "https://news.google.com/rss?hl=fr&gl=FR&ceid=FR:fr"
];

const STOPWORDS = new Set([
  "les","des","pour","avec","dans","sur","par","une","un","le","la","et","du","de","que","qui","en","au","aux","ce","ces","se","son","sa","sont","est","à","vous","nous"
]);

function norm(s){
  return (s||'').replace(/[^\p{L}\p{N}#\s'-]/gu, '').trim();
}

function extractCandidates(text){
  if(!text) return [];
  const hashes = [...(text.matchAll(/#\w+/g) || [])].map(m=>m[0]);
  const caps = [...(text.matchAll(/([A-ZÀ-ÖØ-Ý][\p{L}'-]+(?:\s+[A-ZÀ-ÖØ-Ý][\p{L}'-]+)*)/gu) || [])].map(m=>m[1]);
  const words = [...(text.matchAll(/\b[^\d\W_]{4,}\b/gu) || [])].map(m=>m[0]);
  return [...hashes, ...caps, ...words].map(t=>norm(t)).filter(Boolean);
}

function isLikelyPerson(token){
  return token.split(' ').length >= 2 && /[A-ZÀ-ÖØ-Ý]/.test(token[0]);
}

function assignCategory(keyword){
  const low = (keyword||'').toLowerCase();
  if (isLikelyPerson(keyword)) return 'people';
  if (/\b(president|président|ministre|gouvern|élection|déput|senat|macron|villepin|le pen|assad|biden|trump)\b/i.test(low)) return 'politique';
  if (/\b(film|cinema|festival|palme|cannes|réalisateur|acteur|actrice|oscar)\b/i.test(low)) return 'cinema';
  if (/\b(paris|london|moscou|beijing|seoul|usa|france|russia|china|uk|onu|ukraine)\b/i.test(low)) return 'geo';
  if (low.length<=4) return 'absurde';
  return 'absurde';
}

async function fetchRaw(url, timeoutMs = 15000){
  const start = Date.now();
  try{
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; RSS-Topic-Bot/1.0)' },
      timeout: timeoutMs
    });
    const text = await res.text();
    const took = Date.now() - start;
    return { ok: true, status: res.status, text, took };
  }catch(err){
    const took = Date.now() - start;
    return { ok: false, error: String(err), took };
  }
}

async function fetchFeedItems(url, maxPerFeed = 20){
  const debug = { url, startedAt: new Date().toISOString() };
  const raw = await fetchRaw(url);
  debug.raw = { ok: raw.ok, status: raw.status, tookMs: raw.took, err: raw.error ? raw.error : undefined, length: raw.text ? raw.text.length : 0 };
  if(!raw.ok) {
    console.error('FETCH ERROR', url, raw.error);
    return { items: [], debug };
  }
  try{
    const feed = await parser.parseString(raw.text);
    const items = (feed.items || []).slice(0, maxPerFeed).map(i=>({ title: i.title||'', content: (i.contentSnippet||i.content||i.summary||'') }));
    debug.parsedCount = items.length;
    return { items, debug };
  }catch(e){
    console.error('PARSE ERROR', url, e && e.message);
    debug.parseError = e && e.message;
    return { items: [], debug };
  }
}

async function fetchRssTopics({ feedUrls = DEFAULT_FEEDS, maxPerFeed = 20 } = {}){
  const candidates = {};
  const feedDebug = [];

  for(const url of feedUrls){
    if(!url) continue;
    const { items, debug } = await fetchFeedItems(url, maxPerFeed);
    feedDebug.push(debug);
    for(const it of items){
      const text = `${it.title} ${it.content}`.replace(/\s+/g,' ');
      const tokens = extractCandidates(text);
      for(const t of tokens){
        const normalized = t.toLowerCase();
        if(STOPWORDS.has(normalized)) continue;
        if(!candidates[normalized]) candidates[normalized] = { keyword: t, normalized, occurrences: 0, sources: new Set() };
        candidates[normalized].occurrences += 1;
        candidates[normalized].sources.add(url);
      }
    }
  }

  const list = Object.values(candidates).map(o => ({
    keyword: o.keyword,
    normalized: o.normalized,
    occurrences: o.occurrences,
    sources: Array.from(o.sources),
    score: o.occurrences * Math.log(1 + o.sources.size)
  }));

  const sorted = _.orderBy(list, ['score','occurrences'], ['desc','desc']).slice(0, 200);

  const topByCategory = { politique: null, people: null, cinema: null, absurde: null, geo: null };
  for(const item of sorted){
    const cat = assignCategory(item.keyword);
    if(!topByCategory[cat]) topByCategory[cat] = item.keyword;
  }

  return {
    date: new Date().toISOString().slice(0,10),
    all: sorted,
    top: sorted.slice(0,10),
    topByCategory,
    feedDebug
  };
}

if (require.main === module) {
  (async () => {
    try{
      console.log('START fetchRssTopics', new Date().toISOString());
      const res = await fetchRssTopics({});
      console.log(JSON.stringify(res, null, 2));
    }catch(e){
      console.error('FATAL', e && e.stack ? e.stack : e);
      process.exit(1);
    }
  })();
}

module.exports = { fetchRssTopics };
