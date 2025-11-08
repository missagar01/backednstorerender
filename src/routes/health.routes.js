import { Router } from "express";
import { supabaseHealth, oracleHealth, tunnelHealth } from "../controllers/health.controller.js";

const router = Router();

router.get("/supabase", supabaseHealth);
router.get("/oracle", oracleHealth);
router.get("/tunnel", tunnelHealth);

export default router;



