
const express = require("express");
const router = express.Router();
const Project = require("../models/Project");

let portfolioProjects = [];
let isMongoConnected = false;

// Get all projects
router.get("/", async (req, res) => {
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
router.post("/", async (req, res) => {
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
router.delete("/:id", async (req, res) => {
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
router.patch("/:id", async (req, res) => {
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

module.exports = router;