import nodemailer from 'nodemailer';

// 創建並導出發送重設密碼郵件的函數
export const sendResetPasswordEmail = async (to, subject, content) => {
  // 配置 nodemailer transporter
  const transporter = nodemailer.createTransport({
    service: 'gmail', // 使用 Gmail 作為郵件服務器
    auth: {
      user: process.env.EMAIL_USER, // 發件人電子郵件地址
      pass: process.env.EMAIL_PASS, // 發件人電子郵件密碼
    },
  });

  // 配置郵件選項
  const mailOptions = {
    from: process.env.EMAIL_USER, // 發件人
    to, // 收件人
    subject, // 郵件主題
    html: content, // 郵件內容
  };

  // 發送郵件
  await transporter.sendMail(mailOptions);
};
