import { UserModel } from "../models";

const MAX_REFRESH_TOKENS = 5;

export class UserRepository {
  async findByUsername(username: string) {
    return UserModel.findOne({ username });
  }

  async findById(id: string) {
    return UserModel.findById(id);
  }

  async createUser(username: string, hashedPassword: string) {
    return UserModel.create({ username, password: hashedPassword });
  }

  // Stores a hashed refresh token for this user.
  // Evicts the oldest token if the user already has MAX_REFRESH_TOKENS stored
  // — this naturally handles "too many devices" without extra logic.
  async addRefreshToken(userId: string, tokenHash: string) {
    const user = await UserModel.findById(userId);
    if (!user) return;

    user.refreshTokens.push({ tokenHash, createdAt: new Date() });

    if (user.refreshTokens.length > MAX_REFRESH_TOKENS) {
      // splice mutates in place — Mongoose tracks this change.
      // slice() would return a new array and Mongoose would miss it.
      user.refreshTokens.splice(
        0,
        user.refreshTokens.length - MAX_REFRESH_TOKENS,
      );
    }

    await user.save();
  }

  // Removes a specific token hash — called on rotation and logout.
  async removeRefreshToken(userId: string, tokenHash: string) {
    return UserModel.updateOne(
      { _id: userId },
      { $pull: { refreshTokens: { tokenHash } } },
    );
  }

  // Removes ALL refresh tokens for a user — full logout from all devices.
  async removeAllRefreshTokens(userId: string) {
    return UserModel.updateOne(
      { _id: userId },
      { $set: { refreshTokens: [] } },
    );
  }
}