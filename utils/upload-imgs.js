import multer from "multer";
import { v4 } from "uuid";

// 篩選檔案和決定附檔名
const extMap = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

// 有影片類型, 改這段就可, 其他一樣
// const extMap = {
//   "video": ".mp4",
// }

// extMap裡的檔案類型要轉換成布林值呈現
const fileFilter = (req, file, cb) => {
  cb(null, !!extMap[file.mimetype]);
  
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/img");
    // 若存進來不符合則顯示null, 若符合則存在public裡, 副檔名為img
  },
  filename: (req, file, cb) => {
    const f = v4 + extMap[file.mimetype];
    cb(null, f);
  },
});

export default multer({ fileFilter, storage });


