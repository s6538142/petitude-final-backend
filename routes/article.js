import express from "express";
import moment from "moment-timezone";
import db from "../utils/connect-mysql.js";

const dateFormat = "YYYY-MM-DD";
const router = express.Router();

// fetch article and messages
const getArticleAndMessages = async (article_id) => {
  try {
    // Fetch article
    const articleSql = `
      SELECT a.*, c.class_name
      FROM article a
      JOIN class c ON a.fk_class_id = c.class_id
      WHERE a.article_id = ?`;
    const [articleRows] = await db.query(articleSql, [article_id]);
    if (!articleRows.length) {
      throw new Error("Article not found");
    }

    // Fetch messages
    const messageSql = `
      SELECT m.*, b.b2c_name
      FROM message m
      JOIN b2c_members b ON m.fk_b2c_id = b.b2c_id
      WHERE m.fk_article_id = ?
      ORDER BY m.message_date DESC`;
    const [messageRows] = await db.query(messageSql, [article_id]);

    // 格式化文章日期
    articleRows[0].article_date = moment(articleRows[0].article_date).isValid()
      ? moment(articleRows[0].article_date).format(dateFormat)
      : "";

    return { article: articleRows[0], messages: messageRows };
  } catch (error) {
    console.error("Error fetching article and messages:", error);
    throw new Error("Failed to fetch article and messages");
  }
};

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
    return res.json({ success: false, error: "Invalid article ID" });
  }

  try {
    const { article, messages } = await getArticleAndMessages(article_id);
    res.json({ success: true, article, messages });
  } catch (error) {
    console.error("Error fetching article:", error);
    res.json({ success: false, error: "Failed to fetch article" });
  }
});

export default router;
