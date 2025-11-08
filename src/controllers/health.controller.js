import { supabase, isSupabaseConfigured } from "../config/supabaseClient.js";
import { getConnection } from "../config/db.js";

export async function supabaseHealth(req, res) {
  try {
    if (!isSupabaseConfigured()) {
      return res.status(400).json({
        ok: false,
        error: "Supabase not configured",
      });
    }
    const usersTable = process.env.SUPABASE_USERS_TABLE;
    if (!usersTable) {
      return res.status(400).json({
        ok: false,
        error: "SUPABASE_USERS_TABLE not configured",
      });
    }

    const { error, count } = await supabase
      .from(usersTable)
      .select("*", { count: "exact", head: true });

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.json({ ok: true, table: usersTable, count: count ?? 0 });
  } catch (err) {
    return res.status(500).json({ ok: false, error: err.message });
  }
}

export async function oracleHealth(_req, res) {
  let conn;
  try {
    conn = await getConnection();
    const result = await conn.execute("SELECT 1 AS ok FROM dual");
    const ok = Array.isArray(result?.rows) && result.rows.length > 0;
    return res.json({ ok, engine: "oracle" });
  } catch (err) {
    return res.status(503).json({ ok: false, engine: "oracle", error: err.message });
  } finally {
    try { if (conn) await conn.close(); } catch (_) {}
  }
}



