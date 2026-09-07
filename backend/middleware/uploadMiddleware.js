import multer from 'multer';

// Use memory storage — files are uploaded directly to Cloudinary from buffer
const storage = multer.memoryStorage();

// File filter (PDF, Images, Word Docs, Mobile Octet-stream fallback)
const fileFilter = (req, file, cb) => {
    const mime = (file.mimetype || '').toLowerCase();
    const originalName = (file.originalname || '').toLowerCase();
    const validExtensions = /\.(pdf|jpe?g|png|webp|gif|bmp|doc|docx)$/i;

    if (
        mime.startsWith('image/') ||
        mime === 'application/pdf' ||
        mime === 'application/msword' ||
        mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        (mime === 'application/octet-stream' && validExtensions.test(originalName))
    ) {
        cb(null, true);
    } else {
        cb(new Error('Only document files (PDF, PNG, JPG, WEBP, DOC) are allowed'), false);
    }
};

// Multer upload instance
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
        fieldSize: 15 * 1024 * 1024 // 15MB limit for large field/base64 payloads
    },
    fileFilter: fileFilter
});

export default upload;
