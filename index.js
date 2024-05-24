// console.log(process.env.DB_HOST);
// console.log(process.env.DB_USER);

import express from "express";

const app = express();

// routes
// 設定路由, 只允許用 GET 拜訪
app.get("/", (req, res) => {
  res.send(`<h2>哈囉</h2>`);
});

app.get("/a.html", (req, res) => {
  res.send(`<h2>假的 a.html</h2>`);
});

// ************ 
// 設定靜態內容資料夾
app.use(express.static("public"));



// ************ 404 要放在所有的路由設定之後
// use 接受所有 HTTP 方法
app.use((req, res) => {
  res.type("text/plain").status(404).send("走錯路了");
});

const port = process.env.WEB_PORT || 3002;
app.listen(port, () => {
  console.log(`Server start: port ${port}`);
});
