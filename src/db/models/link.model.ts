import { Schema, model } from "mongoose";

const linkSchema = new Schema({
  hash: { type: String, required: true },
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: true,
    unique: true,
  },
});

export const LinkModel = model("Link", linkSchema);
