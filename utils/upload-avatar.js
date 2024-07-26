import multer from 'multer';
import path from 'path';

// 設定儲存檔案的位置和名稱
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads'); // 儲存路徑
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}${path.extname(file.originalname)}`); // 文件名稱
  },
});

// 創建 multer 上傳實例
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 最大 5MB
});

export default upload;
