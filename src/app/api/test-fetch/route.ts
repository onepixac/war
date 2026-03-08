import { NextResponse } from "next/server";

export async function GET() {
  const urls = [
    "https://feeds.npr.org/1004/rss.xml",
    "https://rss.dw.com/rdf/rss-en-world",
    "https://www.theguardian.com/world/rss",
  ];

  const results = [];

  for (const url of urls) {
    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; WarMonitor/1.0)",
          "Accept": "application/rss+xml, application/xml, text/xml, */*",
        },
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      });
      const text = await res.text();
      results.push({
        url,
        status: res.status,
        ok: res.ok,
        contentLength: text.length,
        snippet: text.slice(0, 200),
      });
    } catch (err) {
      results.push({
        url,
        error: String(err),
        name: (err as Error).name,
        cause: (err as Error).cause ? String((err as Error).cause) : undefined,
      });
    }
  }

  return NextResponse.json(results, { status: 200 });
}
