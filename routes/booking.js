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

export default router;
