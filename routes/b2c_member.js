import express from "express";
import moment from "moment-timezone";
import db from "../utils/connect-mysql.js";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendResetPasswordEmail } from '../utils/send-email.js';

const dateFormat = "YYYY-MM-DD";
const router = express.Router();

const formatDate = (date) => moment(date).format(dateFormat);

router.get("/api", async (req, res) => {
  const data = await getListData(req);
  res.json(data);
});

// 處理註冊會員
router.post("/add", async (req, res) => {
  let body = { ...req.body };

  try {
    // 检查信箱是否已存在
    const [emailRows] = await db.query("SELECT 1 FROM b2c_members WHERE b2c_email = ?", [body.b2c_email]);
    if (emailRows.length > 0) {
      return res.status(400).json({ success: false, error: "信箱已被使用" });
    }

    // 检查手機是否已存在
    const [mobileRows] = await db.query("SELECT 1 FROM b2c_members WHERE b2c_mobile = ?", [body.b2c_mobile]);
    if (mobileRows.length > 0) {
      return res.status(400).json({ success: false, error: "手機號碼已被使用" });
    }

    // 加密密码
    const saltRounds = 8;
    body.b2c_password = await bcrypt.hash(body.b2c_password, saltRounds);

    const sql = "INSERT INTO b2c_members SET ?";
    const [result] = await db.query(sql, [body]);

    res.json({
      result,
      success: !!result.affectedRows,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "服务器错误" });
  }
});

// 取得會員資料
router.get("/api/:b2c_id", async (req, res) => {
  const b2c_id = +req.params.b2c_id || 0;
  if (!b2c_id) {
    return res.json({ success: false, error: "沒有編號" });
  }

  const sql = `SELECT * FROM b2c_members WHERE b2c_id=${b2c_id}`;
  const [rows] = await db.query(sql);
  if (!rows.length) {
    return res.json({ success: false, error: "沒有該筆資料" });
  }

  const row = rows[0];

  res.json({ success: true, data: row });
});

// 更新 PUT 請求處理函數
router.put("/api/:b2c_id", async (req, res) => {
  const output = {
    success: false,
    code: 0,
    result: {},
  };

  const b2c_id = +req.params.b2c_id || 0;
  if (!b2c_id) {
    return res.json(output);
  }

  let body = { ...req.body };
  const m = moment(body.b2c_birth);
  body.b2c_birth = m.isValid() ? m.format(dateFormat) : null;

  try {
    // 如果提供了新的密碼，則加密
    if (body.b2c_password) {
      const saltRounds = 8;
      body.b2c_password = await bcrypt.hash(body.b2c_password, saltRounds);
    }

    const sql = "UPDATE `b2c_members` SET ? WHERE b2c_id=? ";
    const [result] = await db.query(sql, [body, b2c_id]);
    output.result = result;
    output.success = !!(result.affectedRows && result.changedRows);
  } catch (ex) {
    output.error = ex;
  }

  res.json(output);
});

// 發送重設密碼郵件
router.post('/request-password-reset', async (req, res) => {
  const { email } = req.body;

  try {
    const [rows] = await db.query('SELECT b2c_id FROM b2c_members WHERE b2c_email = ?', [email]);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: '無效的郵箱' });
    }

    const user = rows[0];
    const resetCode = crypto.randomInt(100000, 999999).toString(); // 生成六位數驗證碼
    const expireTime = moment().add(5, 'minutes').format('YYYY-MM-DD HH:mm:ss');

    // 更新數據庫中的驗證碼和過期時間
    await db.query('UPDATE b2c_members SET reset_code = ?, reset_code_expire = ? WHERE b2c_id = ?', [resetCode, expireTime, user.b2c_id]);

    // 生成郵件內容
    const emailContent = `
      <p>您的重設密碼驗證碼是 <strong>${resetCode}</strong>。</p>
      <p>請在接下來的 5 分鐘內輸入這個驗證碼。</p>
    `;
    await sendResetPasswordEmail(email, '密碼重設驗證碼', emailContent);

    res.json({ success: true, message: '驗證碼已發送到您的郵箱' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: '伺服器錯誤' });
  }
});

// 驗證碼驗證
router.post('/verify-reset-code', async (req, res) => {
  const { code } = req.body;

  try {
    const [rows] = await db.query('SELECT b2c_id, reset_code_expire FROM b2c_members WHERE reset_code = ?', [code]);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: '無效的驗證碼' });
    }

    const user = rows[0];
    if (moment().isAfter(user.reset_code_expire)) {
      return res.status(400).json({ success: false, error: '驗證碼已過期' });
    }

    res.json({ success: true, data: user.b2c_id });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: '伺服器錯誤' });
  }
});

// 處理重設密碼
router.post('/reset-password', async (req, res) => {
  const { resetCode, newPassword } = req.body;

  try {
    const [rows] = await db.query('SELECT b2c_id, reset_code_expire FROM b2c_members WHERE reset_code = ?', [resetCode]);
    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: '無效的驗證碼' });
    }

    const user = rows[0];
    if (moment().isAfter(user.reset_code_expire)) {
      return res.status(400).json({ success: false, error: '驗證碼已過期' });
    }

    const saltRounds = 8;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    await db.query('UPDATE b2c_members SET b2c_password = ?, reset_code = NULL, reset_code_expire = NULL WHERE b2c_id = ?', [hashedPassword, user.b2c_id]);

    res.json({ success: true, message: '密碼已更新' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: '伺服器錯誤' });
  }
});

// 處理大頭貼上傳
router.post('/avatar', async (req, res) => {
  const { b2c_id, b2c_avatar } = req.body;

  if (!b2c_id || !b2c_avatar) {
    return res.status(400).json({ success: false, error: '缺少必要的數據' });
  }

  try {
    // 將 Base64 字符串直接存儲在資料庫中
    await db.query('UPDATE b2c_members SET b2c_avatar = ? WHERE b2c_id = ?', [b2c_avatar, b2c_id]);

    res.json({ success: true, avatarUrl: b2c_avatar });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: '伺服器錯誤' });
  }
});

// 取得保險紀錄

router.get("/insurancerecords/:b2c_id", async (req, res) => {
  const b2c_id = +req.params.b2c_id || 0;
  if (!b2c_id) {
    return res.json({ success: false, error: "沒有編號" });
  }

  const sql = `SELECT * FROM insurance_order WHERE fk_b2c_id=${b2c_id}`;
  const [rows] = await db.query(sql);
  if (!rows.length) {
    return res.json({ success: false, error: "沒有該筆資料" });
  }

  res.json({ success: true, data: rows });
});

// 取得購物紀錄
router.get("/productrecords/:b2c_id", async (req, res) => {
  const b2c_id = +req.params.b2c_id || 0;
  if (!b2c_id) {
    return res.json({ success: false, error: "沒有編號" });
  }

  const sql = `SELECT * FROM request WHERE fk_b2c_id=${b2c_id}`;
  const [rows] = await db.query(sql);
  if (!rows.length) {
    return res.json({ success: false, error: "沒有該筆資料" });
  }

  res.json({ success: true, data: rows }); // 修改此行，返回數組 rows
});

// 取得預約紀錄
router.get("/reservationrecords/:b2c_id", async (req, res) => {
  const b2c_id = +req.params.b2c_id || 0;
  if (!b2c_id) {
    return res.json({ success: false, error: "沒有編號" });
  }

  const sql = `SELECT * FROM reservation WHERE fk_b2c_id=${b2c_id}`;
  const [rows] = await db.query(sql);
  if (!rows.length) {
    return res.json({ success: false, error: "沒有該筆資料" });
  }

  res.json({ success: true, data: rows }); 
});

//取得契約購買紀錄
router.get("/bookingrecords/:b2c_id", async (req, res) => {
  const b2c_id = +req.params.b2c_id || 0;
  if (!b2c_id) {
    return res.json({ success: false, error: "沒有編號" });
  }

  const sql = `SELECT * FROM booking WHERE fk_b2c_id=${b2c_id}`;
  const [rows] = await db.query(sql);
  if (!rows.length) {
    return res.json({ success: false, error: "沒有該筆資料" });
  }

  res.json({ success: true, data: rows });
});



// 取得訂單細項
router.get("/productrecords_detail/:request_id", async (req, res) => {
  const request_id = +req.params.request_id || 0;
  if (!request_id) {
    return res.json({ success: false, error: "沒有訂單編號" });
  }

  // 查詢訂單細節
  const sql = `
    SELECT rd.request_detail_id, rd.purchase_quantity, rd.purchase_price, p.product_name
    FROM request_detail as rd
    JOIN product as p ON rd.fk_product_id = p.pk_product_id
    WHERE rd.fk_request_id = ?
  `;

  const [rows] = await db.query(sql, [request_id]);
  if (!rows.length) {
    return res.json({ success: false, error: "沒有該訂單的細節" });
  }

  res.json({ success: true, data: rows });
});

// 獲取用戶的收藏商品
router.get('/favorite/:b2c_id', async (req, res) => {
  const b2c_id = +req.params.b2c_id || 0;
  if (!b2c_id) {
    return res.status(400).json({ success: false, error: "沒有編號" });
  }
  
  try {
    const [rows] = await db.query('SELECT * FROM product_favorite as pf JOIN product as p ON pf.fk_product_id = p.pk_product_id WHERE fk_b2c_id = ?', [b2c_id]);
    if (!rows.length) {
      return res.json({ success: false, error: "沒有收藏的商品" });
    }
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "伺服器錯誤" });
  }
});

// 刪除收藏的商品
router.delete('/favorite/delete', async (req, res) => {
  const { product_favorite_id } = req.body;
  if (!product_favorite_id) {
    return res.status(400).json({ success: false, error: "缺少收藏商品的ID" });
  }

  try {
    const [result] = await db.query('DELETE FROM product_favorite WHERE product_favorite_id = ?', [product_favorite_id]);
    if (result.affectedRows === 0) {
      return res.json({ success: false, error: "沒有該收藏商品" });
    }
    res.json({ success: true, message: '商品已從收藏中移除' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: "伺服器錯誤" });
  }
});


export default router;
