import express from "express";
import cors from "cors";
import db from "./../utils/connect-mysql.js";

const router = express.Router();

// 添加 CORS 中間件
router.use(cors());

const getListData = async (req) => {
  try {
    let success = false;
    let rows = [];

    const t_sql = `SELECT COUNT(1) totalRows FROM booking`;
    const [[{ totalRows }]] = await db.query(t_sql);

    // 取得分頁資料
    const sql = `SELECT * FROM booking`;
    [rows] = await db.query(sql);

    success = true;

    return {
      success,
      totalRows,
      rows,
    };
  } catch (error) {
    console.error("Error in getListData:", error);
    return { success: false, error: "Database error" };
  }
};
router.get("/", async (req, res) => {
  try {
    res.locals.title = "訂單列表" + res.locals.title;
    res.locals.pageName = "index";
    const data = await getListData(req);
    if (data.redirect) {
      return res.redirect(data.redirect);
    }
    res.json(data);
  } catch (error) {
    console.error("Error in root route:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.get("/api/:booking_id", async (req, res) => {
  try {
    const booking_id = +req.params.booking_id || 0;
    if (!booking_id) {
      return res.status(400).json({ success: false, error: "沒有編號" });
    }

    const sql = `SELECT * FROM booking WHERE booking_id=?`;
    const [rows] = await db.query(sql, [booking_id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, error: "沒有該筆資料" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error in single booking route:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// 抓取會員資料
router.get("/user/:b2c_id", async (req, res) => {
  try {
    const b2c_id = req.params.b2c_id;
    const [rows] = await db.query(
      "SELECT * FROM b2c_members WHERE b2c_id = ?",
      [b2c_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// 抓取會員購買紀錄
router.get("/booking/:b2c_id", async (req, res) => {
  try {
    const b2c_id = req.params.b2c_id;
    const [rows] = await db.query(
      `SELECT b.*, bk.*
        FROM booking b
        LEFT JOIN booking_detail bk ON b.booking_id = bk.fk_booking_id
        WHERE b.fk_b2c_id = ?
        ORDER BY b.booking_date DESC`,
      [b2c_id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No purchase records found for this user",
      });
    }

    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching purchase records:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});


export default router;
