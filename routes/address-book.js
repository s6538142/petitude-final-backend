import express from "express";
import db from "./../utils/connect-mysql.js";

const router = express.Router();

router.get("/", async (req, res) => {
  const t_sql = "SELECT COUNT(1) totalRows FROM address_book";
  const [results] = await db.query(t_sql);


  res.json(results);
});

export default router;
