import { Schema, model } from "mongoose";

const userSchema = new Schema({
  username: { type: String, unique: true },
  password: { type: String },
});

export const UserModel = model("User", userSchema);
