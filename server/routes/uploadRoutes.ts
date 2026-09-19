import express from 'express';
import multer from 'multer';
import { uploadData, getUploadHistory, getUploadDetails } from '../controllers/uploadController';
import fs from 'fs';
import path from 'path';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });
const router = express.Router();

router.post('/', upload.single('file'), uploadData);
router.get('/', getUploadHistory);
router.get('/:id', getUploadDetails);

export default router;
