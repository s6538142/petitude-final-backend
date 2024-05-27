import express from "express";

const router = express.Router();

router.get("/admin2/:p1?/:p2?", (req, res) => {
  const { p1, p2 } = req.params;

  res.json({ url: req.url, p1, p2 });
});

export default router;
