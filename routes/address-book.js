import express from "express";
import db from "./../utils/connect-mysql.js";

const router = express.Router();

router.get("/", async (req, res) => {
  let success = false;

  const perPage = 25; // 每頁最多有幾筆資料
  let page = parseInt(req.query.page) || 1; // 從 query string 最得 page 的值
  if (page < 1) {
    return res.redirect("?page=1"); // 跳轉頁面
  }

  const t_sql = "SELECT COUNT(1) totalRows FROM address_book";
  const [[{ totalRows }]] = await db.query(t_sql);
  if(totalRows) {
    // 取得分頁資料
  }

  res.json({ success, perPage, page, totalRows });
});

export default router;
