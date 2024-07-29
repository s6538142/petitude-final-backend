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
        policyholder_birthday, b2c_name, pet_name, pet_chip, insurance_product, insurance_premium, payment_status,
         pet_pic
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '未付款', ?)
    `;

    const values = [
        insuranceData.fk_b2c_id,
        insuranceData.insurance_start_date,
        insuranceData.fk_county_id,
        insuranceData.fk_city_id,
        insuranceData.policyholder_address,
        insuranceData.policyholder_mobile,
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
  
        console.log('Latest order query result:', latestOrder); 
  
        if (latestOrder && latestOrder.length > 0) {
          res.status(200).json({ 
            success: true,
            message: '保險訂單保存成功',
            OrderId: latestOrder[0].insurance_order_id            
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
        message: '保存失敗，請稍後再試',
        error: error.message 
      });
    }
  });

  // 讀取保單資料
  router.get('/read-insurance-order/:OrderId', async (req, res) => {
    try {
      const {OrderId} = req.params

      const [rows] = await db.query(
        'SELECT * FROM insurance_order WHERE insurance_order_id = ?',
        [OrderId]
      )

      if (rows.length >0) {
        res.json({success: true, data: rows[0]})
      } else {
        res.status(404).json({success: false, message:'找不到該訂單' })
      }
    } catch (error) {
      console.error('讀取保單資料時發生錯誤:', error)
      res.status(500).json({success: false, message:'伺服器錯誤' })
    }
  })

  // PUT 更新訂單付款狀態
router.put('/update-insurance-order', async (req, res) => {
    
  let { OrderId, payment_status } = req.body;
  
    if (!OrderId || !payment_status) {
      return res.status(400).json({ message: '缺少必要參數'})
    }

    // OrderId 是字符串形式的 JSON 對象，解析它
    if (typeof OrderId === 'string' && OrderId.startsWith('{')) {
      try {
        const parsedObject = JSON.parse(OrderId);
        OrderId = parsedObject.OrderId;
      } catch (error) {
        console.error('解析 OrderId 時出錯:', error);
        return res.status(400).json({ message: 'OrderId 格式不正確' });
      }
    }

    // 確保 OrderId 是數字
    const parsedOrderId = parseInt(OrderId, 10);
    if (isNaN(parsedOrderId)) {
      return res.status(400).json({ message: 'OrderId 必須是有效的數字' });
    }
  
    try {
      const [result] = await db.query(
        'UPDATE insurance_order SET payment_status = ? WHERE insurance_order_id = ?',
        [payment_status, parsedOrderId] 
      );

      if (result.affectedRows >0){  
      res.json({ message: '訂單支付狀態更新成功' });
    } else {
      res.status(404).json({ message: '未找到指定的訂單' });
    } 
  } catch (error) {
      console.error('更新訂單支付狀態失敗:', error);
      res.status(500).json({ message: '更新訂單支付狀態時發生錯誤', error: error.message,
        stack: error.stack });
    }
  });

  // 刪除未付款的訂單
  router.delete('/delete-insurance-order', async (req, res) =>{

    const { insurance_order_id} = req.body  //從請求主體中獲得訂單號碼
    
    if (!insurance_order_id) {
      console.log('Missing insurance_order_id');
      return res.status(400).json({
        status: 'error',
        message: '缺少必要的 insurance_order_id'
      });
    }

    try {
      const order = await db.query(
      'SELECT * FROM insurance_order WHERE insurance_order_id = ?',
      [insurance_order_id]
      )

      if (!order) {
        console.log('Order not found');
        return res.status(404).json({
          status: 'error',
          message: '找不到該訂單'
        });
      }

      if (order[0][0].payment_status.trim() === "未付款") {
      const result = await db.query (
        'DELETE FROM insurance_order WHERE insurance_order_id = ?',
        [insurance_order_id]
      )
      console.log('Delete result:', result);
      res.json({
        status: 'success',
        message: '該保單已成功刪除'
      })
    } else {
      res.status(400).json({
      status: 'error',
      message: '該訂單已付款，支付狀態為: ' + order[0][0].payment_status
    })
  } } catch (error) {
    console.error('刪除訂單時發生錯誤:', error)
    res.status(500).json({
      status: 'error',
      message: '刪除訂單時發生錯誤'
    })
  }
  })






//測試用
router.post('/test', (req, res) => {
  res.json({ message: 'Server is running' });
});
  
  export default router;
  