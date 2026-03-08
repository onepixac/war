import { NextResponse } from "next/server";
import { initDB, query } from "@/lib/db";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const reset = body?.reset === true;

    await initDB();

    if (reset) {
      await query("DELETE FROM attacks");
      await query("DELETE FROM articles");
      await query("DELETE FROM sources");
    }

    // All 103 RSS sources from the original NewFeeds project
    // https://github.com/ktoetotam/NewFeeds/blob/main/scripts/sources.yaml
    const defaultSources = [
      // ==================== IRAN (11 RSS) ====================
      { name: "IRNA", url: "https://www.irna.ir/rss", region: "iran", language: "fa", category: "state" },
      { name: "Press TV", url: "https://www.presstv.ir/rss.xml", region: "iran", language: "en", category: "state" },
      { name: "Al Alam", url: "https://www.alalam.ir/rss/important_news", region: "iran", language: "ar", category: "state" },
      { name: "Tehran Times", url: "https://www.tehrantimes.com/rss", region: "iran", language: "en", category: "state" },
      { name: "Iran News Daily", url: "https://irannewsdaily.com/feed/", region: "iran", language: "en", category: "independent" },
      { name: "Iran Herald", url: "https://feeds.iranherald.com/rss/1b76a2b4cf7810bd", region: "iran", language: "en", category: "independent" },
      { name: "Shafaqna English", url: "https://en.shafaqna.com/feed/", region: "iran", language: "en", category: "state-aligned" },
      { name: "Shafaqna Persian", url: "https://fa.shafaqna.com/feed/", region: "iran", language: "fa", category: "state-aligned" },
      { name: "NCR Iran", url: "https://www.ncr-iran.org/en/feed/", region: "iran", language: "en", category: "independent" },
      { name: "Tasnim News", url: "https://tasnimnews.ir/fa/rss/feed/0/0/8/1/TopStories", region: "iran", language: "fa", category: "state-aligned" },
      { name: "Tasnim Most Popular", url: "https://tasnimnews.ir/fa/rss/feed/1/0/7/0/MostPupolar", region: "iran", language: "fa", category: "state-aligned" },

      // ==================== RUSSIA (5 RSS) ====================
      { name: "TASS", url: "https://tass.ru/rss/v2.xml", region: "russia", language: "ru", category: "state" },
      { name: "RIA Novosti", url: "https://ria.ru/export/rss2/archive/index.xml", region: "russia", language: "ru", category: "state" },
      { name: "RT", url: "https://www.rt.com/rss/news/", region: "russia", language: "en", category: "state" },
      { name: "Kommersant", url: "https://www.kommersant.ru/RSS/news.xml", region: "russia", language: "ru", category: "state" },
      { name: "RBC", url: "https://rssexport.rbc.ru/rbcnews/news/30/full.rss", region: "russia", language: "ru", category: "state" },

      // ==================== ISRAEL (15 RSS) ====================
      { name: "Ynet", url: "https://www.ynet.co.il/Integration/StoryRss2.xml", region: "israel", language: "he", category: "state-aligned" },
      { name: "Maariv", url: "https://www.maariv.co.il/Rss/RssChad498", region: "israel", language: "he", category: "state-aligned" },
      { name: "Jerusalem Post", url: "https://www.jpost.com/rss/rssfeedsfrontpage.aspx", region: "israel", language: "en", category: "independent" },
      { name: "IsraelInfo News", url: "https://news.israelinfo.co.il/rss/news.xml", region: "israel", language: "ru", category: "independent" },
      { name: "IsraelInfo Events", url: "https://news.israelinfo.co.il/rss/news_events.xml", region: "israel", language: "ru", category: "independent" },
      { name: "IsraelInfo Law", url: "https://news.israelinfo.co.il/rss/news_law.xml", region: "israel", language: "ru", category: "independent" },
      { name: "IsraelInfo Politics", url: "https://news.israelinfo.co.il/rss/news_politics.xml", region: "israel", language: "ru", category: "independent" },
      { name: "HM News", url: "https://hm-news.co.il/feed/", region: "israel", language: "he", category: "independent" },
      { name: "HonestReporting", url: "https://honestreporting.com/feed/", region: "israel", language: "en", category: "independent" },
      { name: "Mivzakim Breaking", url: "https://rss.mivzakim.net/rss/category/1", region: "israel", language: "he", category: "independent" },
      { name: "Mivzakim Main", url: "https://rss.mivzakim.net/rss/feed/1", region: "israel", language: "he", category: "independent" },
      { name: "Mivzakim Military", url: "https://rss.mivzakim.net/rss/feed/61", region: "israel", language: "he", category: "independent" },
      { name: "Mivzakim Politics", url: "https://rss.mivzakim.net/rss/feed/76", region: "israel", language: "he", category: "independent" },
      { name: "Mivzakim World", url: "https://rss.mivzakim.net/rss/feed/89", region: "israel", language: "he", category: "independent" },
      { name: "Tov News", url: "https://tovnews.co.il/feed", region: "israel", language: "he", category: "independent" },

      // ==================== GULF STATES (9 RSS) ====================
      { name: "QNA Qatar Arabic", url: "https://qna.org.qa/ar-QA/Pages/RSS-Feeds/Qatar", region: "gulf", language: "ar", category: "state" },
      { name: "QNA General Arabic", url: "https://qna.org.qa/ar-QA/Pages/RSS-Feeds/General", region: "gulf", language: "ar", category: "state" },
      { name: "QNA Qatar English", url: "https://qna.org.qa/en/Pages/RSS-Feeds/Qatar", region: "gulf", language: "en", category: "state" },
      { name: "QNA General English", url: "https://qna.org.qa/en/Pages/RSS-Feeds/General", region: "gulf", language: "en", category: "state" },
      { name: "Al Jazeera English", url: "https://www.aljazeera.com/xml/rss/all.xml", region: "gulf", language: "en", category: "state" },
      { name: "Al Jazeera Arabic", url: "https://www.aljazeera.net/feed", region: "gulf", language: "ar", category: "state" },
      { name: "Asharq Al-Awsat", url: "https://english.aawsat.com/feed", region: "gulf", language: "en", category: "state-aligned" },
      { name: "Marsal Qatar", url: "https://marsalqatar.qa/rss/category/5", region: "gulf", language: "ar", category: "independent" },

      // ==================== MIDDLE EAST (25 RSS) ====================
      { name: "Middle East Eye", url: "https://www.middleeasteye.net/rss", region: "middle_east", language: "en", category: "independent" },
      { name: "Al-Monitor", url: "https://www.al-monitor.com/rss", region: "middle_east", language: "en", category: "independent" },
      { name: "The New Arab", url: "https://www.newarab.com/rss", region: "middle_east", language: "en", category: "independent" },
      { name: "SANA Syria", url: "https://sana.sy/en/?feed=rss2", region: "middle_east", language: "en", category: "state" },
      { name: "Wadaq Syria", url: "https://wadaq.sy/feed/", region: "middle_east", language: "ar", category: "independent" },
      { name: "Syria Direct", url: "https://syriadirect.org/feed/", region: "middle_east", language: "en", category: "independent" },
      { name: "Al-Thawra Syria", url: "https://thawra.sy/?feed=rss2", region: "middle_east", language: "ar", category: "state" },
      { name: "Jordan Times News", url: "https://jordantimes.com/rss-feed/46", region: "middle_east", language: "en", category: "state-aligned" },
      { name: "Jordan Times Local", url: "https://jordantimes.com/rss-feed/47", region: "middle_east", language: "en", category: "state-aligned" },
      { name: "Hala Jordan", url: "https://www.hala.jo/feed/", region: "middle_east", language: "ar", category: "independent" },
      { name: "Daily News Egypt", url: "https://www.dailynewsegypt.com/feed/", region: "middle_east", language: "en", category: "independent" },
      { name: "Iraq Business News", url: "https://www.iraq-businessnews.com/feed/", region: "middle_east", language: "en", category: "independent" },
      { name: "Al-Sabah Iraq", url: "https://alsabaah.iq/rss.xml", region: "middle_east", language: "ar", category: "state" },
      { name: "Iraqi Media Network", url: "https://imn.iq/feed", region: "middle_east", language: "ar", category: "state" },
      { name: "Al-Masra Iraq", url: "https://almasra.iq/feed/", region: "middle_east", language: "ar", category: "independent" },
      { name: "Al-Rabiaa TV Iraq", url: "https://api.alrabiaa.tv/api/v1/feed", region: "middle_east", language: "ar", category: "independent" },
      { name: "ECSS Egypt", url: "https://ecss.com.eg/feed/", region: "middle_east", language: "ar", category: "independent" },
      { name: "Nile News Egypt", url: "https://nile.eg/feed", region: "middle_east", language: "ar", category: "state" },
      { name: "Egypt Independent", url: "https://egyptindependent.com/feed/", region: "middle_east", language: "en", category: "independent" },
      { name: "FAJ Egypt", url: "https://faj.org.eg/feed", region: "middle_east", language: "ar", category: "independent" },

      // ==================== PROXY ACTORS (7 RSS) ====================
      { name: "Al-Thawra Yemen", url: "https://althawrah.ye/feed", region: "proxy", language: "ar", category: "proxy" },
      { name: "Al Masirah (Houthi)", url: "https://almasirah.net.ye/feed/rss", region: "proxy", language: "ar", category: "proxy" },
      { name: "Al Masirah TV English", url: "https://english.masirahtv.net/rss.php", region: "proxy", language: "en", category: "proxy" },
      { name: "Al-Baath Yemen", url: "https://www.albaath.ye/feed/", region: "proxy", language: "ar", category: "proxy" },
      { name: "Yemen Tax Authority", url: "https://tax.gov.ye/feed/", region: "proxy", language: "ar", category: "proxy" },
      { name: "Yemen Academy", url: "https://yemenacademy.edu.ye/feed/", region: "proxy", language: "ar", category: "proxy" },

      // ==================== CHINA (5 RSS) ====================
      { name: "Xinhua English", url: "http://www.xinhuanet.com/english/rss/worldrss.xml", region: "china", language: "en", category: "state" },
      { name: "Global Times", url: "https://www.globaltimes.cn/rss/outbrain.xml", region: "china", language: "en", category: "state-aligned" },
      { name: "CGTN World", url: "https://www.cgtn.com/subscribe/rss/section/world.xml", region: "china", language: "en", category: "state" },
      { name: "China Daily World", url: "https://www.chinadaily.com.cn/rss/world_rss.xml", region: "china", language: "en", category: "state" },
      { name: "South China Morning Post", url: "https://www.scmp.com/rss/91/feed", region: "china", language: "en", category: "independent" },

      // ==================== TURKEY (2 RSS) ====================
      { name: "Anadolu Agency", url: "https://www.aa.com.tr/en/rss/default?cat=world", region: "turkey", language: "en", category: "state" },
      { name: "Daily Sabah World", url: "https://www.dailysabah.com/rssFeed/world", region: "turkey", language: "en", category: "state-aligned" },

      // ==================== SOUTH ASIA (7 RSS) ====================
      { name: "Dawn Pakistan", url: "https://www.dawn.com/feeds/home", region: "south_asia", language: "en", category: "independent" },
      { name: "Geo TV Pakistan", url: "https://www.geo.tv/rss/1/1", region: "south_asia", language: "en", category: "independent" },
      { name: "The News International", url: "https://www.thenews.com.pk/rss/1/1", region: "south_asia", language: "en", category: "independent" },
      { name: "Express Tribune", url: "https://tribune.com.pk/feed/home", region: "south_asia", language: "en", category: "independent" },
      { name: "The Hindu International", url: "https://www.thehindu.com/news/international/feeder/default.rss", region: "south_asia", language: "en", category: "independent" },
      { name: "Times of India World", url: "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms", region: "south_asia", language: "en", category: "independent" },
      { name: "Hindustan Times World", url: "https://www.hindustantimes.com/feeds/rss/world-news/rssfeed.xml", region: "south_asia", language: "en", category: "independent" },

      // ==================== WESTERN (22 RSS) ====================
      { name: "NYT Iran", url: "https://www.nytimes.com/svc/collections/v1/publish/https://www.nytimes.com/topic/destination/iran/rss.xml", region: "western", language: "en", category: "independent" },
      { name: "BBC World", url: "http://news.bbc.co.uk/rss/newsonline_world_edition/feeds.opml", region: "western", language: "en", category: "independent" },
      { name: "HuffPost World", url: "https://www.huffpost.com/section/world-news/feed", region: "western", language: "en", category: "independent" },
      { name: "NYT Top Stories", url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", region: "western", language: "en", category: "independent" },
      { name: "FOX News", url: "http://feeds.foxnews.com/foxnews/latest", region: "western", language: "en", category: "independent" },
      { name: "Washington Post World", url: "http://feeds.washingtonpost.com/rss/world", region: "western", language: "en", category: "independent" },
      { name: "WSJ World News", url: "https://feeds.a.dj.com/rss/RSSWorldNews.xml", region: "western", language: "en", category: "independent" },
      { name: "LA Times World", url: "https://www.latimes.com/world-nation/rss2.0.xml", region: "western", language: "en", category: "independent" },
      { name: "CNN International", url: "http://rss.cnn.com/rss/edition.rss", region: "western", language: "en", category: "independent" },
      { name: "Yahoo News", url: "https://news.yahoo.com/rss/", region: "western", language: "en", category: "independent" },
      { name: "Yahoo Finance", url: "https://finance.yahoo.com/news/rssindex", region: "western", language: "en", category: "independent" },
      { name: "CNBC Top News", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html", region: "western", language: "en", category: "independent" },
      { name: "Politico Playbook", url: "https://rss.politico.com/playbook.xml", region: "western", language: "en", category: "independent" },
      { name: "BBC News", url: "http://feeds.bbci.co.uk/news/rss.xml", region: "western", language: "en", category: "independent" },
      { name: "The Guardian World", url: "https://www.theguardian.com/world/rss", region: "western", language: "en", category: "independent" },
      { name: "Daily Mail", url: "https://www.dailymail.co.uk/home/index.rss", region: "western", language: "en", category: "independent" },
      { name: "The Independent", url: "http://www.independent.co.uk/news/uk/rss", region: "western", language: "en", category: "independent" },
      { name: "Daily Express", url: "http://feeds.feedburner.com/daily-express-news-showbiz", region: "western", language: "en", category: "independent" },
      { name: "Bellingcat", url: "https://media.rss.com/bellingcatstagetalk/feed.xml", region: "western", language: "en", category: "independent" },
      { name: "CBS 60 Minutes", url: "https://www.cbsnews.com/latest/rss/60-minutes", region: "western", language: "en", category: "independent" },
      { name: "DW News", url: "https://rss.dw.com/rdf/rss-en-all", region: "western", language: "en", category: "independent" },
      { name: "Tagesschau Ausland", url: "https://www.tagesschau.de/ausland/index~rss2.xml", region: "western", language: "de", category: "independent" },
    ];

    let added = 0;
    for (const source of defaultSources) {
      const result = await query(
        `INSERT INTO sources (name, url, region, language, category) VALUES ($1, $2, $3, $4, $5) ON CONFLICT (url) DO NOTHING RETURNING id`,
        [source.name, source.url, source.region, source.language, source.category]
      );
      if (result.length > 0) added++;
    }

    const total = await query("SELECT COUNT(*) as count FROM sources WHERE active = true");

    return NextResponse.json({
      message: `Sources synced: ${added} new added, ${total[0].count} total active`,
      added,
      total: parseInt(total[0].count),
    });
  } catch (error) {
    console.error("Init error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
