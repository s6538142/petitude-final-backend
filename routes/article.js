import express from "express";
import moment from "moment-timezone";
import db from "../utils/connect-mysql.js";
import multer from "multer";
import { v4 as uuidv4 } from "uuid"; // 使用 import 语法引入 uuid
import path from "path";

const router = express.Router();
const dateFormat = "YYYY-MM-DD";

// 设置 multer 存储位置和文件命名方式
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4().split("-")[0]; // 生成UUID，并取前8位作为唯一标识
    const ext = path.extname(file.originalname); // 提取文件扩展名
    cb(null, `${uniqueSuffix}${ext}`);
  },
});
const upload = multer({ storage });

router.post("/add", upload.single("article_img"), async (req, res) => {
  try {
    const { article_name, article_content, fk_class_id, fk_b2c_id } = req.body;
    const article_img = req.file ? req.file.filename : null;
    const article_date = moment().format(dateFormat);

    console.log("Received data:", {
      article_name,
      article_content,
      fk_class_id,
      fk_b2c_id,
      article_img,
    });

    if (!article_name || !article_content || !fk_class_id || !fk_b2c_id) {
      return res
        .status(400)
        .json({ success: false, error: "Missing required fields" });
    }

    const sql = `
      INSERT INTO article (article_date, article_name, article_content, fk_class_id, fk_b2c_id, article_img)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const values = [
      article_date,
      article_name,
      article_content,
      fk_class_id,
      fk_b2c_id,
      article_img,
    ];

    console.log("Executing SQL:", sql);
    console.log("With values:", values);

    await db.query(sql, values);

    res.json({ success: true, message: "Article added successfully" });
  } catch (error) {
    console.error("Error adding article:", error);
    res.status(500).json({ success: false, error: "Failed to add article" });
  }
});

// 取得單項資料的 API
router.get("/api/:article_id", async (req, res) => {
  const article_id = +req.params.article_id || 0;
  if (!article_id) {
    return res.json({ success: false, error: "沒有編號" });
  }

  const sql = `SELECT * FROM article WHERE article_id=${article_id}`;
  const [rows] = await db.query(sql);
  if (!rows.length) {
    // 沒有該筆資料
    return res.json({ success: false, error: "沒有該筆資料" });
  }

  res.json({ success: true, data: rows[0] });
});

// 获取文章和留言的功能
const getArticleAndMessages = async (article_id) => {
  try {
    const articleSql = `
      SELECT a.*, c.class_name
      FROM article a
      JOIN class c ON a.fk_class_id = c.class_id
      WHERE a.article_id = ?
    `;
    const [articleRows] = await db.query(articleSql, [article_id]);
    if (!articleRows.length) {
      throw new Error("Article not found");
    }

    const messageSql = `
      SELECT m.*, b.b2c_name
      FROM message m
      JOIN b2c_members b ON m.fk_b2c_id = b.b2c_id
      WHERE m.fk_article_id = ?
      ORDER BY m.message_date DESC
    `;
    const [messageRows] = await db.query(messageSql, [article_id]);

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

  const perPage = 10; // 每頁加載10個項目
  let page = parseInt(req.query.page) || 1;
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

  // 總筆數查詢
  const t_sql = `SELECT COUNT(1) totalRows FROM article a ${where}`;
  const [[{ totalRows }]] = await db.query(t_sql);
  let totalPages = 0;
  let rows = [];
  if (totalRows) {
    totalPages = Math.ceil(totalRows / perPage);
    if (page > totalPages) {
      redirect = `?page=${totalPages}`;
      return { success, redirect };
    }

    // 獲取文章及其留言和留言回覆數量
    const sql = `
      SELECT a.*, c.class_name,
        (SELECT COUNT(*) FROM message m WHERE m.fk_article_id = a.article_id) +
        (SELECT COUNT(*) FROM re_message rm JOIN message m ON rm.fk_message_id = m.message_id WHERE m.fk_article_id = a.article_id) AS message_count
      FROM article a
      JOIN class c ON a.fk_class_id = c.class_id
      ${where}
      ORDER BY a.article_id DESC
      LIMIT ${(page - 1) * perPage},${perPage}
    `;
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

router.get("/api", async (req, res) => {
  const data = await getListData(req);
  res.json(data);
});

router.get("/article_page/:article_id", async (req, res) => {
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

// 處理編輯的表單
router.put(
  "/api/:article_id",
  upload.single("article_img"),
  async (req, res) => {
    const output = {
      success: false,
      code: 0,
      result: {},
    };

    const article_id = +req.params.article_id || 0;
    if (!article_id) {
      return res.json(output);
    }

    let body = { ...req.body };
    const article_img = req.file ? req.file.filename : null;

    if (article_img) {
      body.article_img = article_img;
    }

    try {
      const sql = "UPDATE `article` SET ? WHERE article_id=? ";
      const [result] = await db.query(sql, [body, article_id]);
      output.result = result;
      output.success = !!(result.affectedRows && result.changedRows);
    } catch (ex) {
      output.error = ex;
    }

    res.json(output);
  }
);

export default router;
