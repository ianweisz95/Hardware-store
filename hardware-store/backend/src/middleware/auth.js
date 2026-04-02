import jwt from "jsonwebtoken";
import User from "../models/User.js";
import logger from "../utils/logger.js";

// ─── Authenticate ─────────────────────────────────────────────────────────────
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication required" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password -refreshToken");
    if (!user) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    if (!user.isActive) {
      return res.status(403).json({ success: false, message: "Account deactivated" });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({ success: false, message: "Token expired", code: "TOKEN_EXPIRED" });
    }
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({ success: false, message: "Invalid token" });
    }
    logger.error("Auth middleware error:", error);
    res.status(500).json({ success: false, message: "Authentication error" });
  }
};

// ─── Authorize Roles ─────────────────────────────────────────────────────────
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required roles: ${roles.join(", ")}`,
      });
    }
    next();
  };
};

// ─── Check Permission ─────────────────────────────────────────────────────────
export const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user.hasPermission(permission)) {
      return res.status(403).json({
        success: false,
        message: `Permission denied: ${permission}`,
      });
    }
    next();
  };
};

// ─── Branch Access ────────────────────────────────────────────────────────────
export const branchAccess = (req, res, next) => {
  // Admins can access all branches
  if (req.user.role === "admin") return next();

  // Others must specify their branch
  const requestedBranch = req.params.branchId || req.body.branch || req.query.branch;
  if (requestedBranch && req.user.branch) {
    if (req.user.branch.toString() !== requestedBranch.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access to this branch is not permitted",
      });
    }
  }
  next();
};

// ─── Optional Auth ─────────────────────────────────────────────────────────────
export const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password -refreshToken");
    }
    next();
  } catch {
    next(); // Silently fail for optional auth
  }
};
