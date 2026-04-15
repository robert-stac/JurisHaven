import multer from 'multer';

// Process files in memory entirely; never touches disk.
// Multer buffer is streamed straight to Firebase Storage.
export const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 1024 * 1024 * 500, // 500MB max per PDF
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});
