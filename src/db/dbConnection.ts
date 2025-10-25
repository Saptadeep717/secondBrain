import mongoose from "mongoose";

class Database {
  private static instance: Database;
  private isConnected = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!this.instance) {
      this.instance = new Database();
    }
    return this.instance;
  }

  public async connect(uri: string): Promise<void> {
    if (this.isConnected) {
      console.log("MongoDB already connected.");
      return;
    }

    try {
      await mongoose.connect(uri);
      this.isConnected = true;
      console.log("MongoDB connected successfully.");
    } catch (error) {
      console.error(" MongoDB connection failed:", error);
      process.exit(1);
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) return;
    await mongoose.disconnect();
    this.isConnected = false;
    console.log("MongoDB disconnected.");
  }
}

export const db = Database.getInstance();
