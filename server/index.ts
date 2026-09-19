import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { verifyConnection } from "./config/database";

import inventoryRoutes from "./routes/inventoryRoutes";
import uploadRoutes from "./routes/uploadRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import approvalRoutes from "./routes/approvalRoutes";
import blockchainRoutes from "./routes/blockchainRoutes";
import festivalRoutes from "./routes/festivalRoutes";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test DB Connection
verifyConnection();

// API Routes
app.use('/api/inventory', inventoryRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/festivals', festivalRoutes);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const isConnected = await verifyConnection();
    if (isConnected) {
      res.json({ success: true, message: 'Server is healthy and connected to MySQL' });
    } else {
      res.status(503).json({ success: false, message: 'Server is running, but MySQL connection failed' });
    }
  } catch (err) {
    res.status(503).json({ success: false, message: 'Server is running, but MySQL connection failed' });
  }
});

// Serve static frontend assets in production (Fullstack deployment on Render/Heroku)
const clientDistPath = path.resolve(process.cwd(), "dist", "public");
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));

  // SPA fallback: Return index.html for any unmatched client routes
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

