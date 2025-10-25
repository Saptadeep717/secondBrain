import { Router } from "express";
import authRoutes from "./auth.routes";
import contentRoutes from "./content.routes";
import shareRoutes from "./share.routes";

const router = Router();

// Versioning: /api/v1
const apiV1 = Router();

apiV1.use(authRoutes); // /signup, /login
apiV1.use("/content", contentRoutes);
apiV1.use(shareRoutes); // /brain/share, /brain/:shareLink

router.use("/api/v1", apiV1);

export default router;
