import express from "express";
import cors from "cors";
import db from "./../utils/connect-mysql.js";

const router = express.Router();

// 添加 CORS
router.use(cors());

//處理分頁和關鍵字搜索。
//從資料庫獲取專案列表，分頁和搜索功能。
const getListData = async (req) => {
  try {
    let success = false;

    const perPage = 20; // 每頁最多有幾筆資料
    let page = parseInt(req.query.page) || 1; // 從 query string 獲得 page 的值
    if (page < 1) {
      return { redirect: "?page=1" }; // 返回重定向對象
    }

    let keyword = req.query.keyword || "";
    let where = "";
    if (keyword) {
      const keyword_ = db.escape(`%${keyword}%`);
      where = `WHERE \`project_name\` LIKE ${keyword_}`;
    }

    const t_sql = `SELECT COUNT(1) totalRows FROM project ${where}`;
    const [[{ totalRows }]] = await db.query(t_sql);

    let totalPages = 0; // 總頁數, 預設值
    let rows = []; // 分頁資料
    if (totalRows) {
      totalPages = Math.ceil(totalRows / perPage);
      if (page > totalPages) {
        return { redirect: `?page=${totalPages}` }; // 返回重定向對象
      }
      // 取得分頁資料
      const sql = `SELECT * FROM \`project\`${where} LIMIT ${(page - 1) * perPage
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

//使用 getListData 函數獲取project列表。處理分頁重定向。
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

//獲取所有project資料。
router.get("/project", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM project ORDER BY project_id");
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error("Error fetching project:", error);
    res.status(500).json({ success: false, error: "無法獲取契約資料" });
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

// 結帳用路由, 處理訂單結帳邏輯。

router.post("/cartCheckout1", async (req, res) => {
  let connection;
  try {
    //把東西都抓出來
    const { cartItems = [], ...customerInfo } = req.body;
    console.log("Received data:", req.body);

    // 驗證買家姓名
    if (!customerInfo.buyerName) {
      return res
        .status(400)
        .json({ success: false, error: "購買人姓名是必填欄位" });
    }
    // 驗證買家電話
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
    // 將訂單資訊插入資料庫
    connection = await db.getConnection();
    await connection.beginTransaction();

    // 獲取b2c_id的訂單記錄
    let b2cId;
    if (customerInfo.buyerName) {
      const [b2cResult] = await connection.query(
        "SELECT b2c_id FROM b2c_members WHERE b2c_name = ?",
        [customerInfo.buyerName]
      );
      // 把b2cResult轉為b2cId
      b2cId = b2cResult[0]?.b2c_id;
    }

    const stateMapping = {
      0: "未付款",
      1: "已付款",
    };
    const projectMapping = {
      1: "溫馨寵物 -個別羽化",
      2: "尊榮寵物 - 個別羽化",
      3: "朋友寵物 -集體羽化",
    };
    const reverseStateMapping = {
      0: "未付款",
      1: "已付款",
    };
    const reverseProjectMapping = {
      1: "溫馨寵物 -個別羽化",
      2: "尊榮寵物 - 個別羽化",
      3: "朋友寵物 -集體羽化",
    };
    // state
    let stateId = stateMapping["已付款"];

    if (customerInfo.stateName) {
      stateId = stateMapping[customerInfo.stateName] || 0;
    }

    if (typeof stateId !== "number" || isNaN(stateId)) {
      stateId = 1;
    }
    console.log("stateId:", stateId);
    const stateText = reverseStateMapping[stateId];
    console.log("stateText:", stateText);
    // project
    let projectId = projectMapping["已付款"];

    if (customerInfo.projectName) {
      projectId = projectMapping[customerInfo.projectName] || 0;
    }

    if (typeof projectId !== "number" || isNaN(projectId)) {
      projectId = 1;
    }
    console.log("projectId:", projectId);
    const projectText = reverseProjectMapping[projectId];
    console.log("projectText:", projectText);

    let billNum = "AA00000040";
    if (customerInfo.billNumName) {
      const [billNumResult] = await connection.query(
        "SELECT billNumber FROM booking",
        [customerInfo.billNumber]
      );
      billNum = billNumResult[0]?.billNumber || 0;
    }

    // 計算總價
    const totalPrice = Array.isArray(cartItems)
      ? cartItems.reduce(
        (total, item) => total + item.project_price * item.qty,
        0
      )
      : 0;

    // 新增訂單資料表
    const [orderResult] = await connection.query(
      `INSERT INTO booking 
  (fk_b2c_id, fk_project_id, booking_state, booking_price, billNumber, booking_date) 
  VALUES (?, ?, ?, ?, ?, NOW())`,
      [customerInfo.b2cId, cartItems[0].project_id, stateId, totalPrice, billNum]
    );
    console.log("orderResult:", orderResult);

    const orderId = orderResult.insertId;

    // 新增訂單詳情
    for (const item of cartItems) {
      await connection.query(
        "INSERT INTO booking_detail (fk_booking_id, fk_project_id) VALUES (?, ?)",
        [orderId, item.project_id]
      );
    }

    // 提交表單
    await connection.commit();

    res.json({ success: true, message: "訂單已成功創建" });
  } catch (error) {

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
router.post("/booking/:b2c_id", async (req, res) => {
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
    // 如果查詢結果為空，回傳 404 錯誤和相應的訊息
    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: "No booking records found for this user",
      });
    }
    // 如果查詢結果不為空，回傳查詢到的資料
    res.json({ success: true, data: rows });
  } catch (error) {
    // 如果發生錯誤，記錄錯誤並回傳 500 錯誤和相應的訊息
    console.error("Error fetching booking records:", error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;
