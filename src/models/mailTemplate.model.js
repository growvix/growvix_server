import mongoose, { Schema } from 'mongoose';

const MailTemplateSchema = new Schema(
    {
        templateName: { type: String, required: true },
        projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project' },
        description: { type: String, default: '' },
        subject: { type: String, required: true },
        editorType: { type: String, enum: ['simple', 'design'], default: 'simple' },
        body: { type: String, default: '' },
        attachments: [{
            filename: { type: String },
            url: { type: String },
            type: { type: String }, // 'image' or 'pdf'
        }],
        organization: { type: String, required: true },
    },
    {
        timestamps: true,
        collection: 'mail',
    }
);

export const getMailTemplateModel = (connection) => {
    if (connection.models.MailTemplate) {
        return connection.models.MailTemplate;
    }
    return connection.model('MailTemplate', MailTemplateSchema);
};
