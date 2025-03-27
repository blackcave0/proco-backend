
const express = require("express");
const router = express.Router();

let isMongoConnected = false;
let notificationSubscribers = [];

// Health check route
router.get("/", async (req, res) => {
  try {
    const mongoStatus = isMongoConnected ? "connected" : "disconnected";

    res.status(200).json({
      status: "Server is running",
      mongodb: mongoStatus,
      mode: isMongoConnected ? "mongodb" : "demo",
      notifications: {
        subscribers: notificationSubscribers.length,
      },
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Health check failed",
      error: err.message,
    });
  }
});

module.exports = router;