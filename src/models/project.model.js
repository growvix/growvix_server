import mongoose, { Schema } from 'mongoose';

const ProjectSchema = new Schema(
    {
        product_id: { type: Number, required: true, unique: true },
        property: { type: String },
        name: { type: String, required: true },
        location: { type: String },
        img_location: {
            logo: { type: String },
            banner: { type: String },
            brochure: { type: String },
            post: { type: String },
            videos: { type: String },
        },
        preferred: [{ type: String }],
        type: { type: String },
    },
    {
        timestamps: true,
        collection: 'projects',
    }
);

export const getProjectModel = (connection) => {
    if (connection.models.Project) {
        return connection.models.Project;
    }
    return connection.model('Project', ProjectSchema);
};
