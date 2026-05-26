import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.SESSION_SECRET || "access-secret-fallback";
const REFRESH_SECRET = (process.env.SESSION_SECRET || "refresh-secret-fallback") + "-refresh";

export interface JwtPayload {
  userId: number;
  email: string;
}

export function signAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
}

export function signRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, REFRESH_SECRET) as JwtPayload;
}
