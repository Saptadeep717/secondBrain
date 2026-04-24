import { Schema, model } from "mongoose";

const userSchema = new Schema(
  {
    username: { type: String, unique: true, required: true },
    password: { type: String, required: true },

    // Each device/session gets its own refresh token (hashed).
    // Capped at 5 — oldest gets evicted when a 6th device logs in.
    // Storing a SHA-256 hash so raw tokens never sit in the DB.
    refreshTokens: {
      type: [
        {
          tokenHash: { type: String, required: true },
          createdAt: { type: Date, default: Date.now },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export const UserModel = model("User", userSchema);