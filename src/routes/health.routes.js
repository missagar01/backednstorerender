import { Router } from "express";
import { supabaseHealth, oracleHealth } from "../controllers/health.controller.js";

const router = Router();

router.get("/supabase", supabaseHealth);
router.get("/oracle", oracleHealth);

export default router;



