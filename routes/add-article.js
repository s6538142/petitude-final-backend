import express from "express";

const router = express.Router();

router.get("/", (req, res) => {
  res.json(req.originalUrl);
});

router.get("/add", async (req, res) => {
  res.render("article/add");
});

export default router;