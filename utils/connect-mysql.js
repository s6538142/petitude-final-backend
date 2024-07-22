import mysql from "mysql2/promise";

const { DB_NAME, DB_HOST, DB_USER, DB_PASS } = process.env;

const db = await mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASS,
  database: DB_NAME,

  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

export default db;
