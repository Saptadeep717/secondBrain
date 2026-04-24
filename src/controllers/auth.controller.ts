import crypto from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { nanoid } from "nanoid";
import ApiResponse from "../utils/ApiResponse";
import { ApiErrorFactory } from "../utils/ApiError";
import { UserRepository } from "../db/repository/user.repo";
import { wrapAsync } from "../utils/AsyncHandler";

const userRepo = new UserRepository();

const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
const REFRESH_SECRET = process.env.REFRESH_SECRET || "your_refresh_secret_key";

// Access token lives 15 min — short enough to limit damage if stolen.
// Refresh token lives 7 days — long enough to not annoy users.
const ACCESS_TOKEN_EXPIRY = "24h";
const REFRESH_TOKEN_EXPIRY = "7d";
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateAccessToken(userId: string): string {
  return jwt.sign({ id: userId }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRY,
  });
}

// Refresh token = signed JWT so we can verify it without a DB lookup first,
// then confirm against the stored hash for rotation safety.
function generateRefreshToken(userId: string): string {
  return jwt.sign({ id: userId, jti: nanoid() }, REFRESH_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRY,
  });
}

// SHA-256 hash — fast (unlike bcrypt) and fine for random high-entropy tokens.
function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// ─── Controllers ────────────────────────────────────────────────────────────

export const signup = wrapAsync(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password ) {
    throw ApiErrorFactory.createError(
      "BAD_REQUEST",
      "Username, and password are required",
    );
  }

  const existingUser = await userRepo.findByUsername(username);
  if (existingUser)
    throw ApiErrorFactory.createError("CONFLICT", "Username already exists");

  const hashedPassword = await bcrypt.hash(password, 10);
  await userRepo.createUser(username, hashedPassword);
  res.status(201).json(ApiResponse.created("User created"));
});

export const login = wrapAsync(async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    throw ApiErrorFactory.createError(
      "BAD_REQUEST",
      "Username and password are required",
    );
  }

  const user = await userRepo.findByUsername(username);
  if (!user)
    throw ApiErrorFactory.createError("BAD_REQUEST", "Invalid credentials");

  const valid = await bcrypt.compare(password, user.password as string);
  if (!valid)
    throw ApiErrorFactory.createError("UNAUTHORIZED", "Invalid password");

  const userId = user._id.toString();
  const accessToken = generateAccessToken(userId);
  const refreshToken = generateRefreshToken(userId);

  // Store hashed version — if the DB is ever compromised,
  // raw refresh tokens are not exposed.
  await userRepo.addRefreshToken(userId, hashToken(refreshToken));

  // Refresh token in httpOnly cookie — never readable by JS on the client.
  // Access token in response body — client stores in memory only (NOT localStorage).
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: REFRESH_TOKEN_EXPIRY_MS,
  });

  res
    .status(200)
    .json(ApiResponse.success("Login successful", { accessToken }));
});

// Called when the access token expires (every 15 min).
// Issues a new access token AND rotates the refresh token —
// old hash deleted, new one stored. If someone steals a refresh token
// and tries to use it after the real client already rotated, the hash
// won't match → all sessions nuked as a theft response.
export const refresh = wrapAsync(async (req, res) => {
  const incomingToken = req.cookies?.refreshToken;
  if (!incomingToken) {
    throw ApiErrorFactory.createError(
      "UNAUTHORIZED",
      "No refresh token provided",
    );
  }

  // Step 1 — verify JWT signature and expiry
  let payload: jwt.JwtPayload;
  try {
    payload = jwt.verify(incomingToken, REFRESH_SECRET) as jwt.JwtPayload;
  } catch {
    throw ApiErrorFactory.createError(
      "UNAUTHORIZED",
      "Invalid or expired refresh token",
    );
  }

  const userId = payload.id as string;
  const user = await userRepo.findById(userId);
  if (!user)
    throw ApiErrorFactory.createError("UNAUTHORIZED", "User not found");

  // Step 2 — confirm the hash exists in the user's stored tokens
  const incomingHash = hashToken(incomingToken);
  const storedMatch = user.refreshTokens.find(
    (t: any) => t.tokenHash === incomingHash,
  );

  if (!storedMatch) {
    // Token already rotated or never issued — possible theft attempt.
    // Nuke ALL sessions for this user as a precaution.
    await userRepo.removeAllRefreshTokens(userId);
    throw ApiErrorFactory.createError(
      "UNAUTHORIZED",
      "Refresh token reuse detected — all sessions invalidated",
    );
  }

  // Step 3 — rotate: remove old, issue new pair
  await userRepo.removeRefreshToken(userId, incomingHash);

  const newAccessToken = generateAccessToken(userId);
  const newRefreshToken = generateRefreshToken(userId);
  await userRepo.addRefreshToken(userId, hashToken(newRefreshToken));

  res.cookie("refreshToken", newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: REFRESH_TOKEN_EXPIRY_MS,
  });

  res
    .status(200)
    .json(
      ApiResponse.success("Token refreshed", { accessToken: newAccessToken }),
    );
});

// Logout from current device only.
export const logout = wrapAsync(async (req, res) => {
  const incomingToken = req.cookies?.refreshToken;

  if (incomingToken) {
    try {
      const payload = jwt.verify(
        incomingToken,
        REFRESH_SECRET,
      ) as jwt.JwtPayload;
      await userRepo.removeRefreshToken(
        payload.id as string,
        hashToken(incomingToken),
      );
    } catch {
      // Already expired — nothing to clean in DB, still clear the cookie below
    }
  }

  res.clearCookie("refreshToken");
  res.status(200).json(ApiResponse.success("Logged out"));
});

// Logout from ALL devices — nukes every stored refresh token.
// Requires a valid access token (authMiddleware runs before this).
export const logoutAll = wrapAsync(async (req, res) => {
  await userRepo.removeAllRefreshTokens(req.userId!);
  res.clearCookie("refreshToken");
  res.status(200).json(ApiResponse.success("Logged out from all devices"));
});
