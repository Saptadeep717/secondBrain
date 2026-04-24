import { LinkRepository } from "../db/repository/link.repo";
import { ContentRepository } from "../db/repository/content.repo";
import randomId from "../utils/randomHashGenerator";
import ApiResponse from "../utils/ApiResponse";
import { wrapAsync } from "../utils/AsyncHandler";
import { ApiErrorFactory } from "../utils/ApiError";

const linkRepo = new LinkRepository();
const contentRepo = new ContentRepository();

export const toggleShare = wrapAsync(async (req, res) => {
  const { share } = req.body;
  if (share === undefined) {
    throw ApiErrorFactory.createError("BAD_REQUEST", "Missing share parameter");
  }
  if (typeof share !== "boolean") {
    throw ApiErrorFactory.createError("BAD_REQUEST", "Share must be boolean");
  }
  if (share) {
    const existing = await linkRepo.findByUserId(req.userId!);
    if (existing)
      return res
        .status(200)
        .json(
          ApiResponse.success("Share link exists", { hash: existing.hash }),
        );

    const hash = randomId(10);
    await linkRepo.createLink(req.userId!, hash);
    return res
      .status(200)
      .json(ApiResponse.success("Share link created", { hash }));
  } else {
    await linkRepo.deleteByUserId(req.userId!);
    res.status(200).json(ApiResponse.success("Share link removed"));
  }
});

export const getSharedBrain = wrapAsync(async (req, res) => {
  const shareLink = req.params.shareLink;
  if (!shareLink)
    throw ApiErrorFactory.createError("BAD_REQUEST", "Missing share link");

  const link = await linkRepo.findByHash(shareLink);
  if (!link)
    throw ApiErrorFactory.createError("NOT_FOUND", "Invalid share link");

  const contents = await contentRepo.getPublicContentsByUser(
    link.userId.toString(),
  );
  res.status(200).json(ApiResponse.success("Contents fetched", contents));
});