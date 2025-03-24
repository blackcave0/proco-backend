const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const http = require("http");
const net = require("net");

// Import models
const Inquiry = require("./models/Inquiry");
const Project = require("./models/Project"); // Import the Project model

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: "https://proco-eight.vercel.app", // Replace with your frontend URL
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(express.json());

// In-memory storage for demo mode when MongoDB is not available
let inMemoryInquiries = [];
let isMongoConnected = false;
let notificationSubscribers = [];
let portfolioProjects = [];

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/proco", {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
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

app.get("/api/projects", async (req, res) => {
  try {
    let projects;

    if (isMongoConnected) {
      projects = await Project.find(); // Fetch projects from MongoDB
    } else {
      projects = portfolioProjects; // Use in-memory storage for demo mode
    }

    res.status(200).json({
      success: true,
      data: projects,
    });
  } catch (err) {
    console.error("Error fetching projects:", err);
    res.status(500).json({
      success: false,
      message: "Failed to fetch projects",
      error: err.message,
    });
  }
});

// Add a new portfolio project
app.post("/api/projects", async (req, res) => {
  const { title, description, details, image, technologies, published } =
    req.body;

  // Validate required fields
  if (!title || !description || !details || !image || !technologies) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }

  const newProject = new Project({
    title,
    description,
    details,
    image,
    technologies,
    published: published || false,
  });

  try {
    const savedProject = await newProject.save(); // Save to MongoDB
    portfolioProjects.push(savedProject); // Add to in-memory storage for demo mode
    res.status(201).json({
      success: true,
      data: savedProject,
    });
  } catch (err) {
    console.error("Error saving project:", err);
    res.status(500).json({
      success: false,
      message: "Failed to save project",
      error: err.message,
    });
  }
});

// Delete a portfolio project
app.delete("/api/projects/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const deletedProject = await Project.findByIdAndDelete(id); // Use MongoDB's _id
    if (!deletedProject) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    res.status(200).json({
      success: true,
      message: "Project deleted successfully",
    });
  } catch (err) {
    console.error("Error deleting project:", err);
    res.status(500).json({
      success: false,
      message: "Failed to delete project",
      error: err.message,
    });
  }
});

// Update project publish status
app.patch("/api/projects/:id", async (req, res) => {
  const { id } = req.params;
  const { published } = req.body;

  try {
    const project = await Project.findById(id); // Fetch project from MongoDB
    if (!project) {
      return res
        .status(404)
        .json({ success: false, message: "Project not found" });
    }

    project.published = published;
    const updatedProject = await project.save(); // Save updated project to MongoDB

    res.status(200).json({
      success: true,
      data: updatedProject,
    });
  } catch (err) {
    console.error("Error updating project publish status:", err);
    res.status(500).json({
      success: false,
      message: "Failed to update project",
      error: err.message,
    });
  }
});

// Routes
app.post("/api/inquiries", async (req, res) => {
  try {
    const { name, email, phone, course, message } = req.body;

    // Validate required fields
    if (!name || !email || !phone || !course) {
      return res
        .status(400)
        .json({ error: "Please provide all required fields" });
    }

    // Create inquiry object
    const inquiryData = {
      name,
      email,
      phone,
      course,
      message,
      status: "new",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    let newInquiry;

    if (isMongoConnected) {
      try {
        // Save to MongoDB if connected
        newInquiry = new Inquiry(inquiryData);
        await newInquiry.save();

        // Convert Mongoose document to plain object for notification
        newInquiry = newInquiry.toObject();
      } catch (mongoError) {
        console.error(
          "Error saving to MongoDB, falling back to in-memory storage:",
          mongoError
        );
        isMongoConnected = false;
        newInquiry = { ...inquiryData, _id: Date.now().toString() };
        inMemoryInquiries.push(newInquiry);
      }
    } else {
      // Save to in-memory storage if MongoDB is not available
      newInquiry = { ...inquiryData, _id: Date.now().toString() };
      inMemoryInquiries.push(newInquiry);
    }

    // Send notification to all subscribers
    notifySubscribers({
      type: "NEW_INQUIRY",
      data: newInquiry,
    });

    res.status(201).json({
      success: true,
      message: "Inquiry submitted successfully",
      data: newInquiry,
      mode: isMongoConnected ? "mongodb" : "demo",
    });
  } catch (error) {
    console.error("Error saving inquiry:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Get all inquiries (for admin purposes)
app.get("/api/inquiries", async (req, res) => {
  try {
    let inquiries;

    if (isMongoConnected) {
      try {
        // Get from MongoDB if connected
        inquiries = await Inquiry.find().sort({ createdAt: -1 });

        // Convert Mongoose documents to plain objects
        inquiries = inquiries.map((doc) => doc.toObject());
      } catch (mongoError) {
        console.error(
          "Error fetching from MongoDB, falling back to in-memory storage:",
          mongoError
        );
        isMongoConnected = false;
        inquiries = inMemoryInquiries.sort(
          (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
        );
      }
    } else {
      // Get from in-memory storage if MongoDB is not available
      inquiries = inMemoryInquiries.sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    }

    res.status(200).json({
      success: true,
      count: inquiries.length,
      data: inquiries,
      mode: isMongoConnected ? "mongodb" : "demo",
    });
  } catch (error) {
    console.error("Error fetching inquiries:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Update inquiry status
app.patch("/api/inquiries/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    if (!status || !["new", "pending", "completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be one of: new, pending, completed",
      });
    }

    let updatedInquiry;

    if (isMongoConnected) {
      try {
        // Update in MongoDB if connected
        updatedInquiry = await Inquiry.findByIdAndUpdate(
          id,
          { status, updatedAt: new Date() },
          { new: true }
        );

        if (!updatedInquiry) {
          return res
            .status(404)
            .json({ success: false, message: "Inquiry not found" });
        }

        // Convert Mongoose document to plain object for notification
        updatedInquiry = updatedInquiry.toObject();
      } catch (mongoError) {
        console.error(
          "Error updating in MongoDB, falling back to in-memory storage:",
          mongoError
        );
        isMongoConnected = false;

        // Fall back to in-memory storage
        const index = inMemoryInquiries.findIndex(
          (inquiry) => inquiry._id === id
        );
        if (index === -1) {
          return res
            .status(404)
            .json({ success: false, message: "Inquiry not found" });
        }

        inMemoryInquiries[index].status = status;
        inMemoryInquiries[index].updatedAt = new Date();
        updatedInquiry = inMemoryInquiries[index];
      }
    } else {
      // Update in in-memory storage if MongoDB is not available
      const index = inMemoryInquiries.findIndex(
        (inquiry) => inquiry._id === id
      );
      if (index === -1) {
        return res
          .status(404)
          .json({ success: false, message: "Inquiry not found" });
      }

      inMemoryInquiries[index].status = status;
      inMemoryInquiries[index].updatedAt = new Date();
      updatedInquiry = inMemoryInquiries[index];
    }

    // Send notification to all subscribers
    notifySubscribers({
      type: "STATUS_UPDATED",
      data: updatedInquiry,
    });

    res.status(200).json({
      success: true,
      message: "Inquiry status updated successfully",
      data: updatedInquiry,
    });
  } catch (error) {
    console.error("Error updating inquiry status:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Delete an inquiry
app.delete("/api/inquiries/:id", async (req, res) => {
  try {
    const { id } = req.params;
    let deletedInquiry;

    if (isMongoConnected) {
      try {
        // Delete from MongoDB if connected
        deletedInquiry = await Inquiry.findByIdAndDelete(id);
        if (!deletedInquiry) {
          return res
            .status(404)
            .json({ success: false, message: "Inquiry not found" });
        }

        // Convert Mongoose document to plain object for notification
        deletedInquiry = deletedInquiry.toObject();
      } catch (mongoError) {
        console.error(
          "Error deleting from MongoDB, falling back to in-memory storage:",
          mongoError
        );
        isMongoConnected = false;

        // Fall back to in-memory storage
        const index = inMemoryInquiries.findIndex(
          (inquiry) => inquiry._id === id
        );
        if (index === -1) {
          return res
            .status(404)
            .json({ success: false, message: "Inquiry not found" });
        }
        deletedInquiry = inMemoryInquiries[index];
        inMemoryInquiries.splice(index, 1);
      }
    } else {
      // Delete from in-memory storage if MongoDB is not available
      const index = inMemoryInquiries.findIndex(
        (inquiry) => inquiry._id === id
      );
      if (index === -1) {
        return res
          .status(404)
          .json({ success: false, message: "Inquiry not found" });
      }
      deletedInquiry = inMemoryInquiries[index];
      inMemoryInquiries.splice(index, 1);
    }

    // Send notification to all subscribers
    notifySubscribers({
      type: "INQUIRY_DELETED",
      data: { _id: id },
    });

    res.status(200).json({
      success: true,
      message: "Inquiry deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting inquiry:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
      error: error.message,
    });
  }
});

// Subscribe to notifications (Server-Sent Events)
app.get("/api/notifications/subscribe", (req, res) => {
  // Set headers for SSE
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: "CONNECTED" })}\n\n`);

  // Add this client to subscribers
  const clientId = Date.now();
  const newClient = {
    id: clientId,
    res,
  };

  notificationSubscribers.push(newClient);
  console.log(
    `New SSE client connected. Total subscribers: ${notificationSubscribers.length}`
  );

  // Remove client when connection closes
  req.on("close", () => {
    notificationSubscribers = notificationSubscribers.filter(
      (client) => client.id !== clientId
    );
    console.log(
      `SSE client disconnected. Remaining subscribers: ${notificationSubscribers.length}`
    );
  });
});

// Function to send notifications to all subscribers
function notifySubscribers(notification) {
  console.log(
    `Sending notification to ${notificationSubscribers.length} subscribers: ${notification.type}`
  );

  notificationSubscribers.forEach((client) => {
    try {
      client.res.write(`data: ${JSON.stringify(notification)}\n\n`);
    } catch (error) {
      console.error("Error sending notification to client:", error);
    }
  });
}

// Course data
const courses = [
  {
    id: 1,
    title: "JavaScript Development",
    description:
      "Master modern JavaScript from basics to advanced concepts like ES6+, async/await, and frameworks.",
    icon: "💻",
    features: [
      "ES6+ Syntax",
      "DOM Manipulation",
      "Async Programming",
      "Modern Frameworks",
      "Real-world Projects",
    ],
  },
  {
    id: 2,
    title: "Android App Development",
    description:
      "Build native Android applications using Kotlin and the latest Android development tools.",
    icon: "📱",
    features: [
      "Kotlin Programming",
      "UI/UX Design",
      "API Integration",
      "Database Management",
      "App Publishing",
    ],
  },
  {
    id: 3,
    title: "MERN Stack Development",
    description:
      "Become a full-stack developer with MongoDB, Express, React, and Node.js.",
    icon: "🌐",
    features: [
      "MongoDB",
      "Express.js",
      "React.js",
      "Node.js",
      "Full-stack Projects",
    ],
  },
  {
    id: 4,
    title: "Software Testing",
    description:
      "Learn comprehensive testing methodologies including manual and automated testing.",
    icon: "🧪",
    features: [
      "Manual Testing",
      "Automated Testing",
      "Test Planning",
      "Bug Tracking",
      "Performance Testing",
    ],
  },
  {
    id: 5,
    title: "Graphic Designing",
    description:
      "Master graphic design principles and tools to create stunning visual content.",
    icon: "🎨",
    features: [
      "Adobe Photoshop",
      "Illustrator",
      "UI/UX Design",
      "Typography",
      "Brand Identity",
    ],
  },
  {
    id: 6,
    title: "AI-Powered Development",
    description:
      "Learn to leverage AI tools to enhance your coding and development workflow.",
    icon: "🤖",
    features: [
      "AI Coding Assistants",
      "Prompt Engineering",
      "AI Integration",
      "Automated Testing",
      "Smart Development",
    ],
  },
];

// Get all courses
app.get("/api/courses", (req, res) => {
  res.status(200).json({
    success: true,
    count: courses.length,
    data: courses,
  });
});

// Get a single course
app.get("/api/courses/:id", (req, res) => {
  const { id } = req.params;
  const course = courses.find((c) => c.id === parseInt(id));

  if (!course) {
    return res
      .status(404)
      .json({ success: false, message: "Course not found" });
  }

  res.status(200).json({
    success: true,
    data: course,
  });
});

// Health check route
app.get("/api/health", async (req, res) => {
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
    console.error("Error in health check:", err);
    res.status(500).json({
      success: false,
      message: "Health check failed",
      error: err.message,
    });
  }
});

// Function to check if a port is in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = net
      .createServer()
      .once("error", () => {
        // Port is in use
        resolve(true);
      })
      .once("listening", () => {
        // Port is free
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
      // Port is available, start the server
      app.listen(currentPort, () => {
        console.log(`Server running on port ${currentPort}`);
      });
      return;
    }

    // Port is in use, try the next one
    console.log(`Port ${currentPort} is in use, trying ${currentPort + 1}`);
    currentPort++;
    attempts++;
  }

  console.error(
    `Could not find an available port after ${maxAttempts} attempts.`
  );
  process.exit(1);
}

// Start the server
startServer();
