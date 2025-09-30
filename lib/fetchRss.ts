import Parser from "rss-parser";

const parser = new Parser();

export async function fetchRssFeeds() {
  const feeds = [
    "https://www.lemonde.fr/rss/une.xml",
    "https://feeds.feedburner.com/SciencesEtAvenir-A-La-Une",
    "https://www.franceculture.fr/rss.xml"
  ];
  const items: { title: string; description?: string }[] = [];
  for (const url of feeds) {
    try {
      const feed = await parser.parseURL(url);
      for (const entry of feed.items.slice(0, 3)) {
        items.push({
          title: entry.title || "",
          description: entry.contentSnippet || ""
        });
      }
    } catch (e) {
      console.error("RSS fetch failed:", url, e);
    }
  }
  return items.slice(0, 10);
}
