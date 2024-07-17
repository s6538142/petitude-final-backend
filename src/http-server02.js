import http from "node:http";
import fs from "node:fs/promises";

const server = http.createServer(async (req, res) => {
  const jsonStr = JSON.stringify(req.headers, null, 4);
  try {
    await fs.writeFile("headers.txt", jsonStr);
  } catch (ex) {
    res.end("無法寫入檔案");
  }
  res.end(jsonStr);
});

server.listen(3000);
