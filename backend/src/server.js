// import "dotenv/config";
// import express from "express";
// import cors from "cors";
// import rateLimit from "express-rate-limit";
// import connectDB from "./config/db.js";
// import authRoutes from "./routes/auth.js";

// const app = express();

// // ── Connect MongoDB ───────────────────────────────────────────────────────────
// connectDB();

// // ── CORS ──────────────────────────────────────────────────────────────────────
// const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
//   .split(",")
//   .map((o) => o.trim());

// app.use(
//   cors({
//     origin: (origin, cb) => {
//       if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
//       cb(new Error(`CORS: origin ${origin} not allowed`));
//     },
//     credentials: true,
//   })
// );

// // ── Body parsing ──────────────────────────────────────────────────────────────
// app.use(express.json({ limit: "10kb" }));
// app.use(express.urlencoded({ extended: true }));

// // ── Global rate limit ─────────────────────────────────────────────────────────
// app.use(
//   rateLimit({
//     windowMs: 15 * 60 * 1000,
//     max: 100,
//     message: { success: false, message: "Too many requests from this IP" },
//   })
// );

// // ── Routes ────────────────────────────────────────────────────────────────────
// app.use("/api/auth", authRoutes);

// // ── Health check ──────────────────────────────────────────────────────────────
// app.get("/api/health", (_, res) =>
//   res.json({ success: true, status: "ok", timestamp: new Date().toISOString() })
// );

// // ── 404 handler ───────────────────────────────────────────────────────────────
// app.use((req, res) =>
//   res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` })
// );

// // ── Global error handler ──────────────────────────────────────────────────────
// app.use((err, req, res, next) => {
//   console.error("Unhandled error:", err);
//   res.status(err.status || 500).json({
//     success: false,
//     message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
//   });
// });



// // ── Start ─────────────────────────────────────────────────────────────────────
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 Server running on http://localhost:${PORT}`);
//   console.log(`   ENV: ${process.env.NODE_ENV || "development"}`);
// });


import "dotenv/config";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";

const app = express();

connectDB();

const allowedOrigins = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((o) => o.trim());

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: { success: false, message: "Too many requests from this IP" },
  })
);

app.use("/api/auth", authRoutes);
app.use("/api", dashboardRoutes);

app.get("/api/health", (_, res) =>
  res.json({ success: true, status: "ok", timestamp: new Date().toISOString() })
);

app.use((req, res) =>
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` })
);

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === "production" ? "Internal server error" : err.message,
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`   ENV: ${process.env.NODE_ENV || "development"}`);
});