import express from "express";
import db from "../utils/connect-mysql.js";

const router = express.Router();

// 添加收藏
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

// 檢查是否已收藏
router.get("/check/:b2c_id/:article_id", async (req, res) => {
  const { b2c_id, article_id } = req.params;

  try {
    const sql =
      "SELECT * FROM favorite WHERE fk_b2c_id = ? AND fk_article_id = ?";
    const [result] = await db.query(sql, [b2c_id, article_id]);

    if (result.length > 0) {
      res.json({ isFavorite: true });
    } else {
      res.json({ isFavorite: false });
    }
  } catch (error) {
    console.error("檢查收藏狀態失敗:", error);
    res.json({ success: false, error: "檢查收藏狀態失敗" });
  }
});

// 新增刪除收藏的路由
router.delete("/remove/:b2c_id/:article_id", async (req, res) => {
  const { b2c_id, article_id } = req.params;

  try {
    const sql =
      "DELETE FROM favorite WHERE fk_b2c_id = ? AND fk_article_id = ?";
    const [result] = await db.query(sql, [b2c_id, article_id]);

    if (result.affectedRows === 1) {
      res.json({ success: true });
    } else {
      res.json({ success: false, error: "取消收藏失敗" });
    }
  } catch (error) {
    console.error("取消收藏失敗:", error);
    res.json({ success: false, error: "取消收藏失敗" });
  }
});

export default router;
