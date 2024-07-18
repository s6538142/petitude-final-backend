import express from "express";
import moment from "moment-timezone";
import db from "./../utils/connect-mysql.js";
import upload from "./../utils/upload-imgs.js";

// 先設定日期格式
const dateFormat = "YYYY-MM-DD";
const router = express.Router();

const getListData = async (req) => {
  let success = false;
  let redirect = "";

  const perPage = 25; // 每頁最多有幾筆資料
  let page = parseInt(req.query.page) || 1; // 從 query string 最得 page 的值
  if (page < 1) {
    redirect = "?page=1";
    return { success, redirect };
  }

  let keyword = req.query.keyword || ""; //(搜尋)若req.query.keyword有keyword則顯示, 沒有則顯示為空
  // 設定查詢功能, 日期起始/結束
  let reservationDateBegin = req.query.reservationDateBegin || "";
  let reservationDateEnd = req.query.reservationDateEnd || "";

  let where = " WHERE 1 "; //先篩選條件, 顯示true, 0為false
  if (keyword) {
    // where += ` AND \`name\` LIKE '%${keyword}%' `; // 沒有處理 SQL injection
    const keyword_ = db.escape(`%${keyword}%`);
    // console.log({ keyword_ }); 若查詢不到搜尋資料, 檢查是否有成功跳脫
    where += ` AND \`reservation_date\` LIKE ${keyword_} OR \`note\` LIKE ${keyword_}`; // 處理 SQL injection
  }

  // 生日範圍篩選, 若要分成兩個搜尋框搜尋begin和end, 把她拆開寫就好
  // 在甚麼日期之後, 篩選條件出來
  if (reservationDateBegin) {
    const m = moment(reservationDateBegin);
    if (m.isValid()) {
      where += ` AND reservation_date >= '${m.format(dateFormat)}'`;
    }
  }
  // 在甚麼日期之前, 篩選條件出來
  if (reservationDateEnd) {
    const m = moment(reservationDateEnd);
    if (m.isValid()) {
      where += ` AND reservation_date <= '${m.format(dateFormat)}'`;
    }
  }
  // 生日範圍篩選

  const t_sql = ` SELECT COUNT(1) totalRows FROM reservation ${where} `;
  console.log(t_sql);
  const [[{ totalRows }]] = await db.query(t_sql);
  let totalPages = 0; // 總頁數, 預設值
  let rows = []; // 分頁資料
  if (totalRows) {
    totalPages = Math.ceil(totalRows / perPage);
    if (page > totalPages) {
      redirect = `? page = ${totalPages} `;
      return { success, redirect };
    }

    // 取得分頁資料
    const sql = `SELECT * FROM \`reservation\` ${where} ORDER BY reservation_id DESC LIMIT ${
      (page - 1) * perPage
    },${perPage}`;
    console.log(sql);

    [rows] = await db.query(sql);
    // 用foreach去把每筆日期資料轉換格式呈現
    rows.forEach((el) => {
      el.reservation_date = moment(el.reservation_date).format(dateFormat);
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

// route群組化 async裡面要包await
router.get("/", async (req, res) => {
  res.locals.title = "List | " + res.locals.title;
  res.locals.pageName = "reservation_list";
  const data = await getListData(req);
  if (data.redirect) {
    return res.redirect(data.redirect);
  }
  if (data.success) {
    res.render("reservation/list", data);
  }
});

// 印出上方有const/let的變數名稱, 顯示抓取到哪些資料
router.get("/api", async (req, res) => {
  const data = await getListData(req);
  res.json(data);
});

router.get("/add", async (req, res) => {
  res.locals.title = "新增線上訂購契約 | " + res.locals.title;
  res.locals.pageName = "reservation_add";
  res.render("reservation/add");
});
// 處理 multipart/form-data
// router.post("/add", upload.none(), async (req, res) => {
//   res.json(req.body)
// });

router.post("/add", async (req, res) => {
  // const sql = "INSERT INTO address_book (`fk_b2c_id`, `fk_pet_id`, `fk_project_id`, `fk_reservation_id`, `reservation_date`, `reservation_note`) VALUES (?, ?, ?, ?, ?, ?)";

  // const [result] = await db.query(sql, [
  //   req.body.fk_b2c_id,
  //   req.body.fk_pet_id,
  //   req.body.fk_project_id,
  //   req.body.fk_reservation_id,
  //   req.body.reservation_date,
  //   req.body.reservation_note,
  // ]);

  let body = { ...req.body };
  // body.reservation_date = new Date();

  const m = moment(body.reservation_date);
  body.reservation_date = m.isValid() ? m.format(dateFormat) : null;

  const sql = "INSERT INTO reservation SET ?";
  const [result] = await db.query(sql, [body]);

  res.json({
    result,
    success: !!result.affectedRows,
  });
});

// 刪除資料的api, 要到postman測試看看能不能刪除
router.delete("/api/:reservation_id", async (req, res) => {
  const output = {
    success: false,
    code: 0,
    result: {},
  };

  const reservation_id = +req.params.reservation_id || 0;
  if (!reservation_id) {
    return res.json(output);
  }

  const sql = `DELETE FROM reservation WHERE reservation_id=${reservation_id}`;
  const [result] = await db.query(sql);
  output.result = result;
  output.success = !!result.affectedRows;

  res.json(output);
});

// 編輯的表單頁
router.get("/edit/:reservation_id", async (req, res) => {
  const reservation_id = +req.params.reservation_id || 0;
  if (!reservation_id) {
    return res.redirect("/reservation");
  }

  const sql = `SELECT * FROM reservation WHERE reservation_id=${reservation_id}`;
  const [rows] = await db.query(sql);
  if (!rows.length) {
    // 沒有該筆資料
    return res.redirect("/reservation");
  }
  // res.json(rows[0]);

  rows[0].reservation_date = moment(rows[0].reservation_date).format(
    dateFormat
  );

  res.render("reservation/edit", rows[0]);
});

// 處理編輯的表單
router.put("/api/:reservation_id", upload.none(), async (req, res) => {
  const output = {
    success: false,
    code: 0,
    result: {},
  };

  const reservation_id = +req.params.reservation_id || 0;
  if (!reservation_id) {
    return res.json(output);
  }

  try {
    const sql = "UPDATE `reservation` SET ? WHERE reservation_id=? ";

    const [result] = await db.query(sql, [req.body, reservation_id]);
    output.result = result;
    output.success = !!(result.affectedRows && result.changedRows);
  } catch (ex) {
    output.error = ex;
  }

  res.json(output);
});

export default router;
