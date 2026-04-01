import path from 'path';
import { fileURLToPath } from 'url';
import { sendMail } from '../helpers/mailer.js';
import { ApiResponse } from '../utils/apiResponse.util.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const mailController = {
    /**
     * POST /api/mail/send
     * Body (multipart/form-data):
     *   to                  - recipient email
     *   subject             - mail subject
     *   html                - HTML body
     *   templateAttachments - optional JSON strings of {filename, url}
     * Files:
     *   attachments[]       - optional image / PDF files
     */
    sendLeadMail: async (req, res) => {
        try {
            const { to, subject, html, templateAttachments } = req.body;

            if (!to || !subject || !html) {
                return res.status(400).json(
                    ApiResponse.error('to, subject, and html are required', 400)
                );
            }

            // 1. Map multer memory-storage files → nodemailer attachments
            const attachments = (req.files || []).map((file) => ({
                filename: file.originalname,
                content: file.buffer,
                contentType: file.mimetype,
            }));

            // 2. Handle template attachments (files already on server)
            if (templateAttachments) {
                const tplAtts = Array.isArray(templateAttachments)
                    ? templateAttachments
                    : [templateAttachments];

                tplAtts.forEach((item) => {
                    try {
                        const parsed = typeof item === 'string' ? JSON.parse(item) : item;
                        if (parsed.filename && parsed.url) {
                            // Normalize path (handle potential hyphen vs underscore issues)
                            const relativePath = parsed.url.replace(/^\//, '').replace('mail-templates', 'mail_templates');
                            const absolutePath = path.resolve(__dirname, '../../', relativePath);
                            
                            attachments.push({
                                filename: parsed.filename,
                                path: absolutePath
                            });
                        }
                    } catch (err) {
                        console.error('Error parsing template attachment:', err);
                    }
                });
            }

            const info = await sendMail({ to, subject, html, attachments });

            return res.status(200).json(
                ApiResponse.success({ messageId: info.messageId }, 'Email sent successfully')
            );
        } catch (error) {
            console.error('Mail send error:', error);
            return res.status(500).json(
                ApiResponse.error(error.message || 'Failed to send email', 500)
            );
        }
    },
};
