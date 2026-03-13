import { config } from "dotenv";
import mongoose from "mongoose";

config({ path: "../.env" });

export async function connectMongo() {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ Mongo connection error:", error);
    process.exit(1);
  }
}