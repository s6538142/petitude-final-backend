import express from "express";
const router = express.Router();
import * as crypto from "crypto";
import db from "./../utils/connect-mysql.js";

/* GET home page. */
router.get("/", function (req, res, next) {
  const amount = req.query.amount;
  console.log("ttt", req.query);
  //綠界全方位金流技術文件：
  // https://developers.ecpay.com.tw/?p=2856
  // 信用卡測試卡號：4311-9522-2222-2222 安全碼 222

  ////////////////////////改以下參數即可////////////////////////
  //一、選擇帳號，是否為測試環境
  const MerchantID = "3002607"; //必填
  const HashKey = "pwFHCqoQZGmho4w6"; //3002607
  const HashIV = "EkRm7iFT261dpevs"; //3002607
  let isStage = true; // 測試環境： true；正式環境：false

  //二、輸入參數
  const TotalAmount = amount;
  const TradeDesc = "商店線上付款";
  const ItemName = "xx商店購買一批";
  const ReturnURL = "http://localhost:3001/ecpay/payment-result";
  const OrderResultURL = "http://localhost:3000/estore/success"; //前端成功頁面
  const ChoosePayment = "ALL";

  ////////////////////////以下參數不用改////////////////////////
  const stage = isStage ? "-stage" : "";
  const algorithm = "sha256";
  const digest = "hex";
  const APIURL = `https://payment${stage}.ecpay.com.tw//Cashier/AioCheckOut/V5`;
  const MerchantTradeNo = `od${new Date().getFullYear()}${(
    new Date().getMonth() + 1
  )
    .toString()
    .padStart(2, "0")}${new Date()
    .getDate()
    .toString()
    .padStart(2, "0")}${new Date()
    .getHours()
    .toString()
    .padStart(2, "0")}${new Date()
    .getMinutes()
    .toString()
    .padStart(2, "0")}${new Date()
    .getSeconds()
    .toString()
    .padStart(2, "0")}${new Date().getMilliseconds().toString().padStart(2)}`;

  const MerchantTradeDate = new Date().toLocaleDateString("zh-TW", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  //三、計算 CheckMacValue 之前
  let ParamsBeforeCMV = {
    MerchantID: MerchantID,
    MerchantTradeNo: MerchantTradeNo,
    MerchantTradeDate: MerchantTradeDate.toString(),
    PaymentType: "aio",
    EncryptType: 1,
    TotalAmount: TotalAmount,
    TradeDesc: TradeDesc,
    ItemName: ItemName,
    ReturnURL: ReturnURL,
    ChoosePayment: ChoosePayment,
    OrderResultURL,
  };

  //四、計算 CheckMacValue
  function CheckMacValueGen(parameters, algorithm, digest) {
    // const crypto = require('crypto')
    let Step0;

    Step0 = Object.entries(parameters)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    function DotNETURLEncode(string) {
      const list = {
        "%2D": "-",
        "%5F": "_",
        "%2E": ".",
        "%21": "!",
        "%2A": "*",
        "%28": "(",
        "%29": ")",
        "%20": "+",
      };

      Object.entries(list).forEach(([encoded, decoded]) => {
        const regex = new RegExp(encoded, "g");
        string = string.replace(regex, decoded);
      });

      return string;
    }

    const Step1 = Step0.split("&")
      .sort((a, b) => {
        const keyA = a.split("=")[0];
        const keyB = b.split("=")[0];
        return keyA.localeCompare(keyB);
      })
      .join("&");
    const Step2 = `HashKey=${HashKey}&${Step1}&HashIV=${HashIV}`;
    const Step3 = DotNETURLEncode(encodeURIComponent(Step2));
    const Step4 = Step3.toLowerCase();
    const Step5 = crypto.createHash(algorithm).update(Step4).digest(digest);
    const Step6 = Step5.toUpperCase();
    return Step6;
  }
  const CheckMacValue = CheckMacValueGen(ParamsBeforeCMV, algorithm, digest);

  //五、將所有的參數製作成 payload
  const AllParams = { ...ParamsBeforeCMV, CheckMacValue };
  console.log(AllParams);
  const inputs = Object.entries(AllParams)
    .map(function (param) {
      return `<input name=${param[0]} value="${param[1].toString()}"><br/>`;
    })
    .join("");

  //六、製作送出畫面
  const htmlContent = `
  <!DOCTYPE html>
  <html>
  <head>
      <title>全方位金流-測試</title>
  </head>
  <body>
      <form method="post" action="${APIURL}">
  ${inputs}
  <input type ="submit" value = "送出參數">
      </form>
  </body>
  </html>
  `;

  // res.send(htmlContent);

  //   const htmlContent = `
  //   <!DOCTYPE html>
  //   <html>
  //   <head>
  //       <title></title>
  //   </head>
  //   <body>
  //       <form method="post" action="${APIURL}">
  //   ${inputs}
  //   <input type="submit" value="送出參數" style="display:none">
  //       </form>
  //   <script>
  //     document.forms[0].submit();
  //   </script>
  //   </body>
  //   </html>
  //   `

  //   res.send(htmlContent)

  // 叫react送form的作法
  res.json({ htmlContent });
});

// router.post("/payment-result", async (req, body) => {
//   // 處理綠界的回調
//   const { RtnCode, TradeNo, TradeAmt, PaymentDate } = req.body;
//   const { cartItems, ...customerInfo } = req.body;

//   if (RtnCode === "1") {
//     // 支付成功
//     try {
//       // 開始處理資料庫新增
//       connection = await db.getConnection();
//       await connection.beginTransaction();

//       // 獲取縣市和鄉鎮市區的 ID
//       const [countyResult] = await connection.query(
//         "SELECT county_id FROM county WHERE county_name = ?",
//         [customerInfo.county]
//       );
//       const countyId = countyResult[0]?.county_id;

//       const [cityResult] = await connection.query(
//         "SELECT city_id FROM city WHERE city_name = ? AND fk_county_id = ?",
//         [customerInfo.city, countyId]
//       );
//       const cityId = cityResult[0]?.city_id;

//       // 新增訂單資料表
//       const [orderResult] = await connection.query(
//         `INSERT INTO request
//     (b2c_name, payment_method, request_price, fk_county_id, fk_city_id, recipient_address, recipient_mobile, recipient_phone, request_date)
//     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
//         [
//           customerInfo.buyerName,
//           customerInfo.paymentMethod,
//           cartItems.reduce(
//             (total, item) => total + item.product_price * item.qty,
//             0
//           ),
//           countyId,
//           cityId,
//           customerInfo.address,
//           customerInfo.mobile,
//           customerInfo.telephone,
//         ]
//       );

//       const orderId = orderResult.insertId;

//       // 新增訂單詳情
//       for (const item of cartItems) {
//         await connection.query(
//           "INSERT INTO request_detail (fk_request_id, fk_product_id, purchase_quantity, purchase_price) VALUES (?, ?, ?, ?)",
//           [orderId, item.pk_product_id, item.qty, item.product_price]
//         );
//       }

//       // 提交表單
//       await connection.commit();

//       res.json({ success: true, message: "訂單已成功創建" });

//       // 重定向到成功頁面，並傳遞訂單編號和課程ID
//       res.redirect("http://localhost:3000/estore");
//     } catch (error) {
//       console.error("保存訂單失敗:", error);
//       res.status(500).send("訂單處理失敗");
//     }
//   } else {
//     // 支付失敗
//     res.redirect("http://localhost:3000/");
//   }
// });

export default router;
