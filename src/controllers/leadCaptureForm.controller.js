import LeadCaptureForm from "../models/leadCaptureForm.model.js";
import { getOrganizationConnection } from "../config/multiTenantDb.js";
import { getProjectModel } from "../models/project.model.js";

export const createForm = async (req, res) => {
    try {
        const payload = req.body;
        // fallback to req.user.organization if not provided in payload or query
        const org = req.query.organization || payload.organization || req.user?.organization;
        
        if (!org || org === 'undefined' || org === 'null') {
            return res.status(400).json({ success: false, message: "Organization is required" });
        }
        payload.organization = org;

        if (!payload.project_id) {
            return res.status(400).json({ success: false, message: "Project ID is required" });
        }

        const newForm = new LeadCaptureForm(payload);
        await newForm.save();

        res.status(201).json({ success: true, data: newForm, message: "Form configured successfully" });
    } catch (error) {
        console.error("Error creating lead capture form:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

export const updateForm = async (req, res) => {
    try {
        const { id } = req.params;
        const updatedForm = await LeadCaptureForm.findByIdAndUpdate(id, req.body, { new: true });
        res.status(200).json({ success: true, data: updatedForm, message: "Form updated successfully" });
    } catch (error) {
        console.error("Error updating lead capture form:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

export const getFormById = async (req, res) => {
    try {
        const { id } = req.params;
        const form = await LeadCaptureForm.findById(id).lean();
        if (!form) {
            return res.status(404).json({ success: false, message: "Form not found" });
        }
        
        if (form.project_id && form.organization) {
            const orgConn = await getOrganizationConnection(form.organization);
            const Project = getProjectModel(orgConn);
            const project = await Project.findById(form.project_id).select('name location').lean();
            form.project_id = project || form.project_id;
        }

        res.status(200).json({ success: true, data: form });
    } catch (error) {
        console.error("Error fetching lead capture form:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

export const getForms = async (req, res) => {
    try {
        let { organization, userId } = req.query;
        
        // If not provided in query, try to get from logged in user
        if (!organization || organization === 'undefined' || organization === 'null') {
            organization = req.user?.organization;
        }

        if (!organization) {
            return res.status(400).json({ success: false, message: "Organization is required" });
        }

        let query = { organization };
        if (userId && userId !== 'undefined' && userId !== 'null') {
            query['assigned_people.id'] = userId;
        }

        const forms = await LeadCaptureForm.find(query).lean().sort({ createdAt: -1 });
        
        // Manually populate project details from tenant DB
        if (forms.length > 0) {
            const orgConn = await getOrganizationConnection(organization);
            const Project = getProjectModel(orgConn);
            
            for (let form of forms) {
                if (form.project_id) {
                    const project = await Project.findById(form.project_id).select('name location').lean();
                    form.project_id = project || form.project_id;
                }
            }
        }

        res.status(200).json({ success: true, data: forms });
    } catch (error) {
        console.error("Error fetching lead capture forms:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

export const deleteForm = async (req, res) => {
    try {
        const { id } = req.params;
        await LeadCaptureForm.findByIdAndDelete(id);
        res.status(200).json({ success: true, message: "Form deleted successfully" });
    } catch (error) {
        console.error("Error deleting lead capture form:", error);
        res.status(500).json({ success: false, message: "Server Error", error: error.message });
    }
};

