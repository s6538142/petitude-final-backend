import express from "express";
import cors from "cors";
import db from "./../utils/connect-mysql.js";

const router = express.Router();

// 添加 CORS 
router.use(cors());

const getListData = async (req) => {
  try {
    let success = false;
    let rows = [];

    const t_sql = `SELECT COUNT(1) totalRows FROM project`;
    const [[{ totalRows }]] = await db.query(t_sql);

    // 取得分頁資料
    const sql = `SELECT * FROM project`;
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
    res.locals.title = "契約列表" + res.locals.title;
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

router.get("/api/:project_id", async (req, res) => {
  try {
    const project_id = +req.params.project_id || 0;
    if (!project_id) {
      return res.status(400).json({ success: false, error: "沒有編號" });
    }

    const sql = `SELECT * FROM project WHERE project_id=?`;
    const [rows] = await db.query(sql, [project_id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, error: "沒有該筆資料" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error in single project route:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});
// ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// 獲取所有縣市
router.get("/counties", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM county ORDER BY county_id");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching counties:', error);
    res.status(500).json({ success: false, error: "無法獲取縣市資料" });
  }
});

// 獲取特定縣市的所有鄉鎮市區
router.get("/cities/:countyId", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM city WHERE fk_county_id = ? ORDER BY city_id",
      [req.params.countyId]
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Error fetching cities:', error);
    res.status(500).json({ success: false, error: "無法獲取鄉鎮市區資料", details: error.message });
  }
});

// 結帳用路由

router.post("/cartCheckout1", async (req, res) => {
  let connection;
  try {
    const { cartProjects, ...customerInfo } = req.body;

    // 開始處理資料庫新增
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 獲取縣市和鄉鎮市區的 ID
    const [countyResult] = await connection.query(
      "SELECT county_id FROM county WHERE county_name = ?",
      [customerInfo.county]
    );
    const countyId = countyResult[0]?.county_id;

    const [cityResult] = await connection.query(
      "SELECT city_id FROM city WHERE city_name = ? AND fk_county_id = ?",
      [customerInfo.city, countyId]
    );
    const cityId = cityResult[0]?.city_id;

    // 新增訂單資料表
    const [orderResult] = await connection.query(
      `INSERT INTO request 
      (b2c_name, payment_method, request_price, fk_county_id, fk_city_id, recipient_address, recipient_mobile, recipient_phone, request_date) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        customerInfo.buyerName,
        customerInfo.paymentMethod,
        cartProjects.reduce((total, items) => total + items.project_price * items.qty, 0),
        countyId,
        cityId,
        customerInfo.address,
        customerInfo.mobile,
        customerInfo.telephone
      ]
    );

    const orderId = orderResult.insertId;

    // 新增訂單詳情
    for (const items of cartProjects) {
      await connection.query(
        "INSERT INTO request_detail (fk_request_id, project_id, purchase_quantity, purchase_price) VALUES (?, ?, ?, ?)",
        [orderId, items.project_id, items.qty, items.project_price]
      );
    }

    // 提交表單
    await connection.commit();

    res.json({ success: true, message: "訂單已成功創建" });
  } catch (error) {
    // 如果出錯
    if (connection) {
      await connection.rollback();
    }
    console.error('Error in checkout:', error);
    res.status(500).json({ success: false, error: "訂單創建失敗" });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

export default router;
