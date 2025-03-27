const express = require("express");
const router = express.Router();
const Inquiry = require("../models/Inquiry");

let inMemoryInquiries = [];
let isMongoConnected = false;

// Add a new inquiry
router.post("/", async (req, res) => {
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
router.get("/", async (req, res) => {
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
router.patch("/:id/status", async (req, res) => {
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
              }
            } else {
              // Update in in-memory storage if MongoDB is not available
              const inquiryIndex = inMemoryInquiries.findIndex((inq) => inq._id === id);
        
              if (inquiryIndex === -1) {
                return res
                  .status(404)
                  .json({ success: false, message: "Inquiry not found" });
              }
        
              inMemoryInquiries[inquiryIndex] = {
                ...inMemoryInquiries[inquiryIndex],
                status,
                updatedAt: new Date(),
              };
        
              updatedInquiry = inMemoryInquiries[inquiryIndex];
            }
        
            // Send notification to all subscribers
            notifySubscribers({
              type: "INQUIRY_STATUS_UPDATED",
              data: updatedInquiry,
            });
        
            res.status(200).json({
              success: true,
              message: "Inquiry status updated successfully",
              data: updatedInquiry,
              mode: isMongoConnected ? "mongodb" : "demo",
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
         