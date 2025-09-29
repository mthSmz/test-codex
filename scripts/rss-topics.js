// npm install rss-parser lodash

import Parser from 'rss-parser';
import lodash from 'lodash';
import { fileURLToPath } from 'node:url';

const { merge, orderBy } = lodash;

const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'have', 'will', 'quoi', 'pour',
  'dans', 'les', 'des', 'une', 'avec', 'plus', 'nous', 'vous', 'mais', 'elle', 'elles', 'avoir',
  'etre', 'sont', 'est', 'sur', 'entre', 'comme', 'leur', 'leurs', 'quand', 'aussi', 'very',
  'into', 'over', 'under', 'sans', 'their', 'them', 'they', 'alors', 'ainsi', 'pourquoi', 'dont',
  'chez', 'vers', 'moins', 'other', 'others', 'tout', 'tous', 'toutes', 'every', 'each', 'news'
]);

const GEO_WORDS = new Set([
  'paris', 'londres', 'london', 'moscou', 'moscow', 'pekin', 'beijing', 'new york', 'berlin',
  'madrid', 'rome', 'tokyo', 'lyon', 'marseille', 'nice', 'cannes'
]);

const POLITICS_WORDS = [
  'président', 'president', 'ministre', 'minister', 'gouvern', 'senate', 'senator', 'politic',
  'assembly', 'parliament', 'élysée', 'elysee', 'white house', 'elysée'
];

const CINEMA_WORDS = [
  'film', 'films', 'réalisateur', 'realisateur', 'director', 'festival', 'cinéma', 'cinema',
  'palme', 'cannes', 'acteur', 'actrice', 'movie', 'hollywood'
];

function extractCandidates(text) {
  const candidates = [];
  if (!text) {
    return candidates;
  }

  const hashtags = text.match(/#[\p{L}0-9_]+/gu) || [];
  hashtags.forEach((tag) => {
    candidates.push(tag.trim());
  });

  const properNames = text.match(/\b(?:[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ']+(?:\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ']+)*)/gu) || [];
  properNames.forEach((name) => {
    candidates.push(name.trim());
  });

  const cleaned = text
    .replace(/[^\p{L}0-9#\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);

  cleaned.forEach((word) => {
    if (word.length > 3) {
      candidates.push(word.trim());
    }
  });

  return candidates;
}

function normalizeCandidate(candidate) {
  return candidate
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function isStopword(normalized) {
  return STOPWORDS.has(normalized);
}

function categorizeKeyword(keyword, normalized) {
  if (/^[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ']+(?:\s+[A-ZÀ-ÖØ-Þ][a-zà-öø-ÿ']+)+$/.test(keyword)) {
    return 'people';
  }

  if (POLITICS_WORDS.some((word) => normalized.includes(word))) {
    return 'politics';
  }

  if (CINEMA_WORDS.some((word) => normalized.includes(word))) {
    return 'cinema';
  }

  if (
    GEO_WORDS.has(normalized) ||
    /\b(paris|moscou|moscow|cannes|lyon|marseille|rome|tokyo|berlin|madrid|nice|france|italy|spain|china)\b/.test(
      normalized
    )
  ) {
    return 'geo';
  }

  return 'other';
}

export async function fetchRssTopics({ feedUrls, maxPerFeed = 20 }) {
  const parser = new Parser();
  const aggregated = new Map();

  for (const feedUrl of feedUrls.filter(Boolean)) {
    try {
      const feed = await parser.parseURL(feedUrl);
      const sourceLabel = feed.title || feedUrl;
      const items = (feed.items || []).slice(0, maxPerFeed);

      items.forEach((item) => {
        const text = [
          item.title,
          item.contentSnippet,
          item.content,
          item.summary,
          item.description,
        ]
          .filter(Boolean)
          .join(' ');

        const candidates = extractCandidates(text);
        const seenInItem = new Set();

        candidates.forEach((candidate) => {
          const normalized = normalizeCandidate(candidate);

          if (!normalized || isStopword(normalized)) {
            return;
          }

          const key = normalized;
          const entry = aggregated.get(key) || {
            keyword: candidate,
            normalized,
            occurrences: 0,
            sources: new Set(),
          };

          entry.occurrences += 1;

          if (!seenInItem.has(key)) {
            entry.sources.add(sourceLabel);
            seenInItem.add(key);
          }

          if (entry.keyword.length < candidate.length) {
            entry.keyword = candidate;
          }

          aggregated.set(key, entry);
        });
      });
    } catch (error) {
      console.warn(`Unable to parse feed ${feedUrl}:`, error.message);
    }
  }

  const baseCategories = {
    people: [],
    politics: [],
    cinema: [],
    geo: [],
    other: [],
  };

  const results = Array.from(aggregated.values()).map((entry) => {
    const sourcesArray = Array.from(entry.sources);
    const score = entry.occurrences * Math.log(1 + sourcesArray.length);
    const category = categorizeKeyword(entry.keyword, entry.normalized);

    return {
      keyword: entry.keyword,
      normalized: entry.normalized,
      occurrences: entry.occurrences,
      sources: sourcesArray,
      score,
      category,
    };
  });

  const sorted = orderBy(results, ['score', 'occurrences'], ['desc', 'desc']);
  const top = sorted.slice(0, 10);

  const topByCategory = merge({}, baseCategories);
  sorted.forEach((item) => {
    if (topByCategory[item.category].length < 5) {
      topByCategory[item.category].push(item);
    }
  });

  return {
    date: new Date().toISOString().slice(0, 10),
    all: sorted,
    top,
    topByCategory,
  };
}

const __filename = fileURLToPath(import.meta.url);

if (process.argv[1] && process.argv[1] === __filename) {
  // Pour ajouter ou modifier des flux, mettez à jour ce tableau DEFAULT_FEEDS.
  const DEFAULT_FEEDS = [
    'https://www.lemonde.fr/rss/une.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://www.france24.com/fr/rss',
    'https://www.lefigaro.fr/rss/figaro_international.xml',
    'https://www.theguardian.com/world/rss',
    'https://www.politico.eu/feed',
    'https://www.hollywoodreporter.com/t/rss',
    'https://variety.com/feed/',
    'https://www.latimes.com/world/rss2',
  ];

  fetchRssTopics({ feedUrls: DEFAULT_FEEDS })
    .then((result) => {
      console.log(JSON.stringify(result, null, 2));
      // Pour tester localement : node scripts/rss-topics.js
      // En production, exécuter ce script via une API ou un cron, puis stocker le résultat dans un KV store.
    })
    .catch((error) => {
      console.error('Failed to fetch RSS topics:', error);
      process.exitCode = 1;
    });
}
