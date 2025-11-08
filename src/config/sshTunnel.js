let serverRef = null;

export async function initOracleSshTunnel() {
  if (serverRef) return serverRef; // already started

  const enabled = /^true$/i.test(process.env.ORACLE_SSH_TUNNEL_ENABLED || "");
  if (!enabled) return null;

  // Lazy-load the dependency only if enabled so local dev won't crash
  let tunnel;
  try {
    ({ default: tunnel } = await import("tunnel-ssh"));
  } catch (e) {
    throw new Error(
      "tunnel-ssh is not installed. Run 'npm install tunnel-ssh' or disable ORACLE_SSH_TUNNEL_ENABLED"
    );
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

  serverRef = await new Promise((resolve, reject) => {
    const srv = tunnel(config, (error, _server) => {
      if (error) return reject(error);
      resolve(srv);
    });
  });

  return serverRef;
}

export function getTunnelLocalPort() {
  if (!serverRef) return null;
  return parseInt(process.env.ORACLE_TUNNEL_LOCAL_PORT || "15210", 10);
}

export default initOracleSshTunnel;
