import { Schema, model } from "mongoose";

const contentSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  link: { type: String },
  tags: { type: [Schema.Types.ObjectId], ref: "Tag", default: [] },
});

export const ContentModel = model("Content", contentSchema);
