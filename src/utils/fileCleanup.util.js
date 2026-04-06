import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Delete an uploaded file from disk given its URL.
 * Supports URLs like: http://host/uploads/floor-plans/floor-plan-xxx.jpg
 *                      http://host/uploads/profile-pictures/profile-xxx.jpg
 * Silently ignores errors (file not found, etc.) — deletion is best-effort.
 */
export function deleteUploadedFile(fileUrl) {
    if (!fileUrl || typeof fileUrl !== 'string') return;

    try {
        // Extract the path after /uploads/
        const uploadsIndex = fileUrl.indexOf('/uploads/');
        if (uploadsIndex === -1) return;

        const relativePath = fileUrl.substring(uploadsIndex); // e.g. /uploads/floor-plans/floor-plan-xxx.jpg
        const absolutePath = path.join(__dirname, '../..', relativePath); // resolve to server root

        if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
            console.log(`[Cleanup] Deleted old file: ${relativePath}`);
        }
    } catch (err) {
        // Best-effort — don't crash the request for cleanup failures
        console.error(`[Cleanup] Failed to delete file ${fileUrl}:`, err.message);
    }
}

/**
 * Given two arrays of image URLs (old vs new), delete files that
 * are present in oldUrls but absent in newUrls.
 */
export function deleteRemovedImages(oldUrls = [], newUrls = []) {
    const newSet = new Set(newUrls);
    for (const url of oldUrls) {
        if (!newSet.has(url)) {
            deleteUploadedFile(url);
        }
    }
}
