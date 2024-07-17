import http from "node:http";

const server = http.createServer((req, res) => {
  // req: http.IncomingMessage
  // res: http.ServerResponse
  
  res.writeHead(200, {
    "Content-Type": "text/html; charset=utf-8",
  });
  
  res.end(`<h2>泥好嗎?</h2>
  <p>${req.url}</p>
  `);
  
});

server.listen(3000);
