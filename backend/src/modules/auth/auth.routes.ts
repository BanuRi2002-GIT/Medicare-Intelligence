import { Router } from "express";
import { register, login } from "./auth.controller";

const router = Router();

console.log("Register handler:", typeof register);
console.log("Login handler:", typeof login);

router.post("/register", register);
router.post("/login", login);

export default router;