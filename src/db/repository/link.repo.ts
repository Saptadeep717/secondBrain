import { LinkModel } from "../models";

export class LinkRepository {
  async findByUserId(userId: string) {
    return LinkModel.findOne({ userId });
  }

  async createLink(userId: string, hash: string) {
    return LinkModel.create({ userId, hash });
  }

  async deleteByUserId(userId: string) {
    return LinkModel.deleteOne({ userId });
  }

  async findByHash(hash: string) {
    return LinkModel.findOne({ hash });
  }
}
