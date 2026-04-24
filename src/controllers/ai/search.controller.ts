import { ContentRepository } from "../../db/repository/content.repo";
import { generateQueryEmbedding } from "../../services/ai/embeddings.service";
import { ApiErrorFactory } from "../../utils/ApiError";
import ApiResponse from "../../utils/ApiResponse";
import { wrapAsync } from "../../utils/AsyncHandler";

const contentRepo = new ContentRepository();

// GET /api/v1/content/search?q=your+query&limit=5
//
// Semantic search over the user's saved content.
// Embeds the query with the same model used at save time,
// then runs cosine similarity against stored vectors.
//
// Falls back to an empty array (not an error) if:
//   - No content has embeddings yet (all still pending)
//   - Query embedding fails
//
// The client should handle empty results gracefully —
// show "nothing found" not an error state.

export const searchContent = wrapAsync(async (req, res) => {
  const query = req.query.q as string;
  const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);

  if (!query || query.trim().length === 0) {
    throw ApiErrorFactory.createError(
      "BAD_REQUEST",
      "Query parameter q is required",
    );
  }

  if (query.trim().length < 2) {
    throw ApiErrorFactory.createError(
      "BAD_REQUEST",
      "Query too short — minimum 2 characters",
    );
  }

  let queryVector: number[];

  try {
    queryVector = await generateQueryEmbedding(query.trim());
  } catch (err: any) {
    // Embedding API is down — fall back to empty results rather than 500
    console.error(
      `[search] Embedding failed for query="${query}": ${err.message}`,
    );
    return res.status(200).json(
      ApiResponse.success("Search completed", {
        results: [],
        query,
        fallback: true, // tells the client why results might be empty
      }),
    );
  }

  const results = await contentRepo.searchSimilar(
    req.userId!,
    queryVector,
    limit,
  );

  res.status(200).json(
    ApiResponse.success("Search completed", {
      results,
      query,
      count: results.length,
    }),
  );
});
