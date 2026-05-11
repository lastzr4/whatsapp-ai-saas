import jwt from "jsonwebtoken";
import db from "../db/database.js";

export function adminMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(decoded.userId);
    if (!user) return res.status(401).json({ error: "User not found" });
    if (!user.is_admin) return res.status(403).json({ error: "Admin access required" });
    req.userId = decoded.userId;
    req.adminUser = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}
