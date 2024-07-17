import express from "express";
import session from "express-session";
import cors from "cors";
import db from "./utils/connect-mysql.js";
import mysql_session from "express-mysql-session";

const app = express();

// 只解析 application/json 格式的請求
app.use(express.json());

// 設置 CORS
const corsOptions = {
  credentials: true,
  origin: (origin, cb) => {
    cb(null, true);
  },
};
app.use(cors(corsOptions));


const MysqlStore = mysql_session(session);
const sessionStore = new MysqlStore({}, db);

// 使用 session 中介軟體
app.use(
  session({
    saveUninitialized: false,
    resave: false,
    secret: "cfvhjbnklmkl,", 
    store: sessionStore,
  })
);

// 獲取推薦方案的 API 路由
app.get("/api/RecommendationModal", async (req, res) => {
  const { project_name } = req.query;

  try {
    const recommendation = await fetchRecommendation(project_name); // 調用服務函數獲取推薦方案數據
    res.json(recommendation);
  } catch (error) {
    console.error("Error fetching recommendation:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// 錯誤處理和端口監聽
const port = process.env.WEB_PORT || 3002;
app.listen(port, () => {
  console.log(`Server start: port ${port}`);
});
