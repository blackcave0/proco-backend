
const express = require("express");
const router = express.Router();

let notificationSubscribers = [];

// Subscribe to notifications (Server-Sent Events)
router.get("/subscribe", (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  res.write(`data: ${JSON.stringify({ type: "CONNECTED" })}\n\n`);

  const clientId = Date.now();
  const newClient = { id: clientId, res };
  notificationSubscribers.push(newClient);

  req.on("close", () => {
    notificationSubscribers = notificationSubscribers.filter(
      (client) => client.id !== clientId
    );
  });
});

// Function to send notifications to all subscribers
function notifySubscribers(notification) {
  notificationSubscribers.forEach((client) => {
    try {
      client.res.write(`data: ${JSON.stringify(notification)}\n\n`);
    } catch (error) {
      console.error("Error sending notification to client:", error);
    }
  });
}

module.exports = router;