import express from "express";
import db from "../utils/connect-mysql.js";

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

  let where = " WHERE 1 ";

  const t_sql = `SELECT COUNT(1) totalRows FROM class ${where}`;
  console.log(t_sql);
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
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM article a WHERE a.fk_class_id = c.class_id) AS article_count
      FROM class c
      ${where} 
      ORDER BY class_id DESC 
      LIMIT ${(page - 1) * perPage}, ${perPage}`;
    console.log(sql);
    [rows] = await db.query(sql);
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

router.get("/api", async (req, res) => {
  const data = await getListData(req);
  res.json(data);
});

const getArticleListByClass = async (req) => {
  let success = false;
  const { class_id } = req.params;
  console.log(`Received class_id: ${class_id}`);
  const page = parseInt(req.query.page) || 1;
  const perPage = 10;
  const offset = (page - 1) * perPage;

  const t_sql = `
    SELECT COUNT(1) totalRows 
    FROM article 
    WHERE fk_class_id = ?
  `;
  console.log(t_sql, [class_id]);
  const [[{ totalRows }]] = await db.query(t_sql, [class_id]);

  let totalPages = 0; // 總頁數, 預設值
  let rows = []; // 分頁資料
  if (totalRows) {
    totalPages = Math.ceil(totalRows / perPage);
    const sql = `
      SELECT 
        a.article_id,
        a.article_date,
        a.article_name,
        a.article_content,
        a.article_img,
        a.views_count,
        a.click_like,
        (SELECT COUNT(*) FROM message m WHERE m.fk_article_id = a.article_id) AS message_count
      FROM article a
      WHERE a.fk_class_id = ?
      LIMIT ? OFFSET ?
    `;
    console.log(sql, [class_id, perPage, offset]);
    [rows] = await db.query(sql, [class_id, perPage, offset]);
  }

  if (rows.length) {
    success = true;
  }

  return {
    success,
    totalRows,
    totalPages,
    page,
    perPage,
    rows,
  };
};

router.get("/filter/:class_id", async (req, res) => {
  const data = await getArticleListByClass(req);
  res.json(data);
});

export default router;
