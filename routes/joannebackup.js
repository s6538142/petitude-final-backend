import express from "express";
import db from "./../utils/connect-mysql.js";

const router = express.Router();

const getListData = async (req, res) => {
  let success = false;

  const perPage = 20; // 每頁最多有幾筆資料
  let page = parseInt(req.query.page) || 1; // 從 query string 最得 page 的值
  if (page < 1) {
    return res.redirect("?page=1"); // 跳轉頁面
  }

  let keyword = req.query.keyword || '';
  let category = req.query.category || '';
  let where = '';

  if(keyword){
    const keyword_ = db.escape(`${keyword}`);
    // console.log({ keyword_ });
    where = `WHERE \`product_name\` LIKE '%${keyword}%' `;
  }
  else{
    where='';
  }

  if(category){
    where = where ? `${where} AND ` : 'WHERE ';
    switch(category){
      case 'dog':
        where += `special_needs LIKE '%犬%'`;
        break;
      case 'cat':
        where += `special_needs LIKE '%貓%'`;
        break;
      case 'adult':
        where += `special_needs LIKE '%成犬%' OR special_needs LIKE '%成貓%'`;
        break;
      case 'young':
        where += `special_needs LIKE '%幼犬%' OR special_needs LIKE '%幼貓%'`;
        break;
    }
  }

  const t_sql = `SELECT COUNT(1) totalRows FROM product ${where}`;
  const [[{ totalRows }]] = await db.query(t_sql);

  let totalPages = 0; // 總頁數, 預設值
  let rows = []; // 分頁資料
  if (totalRows) {
    totalPages = Math.ceil(totalRows / perPage);
    if (page > totalPages) {
      return res.redirect(`?page=${totalPages}`); // 跳轉頁面
    }
    // 取得分頁資料
    const sql = `SELECT * FROM \`product\`${where} LIMIT ${
      (page - 1) * perPage
    },${perPage}`;
    [rows] = await db.query(sql);
  }

  success = true;

  return{
    success, perPage, page, totalPages, totalRows, rows,
  }
};

router.get("/", async(req, res) => {
  res.locals.title="商品列表"+ res.locals.title;
  res.locals.pageName = "index"
  const data = await getListData(req);
  if(data.redirect){
    return res.redirect(data.redirect);
  }
});

router.get("/api", async(req, res) => {
  const data = await getListData(req);
  res.json(data);
})

router.get("/api/:pk_product_id", async(req, res)=>{
  const pk_product_id = +req.params.pk_product_id || 0;
  if (!pk_product_id) {
    return res.json({ success: false, error: "沒有編號" });
  }

  const sql = `SELECT * FROM product WHERE pk_product_id=${pk_product_id}`;

  const [rows] = await db.query(sql);
  if (!rows.length) {
    // 沒有該筆資料
    return res.json({ success: false, error: "沒有該筆資料" });
  }

  res.json({ success: true, data: rows[0] });
})

export default router;