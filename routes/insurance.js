import express from "express";
import db from "../utils/connect-mysql.js";
import upload from "../utils/upload-imgs.js";
import cors from 'cors'

// 設定時間格式
const dateFormat = "YYYY-MM-DD";
const router = express.Router();

// 添加 CORS 
router.use(cors());

// 測試數據庫連接
async function testDbConnection() {
    try {
      const [rows] = await db.query('SELECT 1');
      console.log('數據庫連接成功');
    } catch (error) {
      console.error('數據庫連接失敗:', error);
    }
  }

  testDbConnection();

  // 檢查路由設置
  router.get('/test', (req, res) => {
    res.json({ message: 'Insurance router is working' });
  });




// 獲取縣市資料
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

  // 處理保存保險訂單的邏輯
router.post('/insurance/save-insurance-order', async (req, res) => {
    try {
      const insuranceData = req.body;
      const sql = `
      INSERT INTO insurance_orders (
        fk_b2c_id, insurance_start_date, fk_county_id, fk_city_id,  
        policyholder_address, policyholder_mobile, policyholder_email, policyholder_IDcard, 
        policyholder_birthday, b2c_name, pet_name, pet_chip, insurance_product, insurance_premium,
         pet_pic
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [
        insuranceData.fk_b2c_id,
        insuranceData.insurance_start_date,
        insuranceData.fk_county_id,
        insuranceData.fk_city_id,
        insuranceData.fk_policyholder_address,
        insuranceData.fk_policyholder_mobile,
        insuranceData.fk_policyholder_email,
        insuranceData.policyholder_IDcard,
        insuranceData.policyholder_birthday,
        insuranceData.b2c_name,
        insuranceData.pet_name,
        insuranceData.pet_chip,
        insuranceData.insurance_product,
        insuranceData.insurance_premium,
        insuranceData.pet_pic,
      ];

      const [result] = await db.query(sql, values)
      
      if (result.affectedRows > 0) {
      res.status(200).json({ message: '保險訂單保存成功' });
    } else {
        throw new Error('保存保險訂單失敗');
    }
    } catch (error) {
      console.error('保存保險訂單失敗:', error);
      res.status(500).json({ error: '保存失敗，請稍後再試', details: error.message });
    }
  });

  // PUT 更新會員資料
// app.put('/petcompany/b2c_members', async (req, res) => {
//     const { fk_policyholder_email, fk_policyholder_mobile, fk_county_id, fk_city_id, fk_policyholder_address } = req.body;
  
//     try {
//       const connection = await mysql.createConnection(dbConfig);
//       await connection.execute(
//         'UPDATE b2c_members SET fk_policyholder_email = ?, fk_policyholder_mobile = ?, fk_county_id = ?, fk_city_id = ?, fk_policyholder_address = ? WHERE id = ?',
//         [fk_policyholder_email, fk_policyholder_mobile, fk_county_id, fk_city_id, fk_policyholder_address, 1] // 假設 ID 為 1
//       );
//       await connection.end();
  
//       res.json({ message: '會員資料更新成功' });
//     } catch (error) {
//       console.error('更新會員資料失敗:', error);
//       res.status(500).json({ message: '更新會員資料時發生錯誤' });
//     }
//   });


  // 結帳用路由

// router.post("/cartCheckout", async (req, res) => {
//     let connection;
//     try {
//       const { cartItems = [], ...customerInfo } = req.body;
//       console.log("Received data:", req.body);
  
//       // 驗證必要的欄位
//       if (!customerInfo.buyerName) {
//         return res
//           .status(400)
//           .json({ success: false, error: "購買人姓名是必填欄位" });
//       }
  
//       if (!customerInfo.mobile) {
//         return res
//           .status(400)
//           .json({ success: false, error: "手機號碼是必填欄位" });
//       }
  
//       // 確保 cartItems 是一個數組
//       if (!Array.isArray(cartItems)) {
//         return res
//           .status(400)
//           .json({ success: false, error: "Invalid cart items" });
//       }
  
//       // 開始處理資料庫新增
//       connection = await db.getConnection();
//       await connection.beginTransaction();
  
//       // 獲取縣市和鄉鎮市區的 ID
//       let countyId, cityId;
//       if (customerInfo.county) {
//         const [countyResult] = await connection.query(
//           "SELECT county_id FROM county WHERE county_name = ?",
//           [customerInfo.county]
//         );
//         countyId = countyResult[0]?.county_id;
//       }
  
//       if (customerInfo.city && countyId) {
//         const [cityResult] = await connection.query(
//           "SELECT city_id FROM city WHERE city_name = ? AND fk_county_id = ?",
//           [customerInfo.city, countyId]
//         );
//         cityId = cityResult[0]?.city_id;
//       }
  
//       // 計算總價
//       const totalPrice = Array.isArray(cartItems)
//         ? cartItems.reduce(
//             (total, item) => total + item.product_price * item.qty,
//             0
//           )
//         : 0;
  
//       // 新增訂單資料表
//       const [orderResult] = await connection.query(
//         `INSERT INTO request 
//         (b2c_name, payment_method, request_price, fk_county_id, fk_city_id, recipient_address, recipient_mobile, recipient_phone, request_date) 
//         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
//         [
//           customerInfo.buyerName,
//           customerInfo.paymentMethod,
//           totalPrice,
//           countyId,
//           cityId,
//           customerInfo.address,
//           customerInfo.mobile,
//           customerInfo.telephone,
//         ]
//       );
  
//       const orderId = orderResult.insertId;
  
//       // 新增訂單詳情
//       for (const item of cartItems) {
//         await connection.query(
//           "INSERT INTO request_detail (fk_request_id, fk_product_id, purchase_quantity, purchase_price) VALUES (?, ?, ?, ?)",
//           [orderId, item.pk_product_id, item.qty, item.product_price]
//         );
//       }
  
//       // 提交表單
//       await connection.commit();
  
//       res.json({ success: true, message: "訂單已成功創建" });
//     } catch (error) {
//       // 如果出錯
//       if (connection) {
//         await connection.rollback();
//       }
//       console.error("Error in checkout:", error);
//       res
//         .status(500)
//         .json({ success: false, error: "訂單創建失敗", details: error.message });
//     } finally {
//       if (connection) {
//         connection.release();
//       }
//     }
//   });
  
  export default router;
  