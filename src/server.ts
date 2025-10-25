import express from "express";
import { db } from "./db/dbConnection";
import routes from "./routes"; 
import errorHandler from "./middlewares/errorHandler";

const app = express();
app.use(express.json());

// Register all routes under /api/v1
app.use(routes);

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
// Connect to DB and start server
const startServer = async () => {
  await db.connect(process.env.MONGO_URI || "mongodb://localhost:27017/brainly");
  app.listen(PORT, () => console.log("🚀 Server running on port 3000"));
};

startServer();
