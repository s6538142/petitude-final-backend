import express from "express";
import db from "./../utils/connect-mysql.js";

const router = express.Router();

const getListData = async (req, res) => {
  try {

    const sql = `SELECT * FROM \`project\` ${where} LIMIT ${(page - 1) * perPage},${perPage}`;
    console.log("Executing SQL:", sql); 
    [rows] = await db.query(sql);
    console.log("Query result:", rows); 

  } catch (error) {
    console.error("Error in getListData:", error);
    return { success: false, error: "資料庫查詢錯誤", details: error.message };
  }
};

router.use((req, res, next) => {
  console.log(`Project router accessed: ${req.method} ${req.url}`);
  next();
});

router.get("/", async (req, res) => {
  res.locals.title = "生前契約列表" + res.locals.title;
  res.locals.pageName = "index";
  const data = await getListData(req);
  if (data.redirect) {
    return res.redirect(data.redirect);
  }
  res.json(data); // 或者使用 res.render() 渲染頁面
});

router.get("/api", async (req, res) => {
  try {
    const data = await getListData(req);
    if (data.redirect) {
      return res.redirect(data.redirect);
    }
    res.json(data);
  } catch (error) {
    console.error("Error in /api route:", error);
    res.status(500).json({ success: false, error: "伺服器錯誤", details: error.message });
  }
});

router.get("/api/:project_id", async (req, res) => {
  try {
    const project_id = parseInt(req.params.project_id, 10) || 0;
    if (!project_id) {
      return res.json({ success: false, error: "沒有編號" });
    }

    const [rows] = await db.query("SELECT * FROM project WHERE project_id=?", [project_id]);
    if (!rows.length) {
      return res.json({ success: false, error: "沒有該筆資料" });
    }

    res.json({ success: true, data: rows[0] });
  } catch (error) {
    console.error("Error in get project by ID:", error);
    res.status(500).json({ success: false, error: "伺服器錯誤" });
  }
});

router.get("/test", (req, res) => {
  console.log("Test route accessed");
  res.send({ message: "Test route working", data: "Some test data" });
});

export default router;