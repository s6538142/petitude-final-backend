import express from "express";
import cors from "cors";
import db from "./../utils/connect-mysql.js";

const router = express.Router();

// 添加 CORS 中間件
router.use(cors());

const getListData = async (req) => {
  try {
    let success = false;

    const perPage = 20; // 每頁最多有幾筆資料
    let page = parseInt(req.query.page) || 1; // 從 query string 獲得 page 的值
    if (page < 1) {
      return { redirect: "?page=1" }; // 返回重定向對象
    }

    let keyword = req.query.keyword || '';
    let category = req.query.category || '';
    let where = '';

    if(keyword){
      const keyword_ = db.escape(`%${keyword}%`);
      where = `WHERE \`product_name\` LIKE ${keyword_}`;
    }

    if(category){
      where += where ? ' AND ' : ' WHERE '
      switch(category){
        case 'all':
          where ='';
          break;
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
        return { redirect: `?page=${totalPages}` }; // 返回重定向對象
      }
      // 取得分頁資料
      const sql = `SELECT * FROM \`product\`${where} LIMIT ${
        (page - 1) * perPage
      },${perPage}`;
      [rows] = await db.query(sql);
    }

    success = true;

    return {
      success, perPage, page, totalPages, totalRows, rows,
    };
  } catch (error) {
    console.error('Error in getListData:', error);
    return { success: false, error: "Database error" };
  }
};

router.get("/", async(req, res) => {
  try {
    res.locals.title = "商品列表" + res.locals.title;
    res.locals.pageName = "index";
    const data = await getListData(req);
    if(data.redirect){
      return res.redirect(data.redirect);
    }
    res.json(data);
  } catch (error) {
    console.error('Error in root route:', error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

router.get("/api/:pk_product_id", async(req, res) => {
  try {
    const pk_product_id = +req.params.pk_product_id || 0;
    if (!pk_product_id) {
      return res.status(400).json({ success: false, error: "沒有編號" });
    }

    const sql = `SELECT * FROM product WHERE pk_product_id=?`;
    const [rows] = await db.query(sql, [pk_product_id]);
    
    if (!rows.length) {
      return res.status(404).json({ success: false, error: "沒有該筆資料" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error('Error in single product route:', error);
    res.status(500).json({ success: false, error: "Server error" });
  }
});

export default router;