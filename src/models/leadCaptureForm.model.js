import mongoose from "mongoose";

const assignedPersonSchema = new mongoose.Schema({
    id: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String },
    phone: { type: String },
    role: { type: String },
    category: { type: String },
    type: { type: String, enum: ['user', 'cp'] }
}, { _id: false });

const leadCaptureFormSchema = new mongoose.Schema({
    name: { type: String, required: true },
    organization: { type: String, required: true },
    project_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    contact_info: {
        name: String,
        email: String,
        phone: String,
        location: String,
        campaign: String,
        source: String
    },
    selected_fields: [{ type: String }],
    manual_requirements: [{
        key: String,
        value: String
    }],
    assigned_people: [assignedPersonSchema],
    status: { type: String, enum: ['Active', 'Draft', 'Paused'], default: 'Active' },
    source: { type: String, default: 'Manual Configuration' }
}, { timestamps: true });

export default mongoose.model("LeadCaptureForm", leadCaptureFormSchema);
