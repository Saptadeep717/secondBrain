import { TagModel } from "../models";

export class TagRepository {
  async findOrCreateTags(tagNames: string[]) {
    const tagDocs = await Promise.all(
      tagNames.map(async (name) => {
        let tag = await TagModel.findOne({ name });
        if (!tag) tag = await TagModel.create({ name });
        return tag._id;
      })
    );
    return tagDocs;
  }
}
