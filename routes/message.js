import express from "express";
import db from "../utils/connect-mysql.js";
import multer from "multer";
import { v4 as uuidv4 } from "uuid";
import path from "path";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = uuidv4().split("-")[0];
    const ext = path.extname(file.originalname);
    const filename = `${uniqueSuffix}${ext}`;
    cb(null, filename);
  },
});
const upload = multer({ storage });

router.post("/add", (req, res) => {
  const { message_content, message_date, fk_article_id, fk_b2c_id } = req.body;

  const sql =
    "INSERT INTO message (message_content, message_date, fk_article_id, fk_b2c_id) VALUES (?, ?, ?, ?)";

  db.query(
    sql,
    [message_content, message_date, fk_article_id, fk_b2c_id],
    (err, result) => {
      if (err) {
        res.status(500).send({ success: false, message: "留言添加失敗" });
        return;
      }
      res.send({ success: true, message_id: result.insertId });
    }
  );
});

router.post("/re_message/add", (req, res) => {
  const { re_message_content, re_message_date, fk_message_id, fk_b2c_id } =
    req.body;

  const sql =
    "INSERT INTO re_message (re_message_content, re_message_date, fk_message_id, fk_b2c_id) VALUES (?, ?, ?, ?)";

  db.query(
    sql,
    [re_message_content, re_message_date, fk_message_id, fk_b2c_id],
    (err, result) => {
      if (err) {
        res.status(500).send({ success: false, message: "回覆留言添加失敗" });
        return;
      }
      res.send({ success: true, re_message_id: result.insertId });
    }
  );
});

router.get("/:article_id", (req, res) => {
  const articleId = req.params.article_id;

  const articleQuery = "SELECT * FROM article WHERE article_id = ?";
  const messageQuery = "SELECT * FROM message WHERE fk_article_id = ?";
  const reMessageQuery = `
    SELECT rm.*, bm.b2c_name, rm.fk_message_id
    FROM re_message rm
    JOIN b2c_members bm ON rm.fk_b2c_id = bm.b2c_id
    WHERE rm.fk_message_id IN (SELECT message_id FROM message WHERE fk_article_id = ?)
  `;

  db.query(articleQuery, [articleId], (err, articleResult) => {
    if (err) {
      res.status(500).send({ success: false, message: "獲取文章失敗" });
      return;
    }

    db.query(messageQuery, [articleId], (err, messageResult) => {
      if (err) {
        res.status(500).send({ success: false, message: "獲取留言失敗" });
        return;
      }

      db.query(reMessageQuery, [articleId], (err, reMessageResult) => {
        if (err) {
          res.status(500).send({ success: false, message: "獲取回覆留言失敗" });
          return;
        }

        // 合并reMessage到message中
        const messagesWithReMessages = messageResult.map((message) => {
          const reMessages = reMessageResult.filter(
            (reMessage) => reMessage.fk_message_id === message.message_id
          );
          return {
            ...message,
            reMessages,
          };
        });

        res.send({
          success: true,
          article: articleResult[0],
          messages: messagesWithReMessages,
        });
      });
    });
  });
});

export default router;
