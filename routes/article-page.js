// routes/article.js

import express from "express";
import moment from "moment-timezone";
import db from "../utils/connect-mysql.js";

const dateFormat = "YYYY-MM-DD";
const router = express.Router();

// Function to fetch article and associated messages
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

    // Format article date
    articleRows[0].article_date = moment(articleRows[0].article_date).isValid()
      ? moment(articleRows[0].article_date).format(dateFormat)
      : "";

    return { article: articleRows[0], messages: messageRows };
  } catch (error) {
    console.error("Error fetching article and messages:", error);
    throw new Error("Failed to fetch article and messages");
  }
};

// Get single article
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
