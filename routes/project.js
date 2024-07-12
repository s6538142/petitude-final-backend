// 生前契約

import express from "express";
import moment from "moment-timezone";
import db from "./../utils/connect-mysql.js";
import upload from "./../utils/upload-imgs.js";

// 日期格式設定
const dateFormat = "YYYY-MM-DD";
// 創建路由器
const router = express.Router();

// 獲取列表數據的函數
// 該函數用於從資料庫中獲取線上預約的列表數據，並返回相關的分頁資訊
// 主要用於處理線上預約列表的分頁和篩選，根據用戶的查詢條件返回相應的資料和分頁資訊
const getListData = async (req) => {
    let success = false; //表示操作是否成功，初始值為 false
    let redirect = ""; //存儲重定向的 URL，初始值為空字符串

    const perPage = 25; // 每頁最多有幾筆資料
    let page = parseInt(req.query.page) || 1; // 從 query string 最得 page 的值
    if (page < 1) {
        redirect = "?page=1";
    return { success, redirect };
    }

    // 設定關鍵字和日期篩選條件
    let keyword = req.query.keyword || ''; //(搜尋)若req.query.keyword有keyword則顯示, 沒有則顯示為空
    let projectDateBegin = req.query.projectDateBegin || ''; // 分別為篩選的開始和結束日期
    let projectDateEnd = req.query.projectDateEnd || '';

    // 設定 SQL 查詢條件
    let where = ' WHERE 1 ';
    // 若有關鍵字，則將其加入查詢條件
    if (keyword) {  
    const keyword_ = db.escape(`%${keyword}%`);
    where += ` AND \`project_level\` LIKE ${keyword_} OR \`project_name\` LIKE ${keyword_} OR AND \`project_content\` LIKE ${keyword_} OR AND \`project_fee\` LIKE ${keyword_}`;// 處理 SQL injection
    }

      // 若有日期篩選條件，則將其加入查詢條件
    // if (projectDateBegin) {
    //     const m = moment(projectDateBegin);
    //     if (m.isValid()) {
    //     where += ` AND project_date >= '${m.format(dateFormat)}'`;
    //     }
    // }
    // 在甚麼日期之前, 篩選條件出來
    // if (projectDateEnd) {
    //     const m = moment(projectDateEnd);
    //     if (m.isValid()) {
    //     where += ` AND project_date <= '${m.format(dateFormat)}'`;
    //     }
    // }

    // 計算總資料筆數和總頁數
    // 執行計數查詢，獲取符合條件的資料總數
    // 計算總頁數，若當前頁數>總頁數，則跳去最後一頁
    const t_sql = `SELECT COUNT(1) totalRows FROM project ${where}`;
    console.log(t_sql);
    const [[{ totalRows }]] = await db.query(t_sql);
    let totalPages = 0; // 總頁數, 預設0
    let rows = []; // 分頁資料, 預設空陣列
    if (totalRows) {
        totalPages = Math.ceil(totalRows / perPage);
        if (page > totalPages) {
        redirect = `?page=${totalPages}`;
        return { success, redirect };
        }

    // 取得分頁資料
    // 執行查詢，根據分頁條件獲取資料
    // 將無效日期格式轉換為空字符串
    const sql = `SELECT * FROM \`project\` ${where} ORDER BY project_id DESC LIMIT ${
    (page - 1) * perPage
    },${perPage}`;
    console.log(sql);
    [rows] = await db.query(sql);
    rows.forEach((el) => {
    const m = moment(el.project_date);
    // 無效的日期格式, 使用空字串
    el.project_date = m.isValid() ? m.format(dateFormat) : "";
    });
    }

    // 返回結果
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

// ---------------------------------------------------------------------
    // middleware
    router.use((req, res, next) => {
    let u = req.url.split("?")[0];
    if (["/", "/api"].includes(u)) {
        // 上面設定不用登入通過
        // 下面打開則要登入才能看
        // if (u === "/") {
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
// ---------------------------------------------------------------------

// 根據查詢參數獲取預約列表
router.get("/", async (req, res) => {
    res.locals.title = "生前契約列表 | " + res.locals.title;
    res.locals.pageName = "project-form";
    const data = await getListData(req);
    if (data.redirect) {
        return res.redirect(data.redirect);
    }
    });

// 獲取預約列表的 API
router.get("/api", async (req, res) => {
  const data = await getListData(req);
  res.json(data);
});

// 顯示新增預約表單
router.get("/add", async (req, res) => {
  res.locals.title = "新增生前契約 | " + res.locals.title;
  res.locals.pageName = "project_add";
  res.render("project/add");
});

// 處理新增預約的 POST 請求
router.post("/add", async (req, res) => {

  let body = { ...req.body };
  body.created_at = new Date();

//   const m = moment(body.project_date);
//   body.project_date = m.isValid() ? m.format(dateFormat) : null;

  const sql = "INSERT INTO project SET ?";
  const [result] = await db.query(sql, [body]);

  res.json({
    result,
    success: !!result.affectedRows,
  });

});


// 刪除契約的 API
router.delete("/api/:project_id", async (req, res) => {
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
  const project_id = +req.params.project_id || 0;
  if (!project_id) {
    output.code = 480;
    return res.json(output);
  }

  const sql = `DELETE FROM project WHERE project_id=${project_id}`;
  const [result] = await db.query(sql);
  output.result = result;
  output.success = !!result.affectedRows;

  res.json(output);
});


  // 顯示編輯契約表單
router.get("/edit/:project_id", async (req, res) => {
  const project_id = +req.params.project_id || 0;
  if (!project_id) {
    return res.redirect("/project");
  }

  const sql = `SELECT * FROM project WHERE project_id=${project_id}`;
  const [rows] = await db.query(sql);
  if (!rows.length) {
    // 沒有該筆資料
    return res.redirect("/project");
  }


  rows[0].project_date = moment(rows[0].project_date).format(dateFormat);

  res.render("project/edit", rows[0]);
});

// 處理編輯預約的 PUT 請求
router.put("/api/:project_id", upload.none(), async (req, res) => {
  const output = {
    success: false,
    code: 0,
    result: {},
  };
  const project_id = +req.params.project_id || 0;
  if (!project_id) {
    return res.json(output);
  }

  try {
    const sql = "UPDATE `project` SET ? WHERE project_id=? ";

    const [result] = await db.query(sql, [req.body, project_id]);
    output.result = result;
    output.success = !!(result.affectedRows && result.changedRows);
  } catch (ex) {
    output.error = ex;
  }

  res.json(output);
});


export default router;