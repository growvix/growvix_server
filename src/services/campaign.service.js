import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getCampaignModel } from '../models/campaign.model.js';
import { getLeadStageModel } from '../models/leadStage.model.js';
import { AppError } from '../utils/apiResponse.util.js';
import { v4 as uuidv4 } from 'uuid';

export class CampaignService {

    // ─── Helpers ───────────────────────────────────────────────

    async _getModels(organization) {
        if (!organization) throw new AppError('Organization is required', 400);
        const orgConn = await getOrganizationConnection(organization);
        return {
            Campaign: getCampaignModel(orgConn),
            LeadStage: getLeadStageModel(orgConn),
        };
    }

    /** Apply campaign-level project to every sub-source that doesn't already have one */
    _applyProjectInheritance(campaignData) {
        const campaignProject = campaignData.project;
        if (campaignProject && campaignProject.projectId) {
            // Campaign-level project → force it on every sub-source
            if (campaignData.sources) {
                campaignData.sources = campaignData.sources.map(src => ({
                    ...src,
                    subSources: (src.subSources || []).map(sub => ({
                        ...sub,
                        project: {
                            projectId: campaignProject.projectId,
                            projectName: campaignProject.projectName
                        }
                    }))
                }));
            }
        }
        return campaignData;
    }

    // ─── CRUD ──────────────────────────────────────────────────

    async createCampaign(organization, data) {
        if (!data.campaignName || !data.campaignName.trim()) {
            throw new AppError('Campaign name is required', 400);
        }

        try {
            const { Campaign } = await this._getModels(organization);

            let campaignData = {
                organization,
                campaignName: data.campaignName.trim(),
                sources: (data.sources || []).map(src => ({
                    uuid: uuidv4(),
                    sourceName: src.sourceName,
                    subSources: (src.subSources || []).map(sub => ({
                        uuid: uuidv4(),
                        subSourceName: sub.subSourceName,
                        project: sub.project || null
                    }))
                }))
            };

            if (data.project && data.project.projectId) {
                campaignData.project = {
                    projectId: data.project.projectId,
                    projectName: data.project.projectName
                };
            }

            campaignData = this._applyProjectInheritance(campaignData);

            const campaign = await Campaign.create(campaignData);
            return campaign;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to create campaign: ' + err.message, 500);
        }
    }

    async getCampaigns(organization) {
        try {
            const { Campaign } = await this._getModels(organization);
            return await Campaign.find({ organization }).sort({ createdAt: -1 });
        } catch (err) {
            throw new AppError('Failed to fetch campaigns: ' + err.message, 500);
        }
    }

    async getCampaignById(organization, campaignId) {
        try {
            const { Campaign } = await this._getModels(organization);
            const campaign = await Campaign.findOne({ _id: campaignId, organization });
            if (!campaign) throw new AppError('Campaign not found', 404);
            return campaign;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to fetch campaign: ' + err.message, 500);
        }
    }

    async updateCampaign(organization, campaignId, data) {
        try {
            const { Campaign } = await this._getModels(organization);

            const updateData = {};
            if (data.campaignName !== undefined) updateData.campaignName = data.campaignName.trim();
            if (data.project !== undefined) updateData.project = data.project;
            if (data.sources !== undefined) updateData.sources = data.sources;
            if (data.status !== undefined) updateData.status = data.status;

            // Re-apply project inheritance if project or sources changed
            if (updateData.project || updateData.sources) {
                // Need the full doc to merge
                const existing = await Campaign.findOne({ _id: campaignId, organization });
                if (!existing) throw new AppError('Campaign not found', 404);

                const merged = {
                    project: updateData.project ?? existing.project,
                    sources: updateData.sources ?? existing.sources?.map(s => s.toObject()) ?? []
                };
                const applied = this._applyProjectInheritance(merged);
                if (updateData.sources !== undefined) updateData.sources = applied.sources;
            }

            const campaign = await Campaign.findOneAndUpdate(
                { _id: campaignId, organization },
                { $set: updateData },
                { new: true }
            );

            if (!campaign) throw new AppError('Campaign not found', 404);
            return campaign;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to update campaign: ' + err.message, 500);
        }
    }

    async deleteCampaign(organization, campaignId) {
        try {
            const { Campaign } = await this._getModels(organization);
            const result = await Campaign.findOneAndDelete({ _id: campaignId, organization });
            if (!result) throw new AppError('Campaign not found', 404);
            return result;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to delete campaign: ' + err.message, 500);
        }
    }

    // ─── Granular Source / Sub-Source Operations ────────────────

    async addSource(organization, campaignId, sourceData) {
        try {
            const { Campaign } = await this._getModels(organization);

            const newSource = {
                uuid: uuidv4(),
                sourceName: sourceData.sourceName,
                subSources: []
            };

            const campaign = await Campaign.findOneAndUpdate(
                { _id: campaignId, organization },
                { $push: { sources: newSource } },
                { new: true }
            );
            if (!campaign) throw new AppError('Campaign not found', 404);
            return campaign;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to add source: ' + err.message, 500);
        }
    }

    async addSubSource(organization, campaignId, sourceUuid, subSourceData) {
        try {
            const { Campaign } = await this._getModels(organization);

            const campaign = await Campaign.findOne({ _id: campaignId, organization });
            if (!campaign) throw new AppError('Campaign not found', 404);

            const source = campaign.sources.find(s => s.uuid === sourceUuid);
            if (!source) throw new AppError('Source not found', 404);

            const newSubSource = {
                uuid: uuidv4(),
                subSourceName: subSourceData.subSourceName,
                project: subSourceData.project || null
            };

            // If campaign has a project, force it on the sub-source
            if (campaign.project && campaign.project.projectId) {
                newSubSource.project = {
                    projectId: campaign.project.projectId,
                    projectName: campaign.project.projectName
                };
            }

            source.subSources.push(newSubSource);
            await campaign.save();
            return campaign;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to add sub-source: ' + err.message, 500);
        }
    }

    async updateSubSourceProject(organization, campaignId, sourceUuid, subSourceUuid, projectData) {
        try {
            const { Campaign } = await this._getModels(organization);

            const campaign = await Campaign.findOne({ _id: campaignId, organization });
            if (!campaign) throw new AppError('Campaign not found', 404);

            // If campaign-level project exists, sub-source cannot override
            if (campaign.project && campaign.project.projectId) {
                throw new AppError('Cannot override project on sub-source when campaign has a project assigned', 400);
            }

            const source = campaign.sources.find(s => s.uuid === sourceUuid);
            if (!source) throw new AppError('Source not found', 404);

            const subSource = source.subSources.find(ss => ss.uuid === subSourceUuid);
            if (!subSource) throw new AppError('Sub-source not found', 404);

            subSource.project = projectData;
            await campaign.save();
            return campaign;
        } catch (err) {
            if (err instanceof AppError) throw err;
            throw new AppError('Failed to update sub-source project: ' + err.message, 500);
        }
    }

    // ─── Stages helper ─────────────────────────────────────────

    async getStages(organization) {
        try {
            const { LeadStage } = await this._getModels(organization);
            const stageDoc = await LeadStage.findOne({ organization });
            return stageDoc?.stages || [];
        } catch (err) {
            throw new AppError('Failed to fetch stages: ' + err.message, 500);
        }
    }
}

export const campaignService = new CampaignService();
