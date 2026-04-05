import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const floorPlansDir = path.join(__dirname, '../../uploads/floor-plans');
if (!fs.existsSync(floorPlansDir)) {
    fs.mkdirSync(floorPlansDir, { recursive: true });
}

const profilePicturesDir = path.join(__dirname, '../../uploads/profile-pictures');
if (!fs.existsSync(profilePicturesDir)) {
    fs.mkdirSync(profilePicturesDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, floorPlansDir);
    },
    filename: function (req, file, cb) {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `floor-plan-${uniqueSuffix}${ext}`);
    }
});

const profilePictureStorage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, profilePicturesDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `profile-${uniqueSuffix}${ext}`);
    }
});

// File filter - accept images and PDFs/Docs
const fileFilter = (req, file, cb) => {
    const allowedTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ];
    if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Only image, SVG, PDF, and DOC files are allowed'), false);
    }
};

// Create multer upload instance
export const uploadFloorPlan = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
        files: 5 // Max 5 files at once
    }
});

export const uploadProfilePicture = multer({
    storage: profilePictureStorage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB max file size
        files: 1 // Max 1 file
    }
});

export default { uploadFloorPlan, uploadProfilePicture };
