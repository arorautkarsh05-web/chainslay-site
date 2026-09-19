import express from "express";
import cors from "cors";
import dotenv from "dotenv";
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
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test DB Connection
verifyConnection();

// Routes
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
