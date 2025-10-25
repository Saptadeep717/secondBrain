import { ContentModel } from "../models";

export class ContentRepository {
  async createContent(
    userId: string,
    title: string,
    link: string,
    tags: string[]
  ) {
    return ContentModel.create({ userId, title, link, tags });
  }

  async getContentsByUser(userId: string) {
    return ContentModel.find({ userId })
      .populate("userId", "username")
      .populate("tags", "name");
  }

  async deleteContent(userId: string, contentId: string) {
    return ContentModel.deleteOne({ _id: contentId, userId });
  }
}
