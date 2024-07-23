import express from "express";
import db from "../utils/connect-mysql.js";
import cors from 'cors'



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

  // 建立新的保單
router.post('/save-insurance-order', async (req, res) => {
    try {
      const insuranceData = req.body;
      const sql = `
      INSERT INTO insurance_order (
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
        // 查詢該用戶最新的訂單 ID
        const [latestOrder] = await db.query(
          'SELECT insurance_order_id FROM insurance_order WHERE fk_b2c_id = ? ORDER BY insurance_order_id DESC LIMIT 1',
          [insuranceData.fk_b2c_id]
        );
  
        console.log('Latest order query result:', latestOrder); // 添加這行
  
        if (latestOrder && latestOrder.length > 0) {
          res.status(200).json({ 
            success: true,
            message: '保險訂單保存成功',
            latestOrderId: latestOrder[0].insurance_order_id
          });
        } else {
          throw new Error('無法獲取最新訂單ID');
        }
      } else {
        throw new Error('保存保險訂單失敗');
      }
    } catch (error) {
      console.error('保存保險訂單失敗:', error);
      res.status(500).json({ 
        success: false,
        error: '保存失敗，請稍後再試', 
        details: error.message 
      });
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






//測試用
router.post('/test', (req, res) => {
  res.json({ message: 'Server is running' });
});
  
  export default router;
  