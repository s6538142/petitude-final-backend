import express from "express";
import moment from "moment-timezone";
import db from "../utils/connect-mysql.js";

const dateFormat = "YYYY-MM-DD";
const router = express.Router();

const getListData = async (req) => {
  let success = false;
  let redirect = "";

  const perPage = 25; // 每頁最多有幾筆資料
  let page = parseInt(req.query.page) || 1; // 從 query string 取得 page 的值
  if (page < 1) {
    redirect = "?page=1";
    return { success, redirect };
  }

  let keyword = req.query.keyword || "";
  let where = " WHERE 1 ";
  if (keyword) {
    const keyword_ = db.escape(`%${keyword}%`);
    where += ` AND (a.\`article_name\` LIKE ${keyword_} OR a.\`article_content\` LIKE ${keyword_}) `;
  }

  const t_sql = `SELECT COUNT(1) totalRows FROM article a ${where}`;
  const [[{ totalRows }]] = await db.query(t_sql);
  let totalPages = 0; // 總頁數, 預設值
  let rows = []; // 分頁資料
  if (totalRows) {
    totalPages = Math.ceil(totalRows / perPage);
    if (page > totalPages) {
      redirect = `?page=${totalPages}`;
      return { success, redirect };
    }
    // 取得分頁資料
    const sql = `
      SELECT a.*, c.class_name
      FROM article a
      JOIN class c ON a.fk_class_id = c.class_id
      ${where}
      ORDER BY a.article_id DESC
      LIMIT ${(page - 1) * perPage},${perPage}`;
    [rows] = await db.query(sql);
    rows.forEach((el) => {
      const m = moment(el.article_date);
      el.article_date = m.isValid() ? m.format(dateFormat) : "";
    });
  }
  success = true;
  return {
    success,
    perPage,
    page,
    totalRows,
    totalPages,
    rows,
    qs: req.query,
  };
};

// 文章列表頁面
router.get("/", async (req, res) => {
  res.locals.title = "文章列表 | " + res.locals.title;
  res.locals.pageName = "article_list";
  const data = await getListData(req);
  if (data.redirect) {
    return res.redirect(data.redirect);
  }
  if (data.success) {
    res.render("article/list", data);
  }
});

// 取得文章列表的 API
router.get("/api", async (req, res) => {
  const data = await getListData(req);
  res.json(data);
});

// 取得單篇文章的 API
router.get("/api/:article_id", async (req, res) => {
  const article_id = +req.params.article_id || 0;
  if (!article_id) {
    return res.json({ success: false, error: "沒有編號" });
  }

  const sql = `
    SELECT a.*, c.class_name
    FROM article a
    JOIN class c ON a.fk_class_id = c.class_id
    WHERE a.article_id = ?`;
  const [rows] = await db.query(sql, [article_id]);
  if (!rows.length) {
    return res.json({ success: false, error: "沒有該筆資料" });
  }

  const m = moment(rows[0].article_date);
  rows[0].article_date = m.isValid() ? m.format(dateFormat) : "";

  res.json({ success: true, data: rows[0] });
});

export default router;
