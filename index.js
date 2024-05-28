// console.log(process.env.DB_HOST);
// console.log(process.env.DB_USER);

import express from "express";
import multer from "multer";
import upload from "./utils/upload-imgs.js";
import admin2Router from "./routes/admin2.js";
import session from "express-session";
import moment from "moment-timezone";
import db from "./utils/connect-mysql.js";

// tmp_uploads 暫存的資料夾
// const upload = multer({ dest: "tmp_uploads/" });

const app = express();

app.set("view engine", "ejs");

// 只會解析 application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// 只會解析 application/json
app.use(express.json());

app.use(
  session({
    saveUninitialized: false,
    resave: false,
    secret: "dkfgdlkg8496749KHJKHLd",
    /*
    cookie: {
      maxAge: 1800_000
    }
    */
  })
);

// 自訂頂層的 middleware
app.use((req, res, next) => {
  res.locals.title = "小新的網頁";

  next();
});

// routes
// 設定路由, 只允許用 GET 拜訪
app.get("/", (req, res) => {
  res.locals.title = "首頁 | " + res.locals.title;
  res.render("home", { name: "Shinder" });
});

app.get("/json-sales", (req, res) => {
  const sales = [
    {
      name: "Bill",
      age: 28,
      id: "A001",
    },
    {
      name: "Peter",
      age: 32,
      id: "A002",
    },
    {
      name: "Carl",
      age: 29,
      id: "A003",
    },
  ];
  res.render("json-sales", { sales });
});

app.get("/try-qs", (req, res) => {
  res.json(req.query); // 查看 query string
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
  res.json("/my-params1/my");
});
// 寛鬆的路徑規則
app.get("/my-params1/:action?/:id?", (req, res) => {
  res.json(req.params);
});

app.get("/products/:pid", (req, res) => {
  res.json(req.params.pid);
});

app.get(/^\/m\/09\d{2}-?\d{3}-?\d{3}$/i, (req, res) => {
  let u = req.url.slice(3);
  u = u.split("?")[0];
  u = u.split("-").join("");
  res.json({ u });
});
app.use("/admin2", admin2Router);

app.get("/try-sess", (req, res) => {
  // 要有 session 的 middleware 才有 req.session

  // req.session.myNum = req.session.myNum || 1;
  req.session.myNum ||= 0; // 如果 falsy 就設定為 0
  req.session.myNum++;
  res.json(req.session);
});

app.get("/try-moment", (req, res) => {
  const fm = "YYYY-MM-DD HH:mm:ss";
  const m1 = moment(); // 當下時間的 moment 物件
  const m2 = moment(new Date()); // 當下時間的 moment 物件
  const m3 = moment("2023-10-25");

  res.json({
    m1a: m1.format(fm),
    m1b: m1.tz("Europe/London").format(fm),
    m2a: m2.format(fm),
    m2b: m2.tz("Europe/London").format(fm),
    m3a: m3.format(fm),
    m3b: m3.tz("Europe/London").format(fm),
  });
});
app.get("/try-moment2", (req, res) => {
  const fm = "YYYY-MM-DD HH:mm:ss";
  const m1 = moment("2024-02-29");
  const m2 = moment("2024-05-35");
  const m3 = moment("2023-02-29");

  res.json([
    m1.format(fm),
    m1.isValid(),
    m2.format(fm),
    m2.isValid(),
    m3.format(fm),
    m3.isValid(),
  ]);
});

app.get("/try-db", async (req, res) => {
  const sql = "SELECT * FROM address_book LIMIT 3";

  const [results, fields] = await db.query(sql);
  res.json({results, fields});
});

// ************
// 設定靜態內容資料夾
app.use(express.static("public"));
app.use("/bootstrap", express.static("node_modules/bootstrap/dist"));

// ************ 404 要放在所有的路由設定之後
// use 接受所有 HTTP 方法
app.use((req, res) => {
  res.type("text/plain").status(404).send("走錯路了");
});

const port = process.env.WEB_PORT || 3002;
app.listen(port, () => {
  console.log(`Server start: port ${port}`);
});
