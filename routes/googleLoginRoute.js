import express from 'express';
import admin from 'firebase-admin';
import db from '../utils/connect-mysql.js';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 初始化 Firebase Admin SDK 添加
const serviceAccount = {
  type: process.env.GOOGLE_TYPE,
  project_id: process.env.GOOGLE_PROJECT_ID,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
  private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'), // 处理换行符
  client_email: process.env.GOOGLE_CLIENT_EMAIL,
  client_id: process.env.GOOGLE_CLIENT_ID,
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: `https://www.googleapis.com/robot/v1/metadata/x509/${process.env.GOOGLE_CLIENT_EMAIL}`
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const router = express.Router();

// Google 登入路由
router.post('/api/google-login', async (req, res) => {
  try {
    const idToken = req.headers.authorization.split(' ')[1];
    
    // 驗證 ID Token
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { uid, email, name, picture } = decodedToken;

    // 檢查用戶是否已存在於資料庫
    const [rows] = await db.query('SELECT b2c_id, b2c_name FROM b2c_members WHERE b2c_email = ?', [email]);

    if (rows.length > 0) {
      // 用戶已存在，只更新不變的信息（如 Google ID）
      const sql = 'UPDATE b2c_members SET google_id = ? WHERE b2c_email = ?';
      await db.query(sql, [uid, email]);
      const user = rows[0]; // 獲取用戶資料
      res.json({ success: true, b2c_id: user.b2c_id, b2c_name: user.b2c_name, b2c_email: email });
    } else {
      // 用戶不存在，創建新用戶
      const sql = 'INSERT INTO b2c_members (google_id, b2c_email, b2c_name, b2c_avatar) VALUES (?, ?, ?, ?)';
      await db.query(sql, [uid, email, name, picture]);
      
      // 獲取插入後的用戶資料
      const [newUserRows] = await db.query('SELECT b2c_id, b2c_name FROM b2c_members WHERE b2c_email = ?', [email]);
      const newUser = newUserRows[0];
      
      res.json({ success: true, b2c_id: newUser.b2c_id, b2c_name: newUser.b2c_name, b2c_email: email });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: '伺服器錯誤' });
  }
});

export default router;
