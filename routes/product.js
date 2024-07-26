import express from "express";
import cors from "cors";
import db from "./../utils/connect-mysql.js";
// import { consumers } from "nodemailer/lib/xoauth2/index.js";

const router = express.Router();

// 添加 CORS 中間件
router.use(cors());

const getListData = async (req) => {
  try {
    let success = false;

    const perPage = 20; // 每頁最多有幾筆資料
    let page = parseInt(req.query.page) || 1; // 從 query string 獲得 page 的值
    if (page < 1) {
      return { redirect: "?page=1" }; // 返回重定向對象
    }

    let keyword = req.query.keyword || "";
    let category = req.query.category || "";
    let where = "";

    if (keyword) {
      const keyword_ = db.escape(`%${keyword}%`);
      where = `WHERE \`product_name\` LIKE ${keyword_}`;
    }

    if (category) {
      where += where ? " AND " : " WHERE ";
      switch (category) {
        case "all":
          where = "";
          break;
        case "dog":
          where += `special_needs LIKE '%犬%'`;
          break;
        case "cat":
          where += `special_needs LIKE '%貓%'`;
          break;
        case "adult":
          where += `special_needs LIKE '%成犬%' OR special_needs LIKE '%成貓%'`;
          break;
        case "young":
          where += `special_needs LIKE '%幼犬%' OR special_needs LIKE '%幼貓%'`;
          break;
      }
    }

    const t_sql = `SELECT COUNT(1) totalRows FROM product ${where}`;
    const [[{ totalRows }]] = await db.query(t_sql);

    let totalPages = 0; // 總頁數, 預設值
    let rows = []; // 分頁資料
    if (totalRows) {
      totalPages = Math.ceil(totalRows / perPage);
      if (page > totalPages) {
        return { redirect: `?page=${totalPages}` }; // 返回重定向對象
      }
      // 取得分頁資料
      const sql = `SELECT * FROM \`product\`${where} LIMIT ${
        (page - 1) * perPage
      },${perPage}`;
      [rows] = await db.query(sql);
    }

    success = true;

    return {
      success,
      perPage,
      page,
      totalPages,
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
    res.locals.title = "商品列表" + res.locals.title;
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

router.get("/api/:pk_product_id", async (req, res) => {
  try {
    const pk_product_id = +req.params.pk_product_id || 0;
    if (!pk_product_id) {
      return res.status(400).json({ success: false, error: "沒有編號" });
    }

    const sql = `SELECT * FROM product WHERE pk_product_id=?`;
    const [rows] = await db.query(sql, [pk_product_id]);

    if (!rows.length) {
      return res.status(404).json({ success: false, error: "沒有該筆資料" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error in single product route:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

// 獲取所有縣市
router.get("/counties", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM county ORDER BY county_id");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching counties:", error);
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
    console.error("Error fetching cities:", error);
    res.status(500).json({
      success: false,
      error: "無法獲取鄉鎮市區資料",
      details: error.message,
    });
  }
});

// 收藏用路由
router.post("/checkFavorite", async (req, res) => {
  try {
    const { fk_b2c_id, fk_product_id } = req.body;

    if (!fk_product_id || !fk_b2c_id) {
      return res.status(400).json({ success: false, message: "缺少必要參數" });
    }

    // 檢查商品是否存在
    const [product] = await db.query(
      "SELECT * FROM product WHERE pk_product_id = ?",
      [fk_product_id]
    );

    if (product.length === 0) {
      return res.status(404).json({ success: false, message: "商品不存在" });
    }

    // 檢查用戶是否存在
    const [user] = await db.query(
      "SELECT * FROM b2c_members WHERE b2c_id = ?",
      [fk_b2c_id]
    );

    if (user.length === 0) {
      return res.status(404).json({ success: false, message: "用戶不存在" });
    }

    // 檢查是否已經收藏過
    const [existing] = await db.query(
      "SELECT * FROM product_favorite WHERE fk_b2c_id = ? AND fk_product_id = ?",
      [fk_b2c_id, fk_product_id]
    );

    const isFavorite = existing.length > 0;

    res.json({ success: true, isFavorite });
  } catch (error) {
    console.error("Error checking favorite:", error);
    res.status(500).json({
      success: false,
      message: "檢查收藏狀態失敗",
      error: error.message,
    });
  }
});

router.post("/addFavorite", async (req, res) => {
  try {
    const { fk_b2c_id, fk_product_id } = req.body;

    if (!fk_product_id || !fk_b2c_id) {
      return res.status(400).json({ success: false, message: "缺少必要參數" });
    }

    // 檢查商品是否存在
    const [product] = await db.query(
      "SELECT * FROM product WHERE pk_product_id = ?",
      [fk_product_id]
    );

    if (product.length === 0) {
      return res.status(404).json({ success: false, message: "商品不存在" });
    }

    // 檢查用戶是否存在
    const [user] = await db.query(
      "SELECT * FROM b2c_members WHERE b2c_id = ?",
      [fk_b2c_id]
    );

    if (user.length === 0) {
      return res.status(404).json({ success: false, message: "用戶不存在" });
    }

    // 檢查是否已經收藏過
    const [existing] = await db.query(
      "SELECT * FROM product_favorite WHERE fk_b2c_id = ? AND fk_product_id = ? ",
      [fk_b2c_id, fk_product_id]
    );

    if (existing.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: "已經收藏過此商品" });
    }

    // 插入新的收藏記錄
    await db.query(
      "INSERT INTO product_favorite (fk_b2c_id, fk_product_id) VALUES (?, ?)",
      [fk_b2c_id, fk_product_id]
    );

    res.json({ success: true, message: "成功加入收藏" });
  } catch (error) {
    console.error("Error adding favorite:", error);
    res
      .status(500)
      .json({ success: false, message: "加入收藏失敗", error: error.message });
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

// 結帳用路由
router.post("/cartCheckout", async (req, res) => {
  let connection;
  try {
    const { cartItems = [], ...customerInfo } = req.body;
    console.log("Received data:", req.body);

    // 驗證必要的欄位
    if (!customerInfo.buyerName) {
      return res
        .status(400)
        .json({ success: false, error: "購買人姓名是必填欄位" });
    }

    if (!customerInfo.mobile) {
      return res
        .status(400)
        .json({ success: false, error: "手機號碼是必填欄位" });
    }

    // 確保 cartItems 是一個數組
    if (!Array.isArray(cartItems)) {
      return res
        .status(400)
        .json({ success: false, error: "Invalid cart items" });
    }

    // 開始處理資料庫新增
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 獲取會員的 ID
    let b2cId;
    if (customerInfo.buyerName) {
      const [b2cResult] = await connection.query(
        "SELECT b2c_id FROM b2c_members WHERE b2c_name = ?",
        [customerInfo.buyerName]
      );
      b2cId = b2cResult[0]?.b2c_id;
    }

    // 獲取縣市和鄉鎮市區的 ID
    let countyId, cityId;
    if (customerInfo.county) {
      const [countyResult] = await connection.query(
        "SELECT county_id FROM county WHERE county_name = ?",
        [customerInfo.county]
      );
      countyId = countyResult[0]?.county_id;
    }

    if (customerInfo.city && countyId) {
      const [cityResult] = await connection.query(
        "SELECT city_id FROM city WHERE city_name = ? AND fk_county_id = ?",
        [customerInfo.city, countyId]
      );
      cityId = cityResult[0]?.city_id;
    }

    // 計算總價
    const totalPrice = Array.isArray(cartItems)
      ? cartItems.reduce(
          (total, item) => total + item.product_price * item.qty,
          0
        )
      : 0;

    // 新增訂單資料表
    const [orderResult] = await connection.query(
      `INSERT INTO request 
      (fk_b2c_id, request_price, fk_county_id, fk_city_id, recipient_address, recipient_mobile, recipient_phone, request_date) 
      VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        b2cId,
        totalPrice,
        countyId,
        cityId,
        customerInfo.address,
        customerInfo.mobile,
        customerInfo.telephone,
      ]
    );

    const orderId = orderResult.insertId;

    // 新增訂單詳情
    for (const item of cartItems) {
      await connection.query(
        "INSERT INTO request_detail (fk_request_id, fk_product_id, purchase_quantity, purchase_price) VALUES (?, ?, ?, ?)",
        [orderId, item.pk_product_id, item.qty, item.product_price]
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
    console.error("Error in checkout:", error);
    res
      .status(500)
      .json({ success: false, error: "訂單創建失敗", details: error.message });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// 抓取會員購買紀錄
router.post("/request/:b2c_id", async (req, res) => {
  try {
    const b2c_id = req.params.b2c_id;
    const [rows] = await db.query(
      `SELECT r.*, rd.*
        FROM request r
        LEFT JOIN request_detail rd ON r.request_id = rd.fk_request_id
        WHERE r.fk_b2c_id = ?
        ORDER BY r.request_date DESC`,
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
