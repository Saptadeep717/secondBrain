import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import ApiResponse from "../utils/ApiResponse";
import { ApiErrorFactory } from "../utils/ApiError";
import { UserRepository } from "../db/repository/user.repo";
import { wrapAsync } from "../utils/AsyncHandler";

const userRepo = new UserRepository();
const JWT_SECRET = process.env.JWT_SECRET || "your_jwt_secret_key";
export const signup = wrapAsync(async (req, res) => {
  const { username, password } = req.body;
  const existingUser = await userRepo.findByUsername(username);
  if (existingUser)
    throw ApiErrorFactory.createError("CONFLICT", "Username already exists");

  const hashedPassword = await bcrypt.hash(password, 10);
  await userRepo.createUser(username, hashedPassword);
  res.status(201).json(ApiResponse.created("User created"));
});

export const login = wrapAsync(async (req, res) => {
  const { username, password } = req.body;
  const user = await userRepo.findByUsername(username);
  if (!user)
    throw ApiErrorFactory.createError("BAD_REQUEST", "Invalid credentials");

  const valid = await bcrypt.compare(password, user.password as string);
  if (!valid)
    throw ApiErrorFactory.createError("UNAUTHORIZED", "Invalid password");

  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });
  res.status(200).json(ApiResponse.success("Login successful", { token }));
});
