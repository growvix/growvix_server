import { asyncHandler } from '../utils/asyncHandler.util.js';
import { ApiResponse } from '../utils/apiResponse.util.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { deleteUploadedFile } from '../utils/fileCleanup.util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class UploadController {
    // Upload floor plan images (returns URLs to stored files)
    uploadFloorPlanImages = asyncHandler(async (req, res) => {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json(ApiResponse.error('No files uploaded'));
        }

        // Generate URLs for the uploaded files
        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const imageUrls = req.files.map(file => {
            return `${baseUrl}/uploads/floor-plans/${file.filename}`;
        });

        res.status(200).json(ApiResponse.success('Images uploaded successfully', {
            urls: imageUrls,
            count: imageUrls.length
        }));
    });

    uploadProfilePicture = asyncHandler(async (req, res) => {
        if (!req.file) {
            return res.status(400).json(ApiResponse.error('No file uploaded'));
        }

        // Delete old profile picture if provided
        const oldUrl = req.query.oldUrl || req.body.oldUrl;
        if (oldUrl && typeof oldUrl === 'string' && oldUrl.includes('/uploads/profile-pictures/')) {
            deleteUploadedFile(oldUrl);
        }

        const baseUrl = `${req.protocol}://${req.get('host')}`;
        const imageUrl = `${baseUrl}/uploads/profile-pictures/${req.file.filename}`;

        res.status(200).json(ApiResponse.success('Profile picture uploaded successfully', {
            url: imageUrl
        }));
    });
}

export const uploadController = new UploadController();
