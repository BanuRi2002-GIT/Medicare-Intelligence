
import type { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import type { AuthenticatedRequest } from "./auth.types";

interface TokenPayload extends jwt.JwtPayload {
  roles: string[];
}

// ==========================================
// 1. AUTHENTICATION MIDDLEWARE
// ==========================================

export function authenticate(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication token is required",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured");

      return res.status(500).json({
        success: false,
        message: "Authentication configuration error",
      });
    }

    const decoded = jwt.verify(token, jwtSecret);

    if (
      typeof decoded === "string" ||
      typeof decoded.sub !== "string" ||
      !/^[1-9]\d*$/.test(decoded.sub) ||
      !Array.isArray(decoded.roles) ||
      !decoded.roles.every((role) => typeof role === "string")
    ) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    const payload = decoded as TokenPayload;

    req.user = {
      id: Number(payload.sub),
      roles: payload.roles,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: "Authentication token has expired",
      });
    }

    return res.status(401).json({
      success: false,
      message: "Invalid authentication token",
    });
  }
}

// ==========================================
// 2. ROLE-BASED AUTHORIZATION MIDDLEWARE
// ==========================================

export function authorize(...allowedRoles: string[]) {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const hasPermission = req.user.roles.some((role) =>
      allowedRoles.includes(role)
    );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
      });
    }

    next();
  };
}
