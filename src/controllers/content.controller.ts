import { ContentRepository } from "../db/repository/content.repo";
import { TagRepository } from "../db/repository/tag.repo";
import { ApiErrorFactory } from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import { wrapAsync } from "../utils/AsyncHandler";
import { scrapeQueue, ScrapeJobData } from "../queues/queues";

const contentRepo = new ContentRepository();
const tagRepo = new TagRepository();

// Platforms where the URL path is meaningless (random IDs, hashes)
const GENERIC_HOSTS: Record<string, string> = {
  "docs.google.com": "Google Doc",
  "drive.google.com": "Google Drive file",
  "sheets.google.com": "Google Sheet",
  "slides.google.com": "Google Slides",
  "notion.so": "Notion page",
  "figma.com": "Figma design",
  "miro.com": "Miro board",
  "airtable.com": "Airtable base",
  "trello.com": "Trello board",
  "linear.app": "Linear issue",
};

function deriveTitleFromUrl(url: string): string {
  try {
    const { hostname, pathname } = new URL(url);
    const host = hostname.replace(/^www\./, "");

    // Known platforms
    for (const [platform, label] of Object.entries(GENERIC_HOSTS)) {
      if (host.includes(platform)) return label;
    }

    // GitHub — use owner/repo
    if (host.includes("github.com")) {
      const parts = pathname.split("/").filter(Boolean);
      if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
      if (parts.length === 1) return parts[0] || "GitHub";
    }

    // YouTube / Twitter placeholders — AI will generate real title
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      return "YouTube video";
    }
    if (host.includes("twitter.com") || host.includes("x.com")) {
      return "Tweet";
    }

    // Regular URLs — scan path segments for readable title
    const segments = pathname.split("/").filter(Boolean);
    for (let i = segments.length - 1; i >= 0; i--) {
      const segment = segments[i];
      if (!segment) continue;
      const cleaned = segment
        .replace(/[-_]/g, " ")
        .replace(/\.[^.]+$/, "")
        .replace(/\s+/g, " ")
        .trim();

      const words = cleaned.split(" ").filter(Boolean);
      if (words.length >= 2 && cleaned.length >= 10 && cleaned.length <= 80) {
        return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
      }
    }

    return host.charAt(0).toUpperCase() + host.slice(1);
  } catch {
    return "Saved link";
  }
}

export const createContent = wrapAsync(async (req, res) => {
  let { link, title, tags } = req.body;

  if (!link) {
    throw ApiErrorFactory.createError("BAD_REQUEST", "Link is required");
  }

  try {
    new URL(link);
  } catch {
    throw ApiErrorFactory.createError("BAD_REQUEST", "Invalid URL format");
  }

  // Derive title from URL if not provided — AI will improve during enrichment
  if (!title || title.trim().length === 0) {
    title = deriveTitleFromUrl(link);
    console.log(`[content] No title provided — derived: "${title}"`);
  }

  // Normalise tags — always an array of strings
  if (!tags || !Array.isArray(tags)) tags = [];
  const cleanTags: string[] = tags
    .map((t: any) => String(t).toLowerCase().trim())
    .filter(Boolean);

  const tagDocs = await tagRepo.findOrCreateTags(cleanTags);
  const tagIds = tagDocs.map((t: any) => t.toString());

  const content = await contentRepo.createContent(
    req.userId!,
    title,
    link,
    tagIds,
  );
  const contentId = content._id.toString();

  // Pass cleanTags (plain strings) through the job so the enrichment
  // worker can include them when generating the embedding
  const jobData: ScrapeJobData = {
    contentId,
    url: link,
    userId: req.userId!,
    title,
    manualTags: cleanTags,
  };

  await scrapeQueue.add(`scrape-${contentId}` as any, jobData, {
    jobId: `scrape-${contentId}`,
  });

  res.status(202).json(
    ApiResponse.created("Content saved — processing in background", {
      id: contentId,
      title,
      status: "pending",
    }),
  );
});

export const getContents = wrapAsync(async (req, res) => {
  const contents = await contentRepo.getContentsByUser(req.userId!);
  res.status(200).json(ApiResponse.success("Content fetched", contents));
});

export const deleteContent = wrapAsync(async (req, res) => {
  const { contentId } = req.params;
  if (!contentId) {
    throw ApiErrorFactory.createError("BAD_REQUEST", "ContentId is required");
  }
  await contentRepo.deleteContent(req.userId!, contentId);
  res.status(204).send();
});
