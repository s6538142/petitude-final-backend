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

router.get("/re_message/:message_id/replies", async (req, res) => {
  const { message_id } = req.params;
  console.log("Message ID:", message_id);

  try {
    // 更新的 SQL 查詢，包括 JOIN 操作
    const [replies] = await db.execute(
      `SELECT 
        re.re_message_id,
        re.re_message_content,
        re.re_message_date,
        re.re_message_img,
        b.b2c_name
       FROM 
        re_message re
       JOIN 
        b2c_members b ON re.fk_b2c_id = b.b2c_id
       WHERE 
        re.fk_message_id = ?
       ORDER BY 
        re.re_message_date`,
      [message_id]
    );

    res.json(replies);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

export default router;
