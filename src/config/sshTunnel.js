let serverRef = null;
let createTunnelFn = null;
let listening = false;

export async function initOracleSshTunnel() {
  if (serverRef) return serverRef; // already started

  const enabled = /^true$/i.test(process.env.ORACLE_SSH_TUNNEL_ENABLED || "");
  if (!enabled) return null;

  // Lazy-load the dependency only if enabled so local dev won't crash
  let tunnelModule;
  try {
    tunnelModule = await import("tunnel-ssh");
  } catch (e) {
    throw new Error(
      "tunnel-ssh is not installed. Run 'npm install tunnel-ssh' or disable ORACLE_SSH_TUNNEL_ENABLED"
    );
  }

  // Support different export shapes across versions (CJS/ESM)
  const cand = [
    tunnelModule?.default?.createTunnel,
    tunnelModule?.createTunnel,
    tunnelModule?.default,
    tunnelModule,
  ].filter(Boolean);
  createTunnelFn = cand.find((c) => typeof c === "function");
  if (!createTunnelFn) {
    throw new Error("Failed to load tunnel-ssh: no callable export found (createTunnel or default function)");
  }

  const sshHost = process.env.ORACLE_SSH_HOST;
  const sshPort = parseInt(process.env.ORACLE_SSH_PORT || "22", 10);
  const sshUser = process.env.ORACLE_SSH_USERNAME;
  const sshPassword = process.env.ORACLE_SSH_PASSWORD;
  const sshPrivateKey = process.env.ORACLE_SSH_PRIVATE_KEY
    ? Buffer.from(process.env.ORACLE_SSH_PRIVATE_KEY, "base64")
    : undefined;

  const localPort = parseInt(process.env.ORACLE_TUNNEL_LOCAL_PORT || "15210", 10);
  const dstHost = process.env.ORACLE_TUNNEL_DST_HOST || "localhost";
  const dstPort = parseInt(process.env.ORACLE_TUNNEL_DST_PORT || "1521", 10);

  if (!sshHost || !sshUser || (!sshPassword && !sshPrivateKey)) {
    throw new Error("SSH tunnel enabled but missing ORACLE_SSH_* credentials");
  }

  const config = {
    username: sshUser,
    host: sshHost,
    port: sshPort,
    password: sshPassword,
    privateKey: sshPrivateKey,
    // Local listener
    localHost: "127.0.0.1",
    localPort,
    // Remote Oracle destination
    dstHost,
    dstPort,
    keepAlive: true,
  };

  const debug = /^true$/i.test(process.env.ORACLE_SSH_DEBUG || "");
  if (debug) {
    console.log("[SSH] Starting tunnel:", {
      host: sshHost,
      port: sshPort,
      user: sshUser,
      localPort,
      dst: `${dstHost}:${dstPort}`,
    });
  }

  serverRef = await new Promise((resolve, reject) => {
    try {
      const srv = createTunnelFn(config, (error, _server) => {
        if (error) return reject(error);
        resolve(srv);
      });
      // Some versions return an EventEmitter-like server immediately
      if (srv && typeof srv.on === "function") {
        srv.on("error", (err) => {
          if (debug) console.warn("[SSH] tunnel error:", err?.message || err);
        });
        srv.on("listening", () => {
          listening = true;
          if (debug) console.log("[SSH] tunnel listening on 127.0.0.1:", localPort);
        });
      }
    } catch (err) {
      return reject(err);
    }
  });

  return serverRef;
}

export function isTunnelListening() {
  return !!listening;
}

export function getTunnelLocalPort() {
  if (!serverRef) return null;
  return parseInt(process.env.ORACLE_TUNNEL_LOCAL_PORT || "15210", 10);
}

export default initOracleSshTunnel;
