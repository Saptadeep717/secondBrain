import { ContentModel } from "../models";
import { ContentType } from "../../services/scrapperService";
import { SIMILARITY_THRESHOLD } from "../../services/ai/embeddings.service";

export class ContentRepository {
  async createContent(
    userId: string,
    title: string,
    link: string,
    tags: string[],
  ) {
    return ContentModel.create({ userId, title, link, tags });
  }

  async getContentsByUser(userId: string) {
    return ContentModel.find({ userId })
      .populate("userId", "username")
      .populate("tags", "name")
      .sort({ createdAt: -1 });
  }

  async getContentById(contentId: string) {
    return ContentModel.findById(contentId).populate("tags", "name").lean();
  }

  // Public shared brain — strips userId, only returns what a stranger needs
  async getPublicContentsByUser(userId: string) {
    return ContentModel.find({ userId })
      .select("title link tags summary contentType createdAt -_id")
      .populate("tags", "name -_id")
      .sort({ createdAt: -1 });
  }

  async deleteContent(userId: string, contentId: string) {
    return ContentModel.deleteOne({ _id: contentId, userId });
  }

  // Partial update called by scraper worker, enrichment worker, dead link detector.
  // Tags are merged with $addToSet — AI tags never overwrite user tags.
  async updateScrapedContent(
    contentId: string,
    update: {
      rawContentKey?: string;
      contentType?: ContentType | string;
      status?: "pending" | "scraping" | "scraped" | "enriched" | "failed";
      summary?: string;
      embedding?: number[];
      suggestedTopics?: string[];
      tags?: string[]; // merged with $addToSet
      scrapedSuccessfully?: boolean;
      title?: string; // AI-generated title
    },
  ) {
    const { tags, ...rest } = update;
    const mongoUpdate: Record<string, any> = {};

    if (Object.keys(rest).length > 0) mongoUpdate["$set"] = rest;

    // $addToSet merges without duplicating — safe to call multiple times
    if (tags && tags.length > 0) {
      mongoUpdate["$addToSet"] = { tags: { $each: tags } };
    }

    return ContentModel.updateOne({ _id: contentId }, mongoUpdate);
  }

  // Adds knowledge graph edges to this content item.
  // Uses $addToSet on relations array to prevent duplicate edges.
  async addRelations(
    contentId: string,
    relations: Array<{
      contentId: string;
      relationshipType: string;
      reason: string;
      strength: number;
    }>,
  ) {
    return ContentModel.updateOne(
      { _id: contentId },
      { $addToSet: { relations: { $each: relations } } },
    );
  }

  // Cosine similarity search over stored embedding vectors.
  // Computed in JS — sufficient at personal scale (<10k docs).
  // Switch to MongoDB Atlas $vectorSearch past that.
  async searchSimilar(
    userId: string,
    queryVector: number[],
    topK = 5,
  ): Promise<any[]> {
    // Fetch all enriched content for this user that has a non-empty embedding.
    // Note: $not: { $size: 0 } only catches truly empty arrays [].
    // We also filter in JS below to catch zero-vectors [0,0,0,...].
    const contents = await ContentModel.find({
      userId,
      status: "enriched",
      embedding: { $exists: true, $not: { $size: 0 } },
    })
      .populate("tags", "name")
      .lean();

    if (!contents.length) return [];

    const magB = Math.sqrt(queryVector.reduce((s, v) => s + v * v, 0));
    if (!magB) return [];

    const scored = contents
      .filter((doc) => {
        // Skip zero vectors — these are docs where embedding failed silently.
        // A zero vector has magA=0 and gives similarity=0 for everything,
        // polluting results with unrelated content.
        const vec = doc.embedding as number[];
        if (!vec || vec.length === 0) return false;
        const magA = Math.sqrt(
          vec.reduce((s: number, v: number) => s + v * v, 0),
        );
        return magA > 0;
      })
      .map((doc) => {
        const vec = doc.embedding as number[];
        const dot = vec.reduce(
          (sum: number, v: number, i: number) =>
            sum + v * (queryVector[i] ?? 0),
          0,
        );
        const magA = Math.sqrt(
          vec.reduce((s: number, v: number) => s + v * v, 0),
        );
        const similarity = magA && magB ? dot / (magA * magB) : 0;
        return { doc, similarity };
      });

    scored.forEach(({ doc, similarity }) => {
      console.log(
        `[chat-search] "${(doc as any).title?.slice(0, 40)}" → ${similarity.toFixed(4)}`,
      );
    });

    return scored
      .sort((a, b) => b.similarity - a.similarity)
      .filter(({ similarity }) => similarity > SIMILARITY_THRESHOLD)
      .slice(0, topK)
      .map(({ doc }) => doc);
  }
}
