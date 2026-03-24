import { cpUserService } from '../services/cpUser.service.js';
import { asyncHandler } from '../utils/asyncHandler.util.js';
import { ApiResponse } from '../utils/apiResponse.util.js';

export class CpUserController {

    // POST /api/cp-users
    create = asyncHandler(async (req, res) => {
        const organization = req.body.organization || req.user?.organization;
        const { firstName, lastName, email, phone, address, password, company, team } = req.body;

        const data = {
            firstName,
            lastName,
            email,
            phone,
            address,
            password,
            company,
            team,
            organization,
        };

        const cpUser = await cpUserService.createCpUser(data);
        res.status(201).json(ApiResponse.success('Channel Partner created successfully', cpUser));
    });

    // GET /api/cp-users?organization=xxx
    getAll = asyncHandler(async (req, res) => {
        const { organization, page, limit } = req.query;
        const org = organization || req.user?.organization;
        const result = await cpUserService.getAllCpUsers(org, Number(limit) || 50, Number(page) || 1);
        res.status(200).json(ApiResponse.success('Channel Partners retrieved', result));
    });

    // GET /api/cp-users/:id?organization=xxx
    getOne = asyncHandler(async (req, res) => {
        const org = req.query.organization || req.user?.organization;
        const cpUser = await cpUserService.getCpUserById(req.params.id, org);
        res.status(200).json(ApiResponse.success('Channel Partner retrieved', cpUser));
    });

    // PUT /api/cp-users/:id
    update = asyncHandler(async (req, res) => {
        const org = req.body.organization || req.user?.organization;
        const { firstName, lastName, email, phone, address, company, team } = req.body;

        // Build update using profile sub-object to match schema
        const updateData = {};
        if (firstName || lastName || email || phone || address) {
            updateData.profile = {};
            if (firstName) updateData.profile.firstName = firstName;
            if (lastName) updateData.profile.lastName = lastName;
            if (email) updateData.profile.email = email;
            if (phone) updateData.profile.phone = phone;
            if (address) updateData.profile.address = address;
        }
        if (company !== undefined) updateData.company = company;
        if (team !== undefined) updateData.team = team;

        const cpUser = await cpUserService.updateCpUser(req.params.id, org, updateData);
        res.status(200).json(ApiResponse.success('Channel Partner updated successfully', cpUser));
    });

    // DELETE /api/cp-users/:id?organization=xxx
    delete = asyncHandler(async (req, res) => {
        const org = req.query.organization || req.body.organization || req.user?.organization;
        await cpUserService.deleteCpUser(req.params.id, org);
        res.status(200).json(ApiResponse.success('Channel Partner deleted successfully'));
    });

    // PATCH /api/cp-users/:id/projects
    updateProjects = asyncHandler(async (req, res) => {
        const org = req.body.organization || req.user?.organization;
        const { projects } = req.body;
        const cpUser = await cpUserService.updateAllowedProjects(req.params.id, org, projects || []);
        res.status(200).json(ApiResponse.success('Allowed projects updated successfully', cpUser));
    });
}

export const cpUserController = new CpUserController();
