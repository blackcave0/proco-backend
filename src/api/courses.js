
const express = require("express");
const router = express.Router();

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
router.get("/", (req, res) => {
  res.status(200).json({
    success: true,
    count: courses.length,
    data: courses,
  });
});

// Get a single course
router.get("/:id", (req, res) => {
  const { id } = req.params;
  const course = courses.find((c) => c.id === parseInt(id));

  if (!course) {
    return res.status(404).json({ success: false, message: "Course not found" });
  }

  res.status(200).json({
    success: true,
    data: course,
  });
});

module.exports = router;