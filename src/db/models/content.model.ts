import { Schema, model } from "mongoose";

const contentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true },
    link: { type: String, required: true },
    tags: { type: [Schema.Types.ObjectId], ref: "Tag", default: [] },

    // What kind of content this is — detected by the scraper from the URL.
    contentType: {
      type: String,
      enum: ["article", "youtube", "twitter", "unknown"],
      default: "unknown",
    },

    // S3 object key pointing to the full scraped text.
    // e.g. "content/64f3a2b1c4e5d6f7a8b9c0d1.txt"
    // Empty string means scraping hasn't run yet or failed.
    rawContentKey: { type: String, default: "" },

    // AI-generated 2-sentence summary of the content.
    // Populated by the enrichment worker after scraping.
    summary: { type: String, default: "" },

    // Vector embedding of the content — used for semantic search.
    // Populated by the embeddings worker after scraping.
    embedding: { type: [Number], default: [] },

    // Graph edges — populated by the auto-linking worker.
    // Each entry points to another content item this is related to.
    relations: {
      type: [
        {
          contentId: {
            type: Schema.Types.ObjectId,
            ref: "Content",
            required: true,
          },
          relationshipType: {
            type: String,
            enum: ["compare", "extends", "leads_to", "same_domain"],
            required: true,
          },
          reason: { type: String, required: true },
          // Cosine similarity score from the embedding comparison (0.0 – 1.0)
          strength: { type: Number, min: 0, max: 1, default: 0 },
        },
      ],
      default: [],
    },

    // Tracks where this content document is in the async processing pipeline.
    // "pending"  → just saved, workers haven't run yet
    // "scraping" → scraper is actively fetching the URL
    // "scraped"  → raw content is in S3, enrichment worker can start
    // "enriched" → summary, tags, embedding are all populated
    // "failed"   → one of the workers failed — check logs
    status: {
      type: String,
      enum: ["pending", "scraping", "scraped", "enriched", "failed"],
      default: "pending",
    },

    // Set to true by the dead link detector cron job.
    isBroken: { type: Boolean, default: false },

    // false = site blocked scraping, content was enriched from title only.
    // Frontend shows a subtle "AI summary only" badge when this is false.
    scrapedSuccessfully: { type: Boolean, default: true },

    // Suggested follow-up topics from the auto-linking worker.
    // e.g. ["Kafka vs RabbitMQ", "event sourcing patterns"]
    suggestedTopics: { type: [String], default: [] },
  },
  {
    timestamps: true, // createdAt + updatedAt managed by Mongoose
  },
);

export const ContentModel = model("Content", contentSchema);