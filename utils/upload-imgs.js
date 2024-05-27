import multer from "multer";
import { v4 } from "uuid";

const extMap = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const fileFilter = (req, file, callback) => {
  callback(null, !!extMap[file.mimetype]);
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    callback(null, "public/img");
  },
  filename: (req, file, callback) => {
    const f = v4() + extMap[file.mimetype];
    callback(null, f);
  },
});

export default multer({ fileFilter, storage });
