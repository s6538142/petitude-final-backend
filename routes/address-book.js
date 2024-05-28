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
  let totalPages = 0; // 總頁數, 預設值
  let rows = []; // 分頁資料
  if (totalRows) {
    totalPages = Math.ceil(totalRows / perPage);
    if (page > totalPages) {
      return res.redirect(`?page=${totalPages}`); // 跳轉頁面
    }
    // 取得分頁資料
    const sql = `SELECT * FROM \`address_book\` LIMIT ${
      (page - 1) * perPage
    },${perPage}`;

    [rows] = await db.query(sql);
  }

  // res.json({ success, perPage, page, totalRows, totalPages, rows });
  res.render("address-book/list", { success, perPage, page, totalRows, totalPages, rows });
});

export default router;
