import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET || "talentos_fallback_secret_2024";

export const signToken = (payload) =>
  jwt.sign(payload, SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

export const verifyToken = (token) =>
  jwt.verify(token, SECRET);