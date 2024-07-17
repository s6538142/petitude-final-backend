import express from "express";
import moment from "moment-timezone";
import db from "./../utils/connect-mysql.js";
import upload from "./../utils/upload-imgs.js";

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
  let birth_begin = req.query.birth_begin || "";
  let birth_end = req.query.birth_end || "";

  let where = " WHERE 1 ";
  if (keyword) {
    // where += ` AND \`name\` LIKE '%${keyword}%' `; // 沒有處理 SQL injection
    const keyword_ = db.escape(`%${keyword}%`);
    // console.log(keyword_);
    where += ` AND ( \`name\` LIKE ${keyword_} OR \`mobile\` LIKE ${keyword_} ) `; // 處理 SQL injection
  }
  if (birth_begin) {
    const m = moment(birth_begin);
    if (m.isValid()) {
      where += ` AND birthday >= '${m.format(dateFormat)}' `;
    }
  }
  if (birth_end) {
    const m = moment(birth_end);
    if (m.isValid()) {
      where += ` AND birthday <= '${m.format(dateFormat)}' `;
    }
  }

  const t_sql = `SELECT COUNT(1) totalRows FROM address_book ${where}`;
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
    const sql = `SELECT * FROM \`address_book\` ${where} ORDER BY sid DESC LIMIT ${
      (page - 1) * perPage
    },${perPage}`;
    console.log(sql);
    [rows] = await db.query(sql);
    rows.forEach((el) => {
      const m = moment(el.birthday);
      // 無效的日期格式, 使用空字串
      el.birthday = m.isValid() ? m.format(dateFormat) : "";
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
/*
// 模擬網路延遲的狀況 middleware
router.use((req, res, next) => {
  const ms = 100 + Math.floor(Math.random() * 2000);
  setTimeout(() => {
    next();
  }, ms);
});
*/

// middleware
/*
router.use((req, res, next) => {
  let u = req.url.split("?")[0];
  if (["/", "/api"].includes(u)) {
    return next();
  }
  if (req.session.admin) {
    // 有登入, 就通過
    next();
  } else {
    // 沒有登入, 就跳到登入頁
    res.redirect("/login");
  }
});
*/
router.get("/", async (req, res) => {
  res.locals.title = "通訊錄列表 | " + res.locals.title;
  res.locals.pageName = "ab_list";
  const data = await getListData(req);
  if (data.redirect) {
    return res.redirect(data.redirect);
  }
  if (data.success) {
    res.render("address-book/list", data);
  }
});

router.get("/api", async (req, res) => {
  const data = await getListData(req);
  res.json(data);
});

router.get("/add", async (req, res) => {
  res.locals.title = "新增通訊錄 | " + res.locals.title;
  res.locals.pageName = "ab_add";
  res.render("address-book/add");
});
/*
// 處理 multipart/form-data
router.post("/add", [upload.none()], async (req, res) => {
  res.json(req.body);
});
*/

router.post("/add", async (req, res) => {
  // TODO: 欄位資料的檢查

  /*
  const sql = "INSERT INTO address_book (`name`, `email`, `mobile`, `birthday`, `address`, `created_at`) VALUES (?, ?, ?, ?, ?, NOW())";
  const [ result ] = await db.query(sql, [
    req.body.name,
    req.body.email,
    req.body.mobile,
    req.body.birthday,
    req.body.address,
  ]);
*/

  let body = { ...req.body };
  body.created_at = new Date();

  const m = moment(body.birthday);
  body.birthday = m.isValid() ? m.format(dateFormat) : null;

  const sql = "INSERT INTO address_book SET ?";
  const [result] = await db.query(sql, [body]);

  res.json({
    result,
    success: !!result.affectedRows,
  });
  /*
  {
    "fieldCount": 0,
    "affectedRows": 1,
    "insertId": 5007,
    "info": "",
    "serverStatus": 2,
    "warningStatus": 0,
    "changedRows": 0
  }
  */
});

// 刪除資料的 API
router.delete("/api/:sid", async (req, res) => {
  const output = {
    success: false,
    code: 0,
    result: {},
  };

  if(! req.my_jwt?.id){
    // 沒有登入
    output.code = 470;
    return res.json(output);
  }
  const sid = +req.params.sid || 0;
  if (!sid) {
    output.code = 480;
    return res.json(output);
  }

  const sql = `DELETE FROM address_book WHERE sid=${sid}`;
  const [result] = await db.query(sql);
  output.result = result;
  output.success = !!result.affectedRows;

  res.json(output);
});

// 編輯的表單頁
router.get("/edit/:sid", async (req, res) => {
  const sid = +req.params.sid || 0;
  if (!sid) {
    return res.redirect("/address-book");
  }

  const sql = `SELECT * FROM address_book WHERE sid=${sid}`;
  const [rows] = await db.query(sql);
  if (!rows.length) {
    // 沒有該筆資料
    return res.redirect("/address-book");
  }

  // res.json(rows[0]);

  rows[0].birthday = moment(rows[0].birthday).format(dateFormat);

  res.render("address-book/edit", rows[0]);
});

// 取得單項資料的 API
router.get("/api/:sid", async (req, res) => {
  const sid = +req.params.sid || 0;
  if (!sid) {
    return res.json({ success: false, error: "沒有編號" });
  }

  const sql = `SELECT * FROM address_book WHERE sid=${sid}`;
  const [rows] = await db.query(sql);
  if (!rows.length) {
    // 沒有該筆資料
    return res.json({ success: false, error: "沒有該筆資料" });
  }

  const m = moment(rows[0].birthday);
  rows[0].birthday = m.isValid() ? m.format(dateFormat) : "";

  res.json({ success: true, data: rows[0] });
});

// 處理編輯的表單
router.put("/api/:sid", upload.none(), async (req, res) => {
  const output = {
    success: false,
    code: 0,
    result: {},
  };

  const sid = +req.params.sid || 0;
  if (!sid) {
    return res.json(output);
  }

  let body = { ...req.body };
  const m = moment(body.birthday);
  body.birthday = m.isValid() ? m.format(dateFormat) : null;

  try {
    const sql = "UPDATE `address_book` SET ? WHERE sid=? ";

    const [result] = await db.query(sql, [body, sid]);
    output.result = result;
    output.success = !!(result.affectedRows && result.changedRows);
  } catch (ex) {
    output.error = ex;
  }

  res.json(output);
});

export default router;
