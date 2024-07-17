import express from "express";
import moment from "moment-timezone";
import db from "../utils/connect-mysql.js";
import upload from "../utils/upload-imgs.js";
import bcrypt from "bcrypt";

const dateFormat = "YYYY-MM-DD";
const router = express.Router();

const formatDate = (date) => moment(date).format(dateFormat);

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
  let birth_begin = req.query.birth_begin || "";
  let birth_end = req.query.birth_end || "";

  let where = " WHERE 1 ";
  if (keyword) {
    const keyword_ = db.escape(`%${keyword}%`);
    where += ` AND ( \`b2c_name\` LIKE ${keyword_} OR \`b2c_mobile\` LIKE ${keyword_} ) `;
  }
  if (birth_begin) {
    const m = moment(birth_begin);
    if (m.isValid()) {
      where += ` AND b2c_birthday >= '${m.format(dateFormat)}' `;
    }
  }
  if (birth_end) {
    const m = moment(birth_end);
    if (m.isValid()) {
      where += ` AND b2c_birthday <= '${m.format(dateFormat)}' `;
    }
  }

  const t_sql = `SELECT COUNT(1) totalRows FROM b2c_members ${where}`;
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
    const sql = `SELECT * FROM \`b2c_members\` ${where} ORDER BY b2c_id DESC LIMIT ${
      (page - 1) * perPage
    },${perPage}`;
    console.log(sql);
    [rows] = await db.query(sql);
    rows.forEach((el) => {
      const m = moment(el.b2c_birthday);
      el.b2c_birthday = m.isValid() ? m.format(dateFormat) : "";
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

router.get("/api", async (req, res) => {
  const data = await getListData(req);
  res.json(data);
});



router.post("/add", async (req, res) => {
  let body = { ...req.body };

  try {
    // 加密密碼
    const saltRounds = 8;
    body.b2c_password = await bcrypt.hash(body.b2c_password, saltRounds);

    const sql = "INSERT INTO b2c_members SET ?";
    const [result] = await db.query(sql, [body]);

    res.json({
      result,
      success: !!result.affectedRows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.delete("/api/:b2c_id", async (req, res) => {
  const output = {
    success: false,
    code: 0,
    result: {},
  };

  if (!req.my_jwt?.id) {
    output.code = 470;
    return res.json(output);
  }
  const b2c_id = +req.params.b2c_id || 0;
  if (!b2c_id) {
    output.code = 480;
    return res.json(output);
  }

  const sql = `DELETE FROM b2c_members WHERE b2c_id=${b2c_id}`;
  const [result] = await db.query(sql);
  output.result = result;
  output.success = !!result.affectedRows;

  res.json(output);
});

router.get("/edit/:b2c_id", async (req, res) => {
  const b2c_id = +req.params.b2c_id || 0;
  if (!b2c_id) {
    return res.redirect("/address-book");
  }

  const sql = `SELECT * FROM b2c_members WHERE b2c_id=${b2c_id}`;
  const [rows] = await db.query(sql);
  if (!rows.length) {
    return res.redirect("/address-book");
  }

  rows[0].b2c_birthday = moment(rows[0].b2c_birthday).format(dateFormat);

  res.render("address-book/edit", rows[0]);
});

// 更新 GET 請求處理函數
router.get("/api/:b2c_id", async (req, res) => {
  const b2c_id = +req.params.b2c_id || 0;
  if (!b2c_id) {
    return res.json({ success: false, error: "沒有編號" });
  }

  const sql = `SELECT * FROM b2c_members WHERE b2c_id=${b2c_id}`;
  const [rows] = await db.query(sql);
  if (!rows.length) {
    return res.json({ success: false, error: "沒有該筆資料" });
  }

  const row = rows[0];
  row.b2c_birthday = formatDate(row.b2c_birthday); // 格式化日期

  res.json({ success: true, data: row });
});

// 更新 PUT 請求處理函數
router.put("/api/:b2c_id", upload.none(), async (req, res) => {
  const output = {
    success: false,
    code: 0,
    result: {},
  };

  const b2c_id = +req.params.b2c_id || 0;
  if (!b2c_id) {
    return res.json(output);
  }

  let body = { ...req.body };
  const m = moment(body.b2c_birth);
  body.b2c_birth = m.isValid() ? m.format(dateFormat) : null;

  try {
    // 如果提供了新的密碼，則加密
    if (body.b2c_password) {
      const saltRounds = 8;
      body.b2c_password = await bcrypt.hash(body.b2c_password, saltRounds);
    }

    const sql = "UPDATE `b2c_members` SET ? WHERE b2c_id=? ";
    const [result] = await db.query(sql, [body, b2c_id]);
    output.result = result;
    output.success = !!(result.affectedRows && result.changedRows);
  } catch (ex) {
    output.error = ex;
  }

  res.json(output);
});

export default router;

