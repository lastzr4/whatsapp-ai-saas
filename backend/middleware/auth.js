import jwt from "jsonwebtoken";
import db from "../db/database.js";

export function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;

    // If token has sessionToken, validate it exists in DB (session isolation)
    if (decoded.sessionToken) {
      const session = db.prepare(
        "SELECT id FROM login_sessions WHERE session_token = ? AND user_id = ?"
      ).get(decoded.sessionToken, decoded.userId);

      if (!session) {
        return res.status(401).json({ error: "Session tamat. Sila log masuk semula." });
      }

      // Update last active
      db.prepare("UPDATE login_sessions SET last_active = datetime('now') WHERE id = ?").run(session.id);
    }

    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
