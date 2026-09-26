import jwt from "jsonwebtoken";
import User from "../models/User.js";

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: JWT_SECRET environment variable is missing in production");
    }
    return "cityrock_pos_super_secret_jwt_key_2026_secure";
  }
  return secret;
};

export const authenticate = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is missing or malformed",
      });
    }

    const decoded = jwt.verify(token, getJwtSecret());
    
    // Find user by decoded ID
    const user = await User.findById(decoded.userId).lean();
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User session is invalid or user no longer exists",
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Please contact support.",
      });
    }

    req.user = user;
    req.tenantId = user.tenantId ? user.tenantId.toString() : null;
    req.storeId = user.storeId ? user.storeId.toString() : null;

    next();
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Authentication token has expired. Please sign in again.",
      });
    }
    if (error.name === "JsonWebTokenError" || error.name === "NotBeforeError") {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }
    return next(error);
  }
};

export const optionalAuthenticate = async (req, res, next) => {
  try {
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (token) {
      const decoded = jwt.verify(token, getJwtSecret());
      const user = await User.findById(decoded.userId).lean();
      if (user && user.isActive) {
        req.user = user;
        req.tenantId = user.tenantId ? user.tenantId.toString() : null;
        req.storeId = user.storeId ? user.storeId.toString() : null;
      }
    }
  } catch (_) {
    // Ignore invalid optional tokens
  }
  next();
};

export default { authenticate, optionalAuthenticate };
