// Dépendances à installer (si non déjà présentes) :
// npm install rss-parser lodash
//
// scripts/rss-topics.js
//
// Simple connecteur RSS -> extraction de mots / scoring / catégorisation.
// Contient une variable DEFAULT_FEEDS listant des flux prêts à l'emploi.
// Usage : const { fetchRssTopics } = require('./scripts/rss-topics.js'); await fetchRssTopics();

const RSSParser = require('rss-parser');
const _ = require('lodash');

const DEFAULT_FEEDS = [
  "https://www.lemonde.fr/rss/une.xml",
  "https://www.lefigaro.fr/rss/figaro_actualites.xml",
  "https://www.liberation.fr/rss/latest/",
  "https://www.leparisien.fr/une/feed/",
  "https://www.reuters.com/rssFeed/topNews",
  "https://www.france24.com/fr/rss",
  "https://feeds.bbci.co.uk/news/rss.xml",
  "https://www.euronews.com/rss?level=themes",
  "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",
  "https://news.google.com/rss?hl=fr&gl=FR&ceid=FR:fr"
];

const parser = new RSSParser({ timeout: 15000 });

const STOPWORDS = new Set([
  "les","des","les","pour","avec","dans","sur","par","une","un","le","la","et","du","de","que","qui","en","au","aux","ce","ces","se","son","sa","sont"
]);

function norm(s){
  return s.replace(/[^\p{L}\p{N}#\s'-]/gu, '').trim();
}

function extractCandidates(text){
  if(!text) return [];
  // hashtags
  const hashes = [...text.matchAll(/#\w+/g)].map(m=>m[0]);
  // capitalized sequences for names (heuristic)
  const caps = [...text.matchAll(/([A-ZÀ-ÖØ-Ý][\p{L}'-]+(?:\s+[A-ZÀ-ÖØ-Ý][\p{L}'-]+)*)/gu)].map(m=>m[1]);
  // words > 3 letters
  const words = [...text.matchAll(/\b[^\d\W_]{4,}\b/gu)].map(m=>m[0]);
  return [...hashes, ...caps, ...words].map(t=>norm(t)).filter(Boolean);
}

function isLikelyPerson(token){
  return token.split(' ').length >= 2 && /[A-ZÀ-ÖØ-Ý]/.test(token[0]);
}

function assignCategory(keyword){
  const low = keyword.toLowerCase();
  if (isLikelyPerson(keyword)) return 'people';
  if (/\b(president|président|ministre|gouvern|élection|déput|senat|macron|villepin|hollande|le pen|lepen)\b/i.test(low)) return 'politique';
  if (/\b(film|cinema|festival|palme|cannes|réalisateur|acteur|actrice)\b/i.test(low)) return 'cinema';
  if (/\b(paris|london|moscou|beijing|seoul|usa|france|russia|china|uk|onu)\b/i.test(low)) return 'geo';
  if (low.length<=4) return 'absurde';
  return 'absurde';
}

async function fetchFeedItems(url, maxPerFeed){
  try{
    const feed = await parser.parseURL(url);
    const items = (feed.items || []).slice(0, maxPerFeed);
    return items.map(i => ({ title: i.title||'', content: (i.contentSnippet||i.content||i.summary||'') }));
  }catch(e){
    // silent fallback, return empty list
    return [];
  }
}

async function fetchRssTopics({ feedUrls = DEFAULT_FEEDS, maxPerFeed = 20 } = {}){
  const candidates = {};
  const sourcesMap = {};

  for(const url of feedUrls){
    if(!url) continue;
    const items = await fetchFeedItems(url, maxPerFeed);
    for(const it of items){
      const combined = `${it.title} ${it.content}`.replace(/\s+/g,' ');
      const tokens = extractCandidates(combined);
      for(const t of tokens){
        const normalized = t.toLowerCase();
        if(STOPWORDS.has(normalized)) continue;
        if(!candidates[normalized]) candidates[normalized] = { keyword: t, normalized, occurrences: 0, sources: new Set() };
        candidates[normalized].occurrences += 1;
        candidates[normalized].sources.add(url);
      }
    }
  }

  // build list
  const list = Object.values(candidates).map(o => ({
    keyword: o.keyword,
    normalized: o.normalized,
    occurrences: o.occurrences,
    sources: Array.from(o.sources),
    score: o.occurrences * Math.log(1 + o.sources.size)
  }));

  const sorted = _.orderBy(list, ['score','occurrences'], ['desc','desc']).slice(0, 200);

  // topByCategory heuristic
  const topByCategory = { politique: null, people: null, cinema: null, absurde: null, geo: null };
  const assigned = {};

  for(const item of sorted){
    const cat = assignCategory(item.keyword);
    if(!topByCategory[cat]) topByCategory[cat] = item.keyword;
    assigned[item.keyword] = cat;
  }

  const result = {
    date: new Date().toISOString().slice(0,10),
    all: sorted,
    top: sorted.slice(0,10),
    topByCategory
  };

  return result;
}

// CLI runner
if (require.main === module) {
  (async () => {
    try{
      const res = await fetchRssTopics({});
      console.log(JSON.stringify(res, null, 2));
    }catch(e){
      console.error(e);
      process.exit(1);
    }
  })();
}

module.exports = { fetchRssTopics };

