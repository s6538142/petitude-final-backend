// console.log(process.env.DB_HOST);
// console.log(process.env.DB_USER);

import jwt from "jsonwebtoken";
import express from "express";
import multer from "multer";
import upload from "./utils/upload-imgs.js";
import session from "express-session";
import moment from "moment-timezone";
import db from "./utils/connect-mysql.js";
import mysql_session from "express-mysql-session";
import bcrypt from "bcrypt";
import classRouter from "./routes/class.js";
import articleRouter from "./routes/article.js";
import messageRouter from "./routes/message.js";
import favoriteRouter from "./routes/favorite.js";
import cors from "cors";
import bkRouter from "./routes/booking.js";
import prRouter from "./routes/product.js";
import paymentRouter from "./routes/ecpay.js";
import insurancePayment from "./routes/ecpayJ.js";
import pjRouter from "./routes/project.js";
import rvRouter from "./routes/reservation.js";
import paymentRouter1 from "./routes/ecpay1.js";
import memberRouter from "./routes/b2c_member.js";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
import insuranceRouter from "./routes/insurance.js";

// tmp_uploads 暫存的資料夾
// const upload = multer({ dest: "tmp_uploads/" }); // 初始化 Multer 以將上傳的檔案暫存到 tmp_uploads 資料夾

const app = express(); // 創建 Express 應用實例

app.set("view engine", "ejs"); // 設定模板引擎為 EJS

// 只會解析 application/x-www-form-urlencoded 格式的請求
app.use(express.urlencoded({ extended: true }));

// 只會解析 application/json 格式的請求
app.use(express.json());

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const corsOptions = {
  credentials: true,
  origin: (origin, cb) => {
    // console.log({ origin });
    cb(null, true); // 設定 CORS 選項，允許所有來源
  },
};

// TEST
// const corsOptions = {
//   origin: [
//     '*',
//   ],
//   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
//   allowedHeaders: ['Content-Type', 'Authorization'],
// };

app.use(cors(corsOptions)); // 使用 CORS 中介軟體

const MysqlStore = mysql_session(session); // 創建 MySQL session 存儲
const sessionStore = new MysqlStore({}, db); // 使用資料庫作為 session 存儲

app.use(
  session({
    saveUninitialized: false, // 不要保存未初始化的 session
    resave: false, // 只有在修改後才保存 session
    secret: "dkfgdlkg8496749KHJKHLd", // 用於簽名 session ID 的密鑰
    store: sessionStore, // 指定 session 存儲
  })
);

// 自訂頂層的 middleware
app.use((req, res, next) => {
  res.locals.title = "小新的網站";
  res.locals.session = req.session;

  const auth = req.get("Authorization");
  if (auth && auth.indexOf("Bearer ") === 0) {
    const token = auth.slice(7); // 提取 token

    try {
      req.my_jwt = jwt.verify(token, process.env.JWT_KEY); // 驗證 token 並存入 req.my_jwt
    } catch (ex) {}
  }

  next(); // 進入下一個 middleware
});

// routes
// 設定路由，根路由只允許 GET 請求
app.get("/", (req, res) => {
  res.locals.title = "首頁 | " + res.locals.title;
  res.render("home", { name: "Shinder" });
});

app.use("/b2c_member", memberRouter);

app.get("/try-qs", (req, res) => {
  res.json(req.query);
});

app.get("/try-post-form", (req, res) => {
  res.render("try-post-form");
});

// const urlencodedParser = express.urlencoded({extended: true});
app.post("/try-post-form", (req, res) => {
  res.render("try-post-form", req.body);
});

app.post("/try-post", (req, res) => {
  res.json(req.body);
});

app.post("/try-upload", upload.single("avatar"), (req, res) => {
  res.json({
    body: req.body,
    file: req.file,
  });
});

app.post("/try-uploads", upload.array("photos"), (req, res) => {
  res.json(req.files);
});

// 嚴謹的路徑規則
app.get("/my-params1/my", (req, res) => {
  res.json("/my-params1/my"); // 返回指定路徑的 JSON 響應
});

// 寬鬆的路徑規則
app.get("/my-params1/:action?/:id?", (req, res) => {
  res.json(req.params); // 返回路由參數
});

app.get("/products/:pid", (req, res) => {
  res.json(req.params.pid);
});

// 獲取契約 ID
app.get("/project/:project_id", (req, res) => {
  res.json(req.params.project_id); // 返回契約 ID
});

// 正則表達式路由
app.get(/^\/m\/09\d{2}-?\d{3}-?\d{3}$/i, (req, res) => {
  let u = req.url.slice(3); // 獲取路徑參數
  u = u.split("?")[0]; // 移除查詢字串
  u = u.split("-").join(""); // 移除 '-' 字符
  res.json({ u }); // 返回處理後的路徑參數
});

app.get("/try-sess", (req, res) => {
  // 要有 session 的 middleware 才有 req.session
  req.session.myNum ||= 0; // 如果為 falsy，則設定為 0
  req.session.myNum++; // 增加計數
  res.json(req.session); // 返回 session 數據
});

app.get("/try-moment", (req, res) => {
  const fm = "YYYY-MM-DD HH:mm:ss"; // 設定日期格式
  const m1 = moment(); // 獲取當前時間的 moment 物件
  const m2 = moment(new Date()); // 獲取當前時間的 moment 物件
  const m3 = moment("2023-10-25"); // 創建指定日期的 moment 物件

  res.json({
    m1a: m1.format(fm), // 返回格式化的當前時間
    m1b: m1.tz("Europe/London").format(fm), // 返回倫敦時區的當前時間
    m2a: m2.format(fm), // 返回格式化的當前時間
    m2b: m2.tz("Europe/London").format(fm), // 返回倫敦時區的當前時間
    m3a: m3.format(fm), // 返回格式化的指定日期
    m3b: m3.tz("Europe/London").format(fm), // 返回倫敦時區的指定日期
  });
});

app.get("/try-moment2", (req, res) => {
  const fm = "YYYY-MM-DD HH:mm:ss"; // 設定日期格式
  const m1 = moment("2024-02-29"); // 創建指定日期的 moment 物件
  const m2 = moment("2024-05-35"); // 創建不合法的日期
  const m3 = moment("2023-02-29"); // 創建不合法的日期

  res.json([
    m1.format(fm), // 返回格式化的日期
    m1.isValid(), // 檢查日期是否有效
    m2.format(fm), // 返回不合法日期的格式化結果
    m2.isValid(), // 檢查不合法日期是否有效
    m3.format(fm), // 返回不合法日期的格式化結果
    m3.isValid(), // 檢查不合法日期是否有效
  ]);
});

app.get("/try-db", async (req, res) => {
  const sql = "SELECT * FROM address_book LIMIT 3";

  const [results, fields] = await db.query(sql);
  res.json({ results, fields });
});

app.get("/logout", (req, res) => {
  delete req.session.admin; // 刪除 session 中的 admin 資訊
  res.redirect("/"); // 重新導向至首頁
});

app.post("/login-jwt", async (req, res) => {
  const output = {
    success: false,
    code: 0,
    body: req.body,
    data: {
      b2c_id: 0,
      b2c_email: "",
      b2c_name: "",
      token: "",
    },
  };

  const sql = "SELECT * FROM b2c_members WHERE b2c_email=?";
  const [rows] = await db.query(sql, [req.body.b2c_email]);

  if (!rows.length) {
    // 帳號是錯的
    output.code = 400;
    return res.json(output);
  }

  const result = await bcrypt.compare(
    req.body.b2c_password,
    rows[0].b2c_password
  );
  if (!result) {
    // 密碼是錯的
    output.code = 420;
    return res.json(output);
  }
  output.success = true;

  // 沒有要記錄登入狀態, 打包 JWT
  const payload = {
    b2c_id: rows[0].b2c_id,
    b2c_email: rows[0].b2c_email,
  };

  const token = jwt.sign(payload, process.env.JWT_KEY);

  output.data = {
    b2c_id: rows[0].b2c_id,
    b2c_email: rows[0].b2c_email,
    b2c_name: rows[0].b2c_name,
    token,
    // role: "admin"
  };

  res.json(output);
});

app.get("/jwt-data", (req, res) => {
  res.json(req.my_jwt);
});

// 商城路由開始
app.use("/product", prRouter);
app.use("/ecpay", paymentRouter);

// 商城路由結束

// 寵物保險路由開始
app.use("/insurance", insuranceRouter);
app.use("/ecpayJ", insurancePayment);
app.get("/test", (req, res) => {
  res.json({ message: "Server is running" });
});
// 寵物保險路由結束

// 生命禮儀路由開始
app.use("/project", pjRouter);
app.use("/reservation", rvRouter);
app.use("/booking", bkRouter);
app.use("/ecpay1", paymentRouter1);

// 生命禮儀路由結束

//論壇路由開始
app.use("/class", classRouter);
app.use("/article", articleRouter);
app.use("/message", messageRouter);
app.use("/favorite", favoriteRouter);
//論壇路由結束

// ************
// 設定靜態內容資料夾
app.use(express.static("public")); // 設定 public 為靜態資源資料夾
app.use("/bootstrap", express.static("node_modules/bootstrap/dist")); // 設定 Bootstrap 靜態資源路徑

// ************ 404 處理要放在所有的路由設定之後
// use 接受所有 HTTP 方法
app.use((req, res) => {
  res.type("text/plain").status(404).send("走錯路了");
});

const port = process.env.WEB_PORT || 3002;
app.listen(port, () => {
  console.log(`Server start: port ${port}`);
});
