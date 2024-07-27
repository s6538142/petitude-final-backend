import express from "express";
import db from "../utils/connect-mysql.js";

const router = express.Router();

router.post("/add", async (req, res) => {
  const { fk_b2c_id, fk_article_id } = req.body;

  try {
    const sql = "INSERT INTO favorite (fk_b2c_id, fk_article_id) VALUES (?, ?)";
    const [result] = await db.query(sql, [fk_b2c_id, fk_article_id]);

    if (result.affectedRows === 1) {
      res.json({ success: true });
    } else {
      res.json({ success: false, error: "收藏失敗" });
    }
  } catch (error) {
    console.error("收藏失敗:", error);
    res.json({ success: false, error: "收藏失敗" });
  }
});

export default router;
