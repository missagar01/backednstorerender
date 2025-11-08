// src/config/db.js
import dotenv from "dotenv";
import oracledb from "./oracleClient.js";
import { initOracleClient } from "./oracleClient.js";
import { initOracleSshTunnel, getTunnelLocalPort } from "./sshTunnel.js";

dotenv.config();

let pool = null;

export async function initPool() {
  if (pool) return pool;

  initOracleClient();

  let connectString = process.env.ORACLE_CONNECTION_STRING;
  const connectTimeout = parseInt(process.env.ORACLE_CONNECT_TIMEOUT || "10", 10);

  // Optional SSH tunnel: rewrite connect string to use local forwarded port.
  try {
    const tunnel = await initOracleSshTunnel();
    if (tunnel) {
      const localPort = getTunnelLocalPort();
      // Only handle simple host:port/service format for rewrite
      const m = /^(?<host>[^:]+):(?<port>\d+)(?<rest>.*)$/.exec(connectString || "");
      if (m) {
        const rest = m.groups.rest || ""; // includes /serviceName or descriptor tail
        connectString = `127.0.0.1:${localPort}${rest}`;
        console.log(`🔐 Oracle SSH tunnel active → ${connectString}`);
      } else {
        console.warn("SSH tunnel enabled but ORACLE_CONNECTION_STRING not in host:port/... format; using as-is");
      }
    }
  } catch (e) {
    console.warn("⚠️ Failed to start SSH tunnel:", e?.message || e);
  }

  pool = await oracledb.createPool({
    user: process.env.ORACLE_USER,
    password: process.env.ORACLE_PASSWORD,
    connectString,
    poolMin: 1,
    poolMax: 10,
    poolIncrement: 1,
    connectTimeout,
    queueTimeout: 10000,
    stmtCacheSize: 0,
  });

  console.log("✅ Oracle pool started");
  return pool;
}

export async function getConnection() {
  if (!pool) {
    await initPool();
  }
  return pool.getConnection();
}
