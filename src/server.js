import app from "./app.js";
import { initPool } from "./config/db.js";

const port = process.env.PORT || 3004;

app.listen(port, () => {
  console.log(`🚀 Server running at http://localhost:${port}`);
  // Try to initialize the Oracle pool, but don't crash app if unavailable.
  initPool()
    .then(() => {
      // pool started (or already initialized)
    })
    .catch((err) => {
      console.warn("⚠️ Oracle pool not ready at startup:", err?.message || err);
    });
});

