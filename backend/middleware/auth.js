import jwt from "jsonwebtoken";
import db from "../db/database.js";

export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;

    // Session isolation — only validate if token contains a sessionToken
    if (decoded.sessionToken) {
      try {
        const session = db.prepare(
          "SELECT id FROM login_sessions WHERE session_token = ? AND user_id = ?"
        ).get(decoded.sessionToken, decoded.userId);

        if (!session) {
          // Session deleted (logout from another tab, admin force logout, or volume reset)
          return res.status(401).json({
            error: "Sesi tamat. Sila log masuk semula.",
            code: "SESSION_EXPIRED"
          });
        }

        // Update last active timestamp
        db.prepare(
          "UPDATE login_sessions SET last_active = datetime('now') WHERE id = ?"
        ).run(session.id);
      } catch (dbErr) {
        // login_sessions table may not exist yet (old DB) — allow through
        console.warn("Session check skipped:", dbErr.message);
      }
    }

    next();
  } catch {
    res.status(401).json({ error: "Token tidak sah" });
  }
}
