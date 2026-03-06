import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'elroiitsolutions@gmail.com',
        pass: 'jxqp eruk xsvy vvvi',
    },
});

/**
 * Send an email.
 * @param {{ to: string, subject: string, html: string, attachments?: import('nodemailer').Attachment[] }} options
 */
export const sendMail = async ({ to, subject, html, attachments = [] }) => {
    const mailOptions = {
        from: '"Growvix CRM" <elroiitsolutions@gmail.com>',
        to,
        subject,
        html,
        attachments,
    };

    return transporter.sendMail(mailOptions);
};

export default transporter;
