import express from "express";
import moment from "moment-timezone";
import db from "./../utils/connect-mysql.js";


// 先設定日期格式
const dateFormat = "YYYY-MM-DD HH:mm:ss";
const router = express.Router();

// 獲取會員id的函數
const getB2cIdByName = async (name) => {
  const [b2cResult] = await db.query(
    "SELECT b2c_id FROM b2c_members WHERE b2c_name = ?",
    [name]
  );
  return b2cResult[0]?.b2c_id;
};

// 獲取列表資料的函數
const getListData = async (req) => {
  try {
    let success = false;
    let redirect = "";

    const perPage = 25; // 每頁最多有幾筆資料
    let page = parseInt(req.query.page) || 1; // 從 query string 最得 page 的值
    if (page < 1) {
      redirect = "?page=1";
      return { success, redirect };
    }

    let keyword = req.query.keyword || ""; // (搜尋)若req.query.keyword有keyword則顯示, 沒有則顯示為空
    let reservation_begin = req.query.reservation_begin || "";
    let reservation_end = req.query.reservation_end || "";
    let where = "";

    if (keyword) {
      const keyword_ = db.escape(`%${keyword}%`);
      where += ` AND ( \`b2c_name\` LIKE ${keyword_} OR \`b2c_mobile\` LIKE ${keyword_} ) `;
    }
    if (reservation_begin) {
      const m = moment(reservation_begin);
      if (m.isValid()) {
        where += ` AND reservation_date >= '${m.format(dateFormat)}' `;
      }
    }
    if (reservation_end) {
      const m = moment(reservation_end);
      if (m.isValid()) {
        where += ` AND reservation_date <= '${m.format(dateFormat)}' `;
      }
    }

    const t_sql = `SELECT COUNT(1) totalRows FROM reservation ${where}`;
    console.log(t_sql);
    const [[{ totalRows }]] = await db.query(t_sql);
    let totalPages = 0;
    let rows = [];
    if (totalRows) {
      totalPages = Math.ceil(totalRows / perPage);
      if (page > totalPages) {
        redirect = `?page=${totalPages}`;
        return { success, redirect };
      }

      const sql = `SELECT * FROM \`reservation\` ${where} ORDER BY reservation_id DESC LIMIT ${(page - 1) * perPage
        },${perPage}`;
      console.log(sql);
      [rows] = await db.query(sql);
      rows.forEach((el) => {
        const m = moment(el.reservation_date);
        el.reservation_date = m.isValid() ? m.format(dateFormat) : "";
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
    }
  } catch (error) {
    console.error("Error in getListData:", error);
    return { success: false, error: "Database error" };
  }
};

// 路由處理
router.get("/", async (req, res) => {
  try {
    res.locals.title = "線上預約表單 | " + res.locals.title;
    res.locals.pageName = "reservation_form";
    const data = await getListData(req);
    if (data.redirect) {
      return res.redirect(data.redirect);
    }
    if (data.success) {
      res.json(data);
    }
  } catch (error) {
    console.error("Error in root route:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }

});

router.get("/api", async (req, res) => {
  try {
    const data = await getListData(req);
    res.json(data);
  } catch (error) {
    console.error("Error in single reservation api route:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.get("/add", async (req, res) => {
  try {
    res.locals.title = "新增線上訂購契約 | " + res.locals.title;
    res.locals.pageName = "reservation_add";
    res.json("reservation/add", data);
  } catch (error) {
    console.error("Error fetching reservation/add:", error);
    res.status(500).json({ success: false, error: "無法獲取預約資料" });
  }
});


// 將資料帶進資料庫儲存
router.post("/add", async (req, res) => {
  try {
    let { b2c_name, reservation_date, note } = req.body;

    // 使用前端發送的日期，如果沒有則使用當前日期
    reservation_date = reservation_date || new Date();

    // 格式化日期
    const m = moment(reservation_date);
    reservation_date = m.isValid() ? m.format(dateFormat) : null;

    // 先查詢用戶ID
    const [user] = await db.query(
      "SELECT b2c_id FROM b2c_members WHERE b2c_name = ?",
      [b2c_name]
    );

    if (user.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const b2c_id = user[0].b2c_id;

    // 插入預約記錄
    const sql =
      "INSERT INTO reservation (reservation_date, note, fk_b2c_id) VALUES (?, ?, ?)";
    const [result] = await db.query(sql, [reservation_date, note, b2c_id]);

    res.json({
      result,
      success: !!result.affectedRows,
    });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});




//   router.post("/reservation/:b2c_id", (req, res)=>{
//     try {
//   const b2c_id = req.params.b2c_id;
//   const [rows] = await db.query(
//     `SELECT *
//       FROM reservation 
//       LEFT JOIN reservation ON reservation_id 
//       WHERE fk_b2c_id = ?
//       ORDER BY reservation_id DESC`,
//     [b2c_id]
//   );

//   if (rows.length === 0) {
//     return res.status(404).json({
//       success: false,
//       error: "No purchase records found for this user",
//     });
//   }

//   res.json({ success: true, data: rows });
// } catch (error) {
//   console.error("Error fetching purchase records:", error);
//   res.status(500).json({ success: false, error: "Server error" });
// }
//   })




export default router;
