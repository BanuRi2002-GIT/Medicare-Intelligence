
import { Router } from "express";

import {
  register,
  login,
  getMe,
} from "./auth.controller";

import { authenticate } from "../../middlewares/auth.middleware";

const router = Router();

// Public routes
router.post("/register", register);
router.post("/login", login);

// Protected route
router.get("/me", authenticate, getMe);

export default router;
