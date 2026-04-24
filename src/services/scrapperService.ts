import * as cheerio from "cheerio";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { Readable } from "stream";

// ─── S3 client setup ────────────────────────────────────────────────────────
// All config comes from env — never hardcode credentials.
// Required env vars:
//   AWS_REGION          e.g. "ap-south-1"
//   AWS_ACCESS_KEY_ID
//   AWS_SECRET_ACCESS_KEY
//   S3_BUCKET_NAME      e.g. "secondbrain-raw-content"

// Lazy getter — created on first call so dotenv has loaded by then.
// Module-level S3Client causes undefined credentials because it
// instantiates before dotenv.config() runs in server.ts.
let s3Instance: S3Client | null = null;

function getS3Client(): S3Client {
  if (s3Instance) return s3Instance;
  if (!process.env.AWS_ACCESS_KEY_ID)
    throw new Error("AWS_ACCESS_KEY_ID not set");
  if (!process.env.AWS_SECRET_ACCESS_KEY)
    throw new Error("AWS_SECRET_ACCESS_KEY not set");
  s3Instance = new S3Client({
    region: process.env.AWS_REGION || "ap-south-1",
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });
  return s3Instance;
}

function getBucket(): string {
  if (!process.env.S3_BUCKET_NAME) throw new Error("S3_BUCKET_NAME not set");
  return process.env.S3_BUCKET_NAME;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type ContentType = "article" | "youtube" | "twitter" | "unknown";

export interface ScrapeResult {
  contentType: ContentType;
  rawContentKey: string; // S3 key — store this on the MongoDB document
  textPreview: string; // first 200 chars — useful for quick UI display
  scrapeBlocked: boolean; // true = site blocked us, enriched from title only
}

// ─── URL detection ───────────────────────────────────────────────────────────

function detectContentType(url: string): ContentType {
  try {
    const { hostname } = new URL(url);
    const host = hostname.replace(/^www\./, "");

    if (host === "youtube.com" || host === "youtu.be") return "youtube";
    if (host === "twitter.com" || host === "x.com") return "twitter";

    return "article";
  } catch {
    return "unknown";
  }
}

// ─── Scrapers ────────────────────────────────────────────────────────────────

// YouTube — uses the public oEmbed endpoint, no API key required.
// Returns the video title + channel name concatenated.
// Direct Cheerio scraping of youtube.com is blocked by Google.
async function scrapeYouTube(url: string): Promise<string> {
  const oEmbedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;

  const res = await fetch(oEmbedUrl);
  if (!res.ok) throw new Error(`YouTube oEmbed failed: ${res.status}`);

  const data = (await res.json()) as {
    title?: string;
    author_name?: string;
  };

  return [
    data.title ? `Title: ${data.title}` : "",
    data.author_name ? `Channel: ${data.author_name}` : "",
    `URL: ${url}`,
  ]
    .filter(Boolean)
    .join("\n");
}

// Twitter/X — uses the public oEmbed endpoint, no API key required.
async function scrapeTwitter(url: string): Promise<string> {
  const oEmbedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(url)}`;

  const res = await fetch(oEmbedUrl);
  if (!res.ok) throw new Error(`Twitter oEmbed failed: ${res.status}`);

  const data = (await res.json()) as {
    html?: string;
    author_name?: string;
  };

  if (!data.html) throw new Error("Twitter oEmbed returned no HTML");

  // oEmbed returns HTML — strip all tags to get plain tweet text
  const $ = cheerio.load(data.html);
  const text = $("p").first().text().trim();

  return [
    data.author_name ? `Author: ${data.author_name}` : "",
    text ? `Tweet: ${text}` : "",
    `URL: ${url}`,
  ]
    .filter(Boolean)
    .join("\n");
}

// General article scraper using Cheerio.
// Extraction strategy (in order of preference):
//   1. <article> tag — most editorial sites use it correctly
//   2. <main> tag — common fallback
//   3. The <div> with the most <p> children — heuristic content detection
//   4. All <p> tags — last resort
// Removes noise (nav, footer, ads, cookie banners) before extracting.
async function scrapeArticle(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      // Pretend to be a browser — many sites block default Node fetch UA
      "User-Agent":
        "Mozilla/5.0 (compatible; SecondBrainBot/1.0; +https://secondbrain.app)",
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
    signal: AbortSignal.timeout(10_000), // 10s max — don't hang the worker
  });

  // Site is blocking scrapers — don't retry, return a marker string
  // so the enrichment worker knows to enrich from title only
  if (res.status === 403 || res.status === 401 || res.status === 429) {
    console.warn(`[scraper] Site blocked (${res.status}): ${url}`);
    return `SCRAPE_BLOCKED
URL: ${url}`;
  }

  if (!res.ok) throw new Error(`Fetch failed: ${res.status} for ${url}`);

  const html = await res.text();
  const $ = cheerio.load(html);

  // Strip noise before extracting text
  $(
    "script, style, noscript, nav, footer, header, aside, " +
      "[class*='cookie'], [class*='banner'], [class*='popup'], " +
      "[class*='ad-'], [id*='ad-'], [class*='sidebar']",
  ).remove();

  // Page title and meta description for extra context
  const pageTitle =
    $("title").text().trim() || $("h1").first().text().trim() || "";

  const metaDesc =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    "";

  // Try content extraction in order of specificity
  let bodyText = "";

  const articleEl = $("article").first();
  if (articleEl.length && articleEl.text().trim().length > 200) {
    bodyText = articleEl.text();
  }

  if (!bodyText) {
    const mainEl = $("main").first();
    if (mainEl.length && mainEl.text().trim().length > 200) {
      bodyText = mainEl.text();
    }
  }

  if (!bodyText) {
    // Find the <div> with the highest combined score of
    // paragraph count + text length — usually the content div
    let bestDiv = "";
    let bestScore = 0;
    $("div").each((_, el) => {
      const paragraphs = $(el).find("p").length;
      const text = $(el).text().trim();
      const score = paragraphs * 10 + text.length;
      if (score > bestScore) {
        bestScore = score;
        bestDiv = text;
      }
    });
    if (bestDiv.length > 200) bodyText = bestDiv;
  }

  if (!bodyText) {
    // Last resort — all paragraph text, skip one-liners
    bodyText = $("p")
      .map((_, el) => $(el).text().trim())
      .get()
      .filter((t) => t.length > 40)
      .join("\n\n");
  }

  // Collapse excess whitespace
  const cleanBody = bodyText
    .replace(/\t/g, " ")
    .replace(/ {2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  // Cap at 50,000 chars — enough for Claude context window,
  // avoids massive S3 objects. Most articles are under 10,000 chars.
  const truncated = cleanBody.slice(0, 50_000);

  return [
    pageTitle ? `Title: ${pageTitle}` : "",
    metaDesc ? `Description: ${metaDesc}` : "",
    `URL: ${url}`,
    "",
    truncated,
  ]
    .filter((line) => line !== undefined)
    .join("\n");
}

// ─── S3 helpers ──────────────────────────────────────────────────────────────

async function uploadToS3(contentId: string, text: string): Promise<string> {
  const key = `content/${contentId}.txt`;

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getBucket(),
      Key: key,
      Body: text,
      ContentType: "text/plain; charset=utf-8",
      // Server-side encryption at zero extra cost
      ServerSideEncryption: "AES256",
    }),
  );

  return key;
}

// Called by the enrichment worker to read the scraped text back from S3.
// Returns the full raw text string.
export async function fetchRawContent(rawContentKey: string): Promise<string> {
  const res = await getS3Client().send(
    new GetObjectCommand({
      Bucket: getBucket(),
      Key: rawContentKey,
    }),
  );

  if (!res.Body) throw new Error(`S3 object empty: ${rawContentKey}`);

  // S3 SDK returns a Readable stream — collect into a string
  const stream = res.Body as Readable;
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks).toString("utf-8");
}

// ─── Main export ─────────────────────────────────────────────────────────────

// scrapeAndStore is the only function the BullMQ worker calls.
// Flow:
//   1. Detect URL type
//   2. Scrape with the right strategy
//   3. Upload plain text to S3
//   4. Return the S3 key + a short preview
// The worker updates MongoDB with these values after this resolves.
export async function scrapeAndStore(
  contentId: string,
  url: string,
): Promise<ScrapeResult> {
  const contentType = detectContentType(url);

  let rawText: string;

  switch (contentType) {
    case "youtube":
      rawText = await scrapeYouTube(url);
      break;
    case "twitter":
      rawText = await scrapeTwitter(url);
      break;
    case "article":
      rawText = await scrapeArticle(url);
      break;
    default:
      // Unknown URL — store what we have so enrichment
      // can still work from the user-provided title
      rawText = `URL: ${url}\nContent type could not be determined.`;
  }

  const scrapeBlocked = rawText.startsWith("SCRAPE_BLOCKED");
  const rawContentKey = await uploadToS3(contentId, rawText);

  return {
    contentType,
    rawContentKey,
    scrapeBlocked,
    textPreview: scrapeBlocked
      ? "Content could not be scraped — AI will summarise from title"
      : rawText.replace(/\n+/g, " ").slice(0, 200).trim(),
  };
}