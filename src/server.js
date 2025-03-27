
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const net = require("net");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());

// MongoDB connection
let isMongoConnected = false;
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/proco", {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000,
    socketTimeoutMS: 5000,
  })
  .then(() => {
    console.log("MongoDB connected successfully");
    isMongoConnected = true;
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
    console.log("Running in demo mode with in-memory storage");
  });

// Import API routes
app.use("/api/projects", require("./api/projects"));
app.use("/api/inquiries", require("./api/inquiries"));
app.use("/api/courses", require("./api/courses"));
app.use("/api/notifications", require("./api/notifications"));
app.use("/api/health", require("./api/health"));

// Function to check if a port is in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net
      .createServer()
      .once("error", () => resolve(true))
      .once("listening", () => {
        server.close();
        resolve(false);
      })
      .listen(port);
  });
}

// Find an available port and start the server
async function startServer() {
  let currentPort = PORT;
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const inUse = await isPortInUse(currentPort);

    if (!inUse) {
      app.listen(currentPort, () => {
        console.log(`Server running on port ${currentPort}`);
      });
      return;
    }

    console.log(`Port ${currentPort} is in use, trying ${currentPort + 1}`);
    currentPort++;
    attempts++;
  }

  console.error(`Could not find an available port after ${maxAttempts} attempts.`);
  process.exit(1);
}

// Start the server
startServer();