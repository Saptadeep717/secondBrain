import { ContentRepository } from "../db/repository/content.repo";
import { TagRepository } from "../db/repository/tag.repo";
import { ApiErrorFactory } from "../utils/ApiError";
import ApiResponse from "../utils/ApiResponse";
import { wrapAsync } from "../utils/AsyncHandler";

const contentRepo = new ContentRepository();
const tagRepo = new TagRepository();

export const createContent = wrapAsync(async (req, res) => {
  const { link, title, tags } = req.body;
  if (!title || !link || !tags) {
    throw ApiErrorFactory.createError(
      "BAD_REQUEST",
      "Title, link, and tags are all required"
    );
  }
  const tagDocs = await tagRepo.findOrCreateTags(tags);
  const tagIds = tagDocs.map((t: any) => t.toString());
  await contentRepo.createContent(req.userId!, title, link, tagIds);
  res.status(201).json(ApiResponse.created("Content created"));
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
  res.status(204).json(ApiResponse.success("Content deleted"));
});
