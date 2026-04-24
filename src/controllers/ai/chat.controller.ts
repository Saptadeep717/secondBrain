import { Request, Response } from "express";
import { ContentRepository } from "../../db/repository/content.repo";
import { generateQueryEmbedding } from "../../services/ai/embeddings.service";
import { streamWithFallback } from "../../services/ai/llm.provider";
import { ApiErrorFactory } from "../../utils/ApiError";
import { wrapAsync } from "../../utils/AsyncHandler";

const contentRepo = new ContentRepository();

export const chatWithBrain = wrapAsync(async (req: Request, res: Response) => {
  const { message } = req.body;

  if (!message || message.trim().length === 0) {
    throw ApiErrorFactory.createError("BAD_REQUEST", "message is required");
  }

  // ── Step 1: Embed the user's message ──────────────────────────────────────
  let queryVector: number[];
  try {
    queryVector = await generateQueryEmbedding(message.trim());
  } catch (err: any) {
    throw ApiErrorFactory.createError(
      "INTERNAL_SERVER_ERROR",
      "Failed to process your question — please try again",
    );
  }

  // ── Step 2: Retrieve top-3 semantically similar saved items ───────────────
  // topK=3 keeps answers focused — more sources = more noise in the response
  const relevantItems = await contentRepo.searchSimilar(
    req.userId!,
    queryVector,
    3,
  );

  // ── Step 3: Build system prompt ───────────────────────────────────────────

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  let systemPrompt: string;

  if (relevantItems.length > 0) {
    const contextBlock = relevantItems
      .map((item: any, i: number) => {
        const tags = item.tags?.map((t: any) => t.name).join(", ") || "none";
        const savedOn = item.createdAt
          ? new Date(item.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })
          : "unknown date";

        return [
          `[Source ${i + 1}]`,
          `Title: ${item.title}`,
          `URL: ${item.link}`,
          `Tags: ${tags}`,
          `Saved: ${savedOn}`,
          `Summary: ${item.summary || "No summary available"}`,
        ].join("\n");
      })
      .join("\n\n---\n\n");

    systemPrompt = `You are a personal knowledge assistant for a second brain app. Today is ${today}.

The user has saved the following content that is relevant to their question:

${contextBlock}

INSTRUCTIONS:
- Answer using ONLY the sources above — never fabricate information
- Be conversational but precise — this is a personal knowledge tool, not a search engine
- If a source directly answers the question, quote or paraphrase it specifically
- If multiple sources are relevant, synthesise them into a coherent answer
- Always cite which source you're drawing from using its title
- If the sources only partially answer the question, say what you found AND what's missing
- Keep the answer focused — 2-4 paragraphs max unless the question requires more detail
- End with a one-line actionable takeaway if relevant

TONE: Direct, helpful, like a knowledgeable friend reviewing your notes with you.`;
  } else {
    systemPrompt = `You are a personal knowledge assistant for a second brain app. Today is ${today}.

The user asked: "${message}"

No relevant saved content was found for this question.

INSTRUCTIONS:
- Tell the user clearly that you couldn't find relevant content in their brain
- Be specific about what topic you searched for
- Suggest 2-3 specific articles, videos, or resources they could save to answer this question in future
- Keep it brief — 3-4 sentences max
- Don't answer the question from general knowledge — your job is to reflect their saved knowledge back to them

TONE: Friendly, encouraging — finding gaps in your brain is a feature, not a failure.`;
  }

  // ── Step 4: Stream the response ───────────────────────────────────────────
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  try {
    for await (const chunk of streamWithFallback(systemPrompt, message)) {
      res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
    }

    res.write(
      `data: ${JSON.stringify({
        done: true,
        sources: relevantItems.map((item: any) => ({
          title: item.title,
          link: item.link,
          summary: item.summary,
        })),
      })}\n\n`,
    );

    res.end();
  } catch (err: any) {
    res.write(
      `data: ${JSON.stringify({
        error: "Generation failed — please try again",
      })}\n\n`,
    );
    res.end();
  }
});
