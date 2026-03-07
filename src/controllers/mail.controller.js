import { sendMail } from '../helpers/mailer.js';
import { ApiResponse } from '../utils/apiResponse.util.js';

export const mailController = {
    /**
     * POST /api/mail/send
     * Body (multipart/form-data):
     *   to      - recipient email
     *   subject - mail subject
     *   html    - HTML body (from rich-text editor)
     * Files:
     *   attachments[] - optional image / PDF files
     */
    sendLeadMail: async (req, res) => {
        try {
            const { to, subject, html } = req.body;

            if (!to || !subject || !html) {
                return res.status(400).json(
                    ApiResponse.error('to, subject, and html are required', 400)
                );
            }

            // Map multer memory-storage files → nodemailer attachments
            const attachments = (req.files || []).map((file) => ({
                filename: file.originalname,
                content: file.buffer,
                contentType: file.mimetype,
            }));

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
