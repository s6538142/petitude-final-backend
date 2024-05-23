
// console.log(process.env.DB_HOST);
// console.log(process.env.DB_USER);

import express from "express";

const app = express();

// 設定路由, 只允許用 GET 拜訪
app.get('/', (req, res)=>{
  res.send(`<h2>哈囉</h2>`);
});

const port = process.env.WEB_PORT || 3002;
app.listen(port, ()=>{
  console.log(`Server start: port ${port}`);
});
