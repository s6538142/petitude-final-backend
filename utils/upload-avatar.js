import fs from 'fs';
import path from 'path';

const saveBase64Image = (base64String, filePath) => {
  const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(base64Data, 'base64');

  fs.writeFileSync(filePath, buffer);
};

export default saveBase64Image;
