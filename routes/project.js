import express from "express";
import cors from "cors";
import db from "./../utils/connect-mysql.js";


const router = express.Router();

// 添加 CORS
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
      const sql = `SELECT * FROM \`project\`${where} LIMIT ${
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

// 結帳用路由, 丟入資料庫的地方

router.post("/cartCheckout1", async (req, res) => {
  let connection;
  try {
    //把東西都抓出來
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

    // 獲取會員id, 用buyername去select這名字的id是多少
    let b2cId;
    if (customerInfo.buyerName) {
      const [b2cResult] = await connection.query(
        "SELECT b2c_id FROM b2c_members WHERE b2c_name = ?",
        [customerInfo.buyerName]
      );
      // 把b2cResult轉為b2cId
      b2cId = b2cResult[0]?.b2c_id;
    }

    let projectId;
    if (customerInfo.projectName) {
      const [projectResult] = await connection.query(
        "SELECT project_id FROM project WHERE fk_project_name = ?",
        [customerInfo.projectName]
      );
      projectId = projectResult[0]?.project_id;
      console.log("projectId:", projectId); 
    }

    // let stateId = null;
    // if (customerInfo.stateNumber) {
    //   const [stateResult] = await connection.query(
    //     "SELECT booking_state FROM booking",
    //     [customerInfo.stateNumber]
    //   );
    //   stateId = stateResult[0]?.booking_state || 0; // 設置預設值
    //   console.log("stateId:", stateId); 
    // }

    // let billId;
    // if (customerInfo.billNumber) {
    //   const [billResult] = await connection.query(
    //     "SELECT billNumber FROM booking",
    //     [customerInfo.billNumber]
    //   );
    //   billId = billResult[0]?.billNumber;
    //   console.log("billId:", billId); 
    // }


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
  (fk_b2c_id, fk_project_id, booking_price, booking_date) 
  VALUES (?, ?, ?, ?, ?, NOW())`,
      [
        b2cId,
        projectId,
        totalPrice,
      ]
    );
    console.log("orderResult:", orderResult); 

    const orderId = orderResult.insertId;
    console.log("orderId:", orderId); 

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

export default router;
