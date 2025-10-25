import { UserModel } from "../models";

export class UserRepository {
  async findByUsername(username: string) {
    return UserModel.findOne({ username });
  }

  async createUser(username: string, hashedPassword: string) {
    return UserModel.create({ username, password: hashedPassword });
  }
}
