import { getOrganizationConnection } from '../config/multiTenantDb.js';
import { getAttendanceSessionModel } from '../models/attendance.model.js';
import { AppError } from '../utils/apiResponse.util.js';
import { User } from '../models/user.model.js';

export class AttendanceService {
    /**
     * Get today's date string in YYYY-MM-DD format
     */
    _getTodayStr() {
        const now = new Date();
        return now.toISOString().split('T')[0];
    }

    /**
     * Toggle user online (login)
     * Creates a new session with loginTime = now
     */
    async toggleOnline(userId, organization) {
        const orgConnection = await getOrganizationConnection(organization);
        const Attendance = getAttendanceSessionModel(orgConnection);
        const today = this._getTodayStr();

        // Check if user already has an active session today
        const activeSession = await Attendance.findOne({
            userId,
            organization,
            date: today,
            isActive: true
        });

        if (activeSession) {
            throw new AppError('User already has an active session', 400);
        }

        // Create new session
        const session = await Attendance.create({
            userId,
            organization,
            date: today,
            loginTime: new Date(),
            isActive: true
        });

        return session;
    }

    /**
     * Toggle user offline (logout)
     * Closes the active session with logoutTime = now and calculates duration
     */
    async toggleOffline(userId, organization) {
        const orgConnection = await getOrganizationConnection(organization);
        const Attendance = getAttendanceSessionModel(orgConnection);
        const today = this._getTodayStr();

        // Find the active session for today
        const activeSession = await Attendance.findOne({
            userId,
            organization,
            date: today,
            isActive: true
        });

        if (!activeSession) {
            throw new AppError('No active session found for this user today', 400);
        }

        const logoutTime = new Date();
        const durationMs = logoutTime - new Date(activeSession.loginTime);
        const durationMinutes = Math.round(durationMs / 60000);

        // Update the session
        activeSession.logoutTime = logoutTime;
        activeSession.duration = durationMinutes;
        activeSession.isActive = false;
        await activeSession.save();

        return activeSession;
    }

    /**
     * Get today's status for all users in the organization
     * Returns each user with their current online/offline status and today's sessions
     */
    async getTodayStatus(organization) {
        const orgConnection = await getOrganizationConnection(organization);
        const Attendance = getAttendanceSessionModel(orgConnection);
        const today = this._getTodayStr();

        // Get all users in the organization
        const users = await User.find({ organization, isActive: true })
            .select('_id profile_id profile.firstName profile.lastName profile.email profile.profileImagePath role department')
            .lean();

        // Get today's sessions for the org
        const todaySessions = await Attendance.find({
            organization,
            date: today
        }).lean();

        // Map sessions to users
        const userStatusMap = {};
        for (const session of todaySessions) {
            const uid = session.userId.toString();
            if (!userStatusMap[uid]) {
                userStatusMap[uid] = {
                    sessions: [],
                    isOnline: false,
                    totalMinutes: 0
                };
            }
            userStatusMap[uid].sessions.push(session);
            if (session.isActive) {
                userStatusMap[uid].isOnline = true;
            }
            userStatusMap[uid].totalMinutes += session.duration || 0;

            // If session is active, add elapsed time so far
            if (session.isActive) {
                const elapsed = Math.round((new Date() - new Date(session.loginTime)) / 60000);
                userStatusMap[uid].totalMinutes += elapsed;
            }
        }

        // Combine
        const result = users.map(user => {
            const uid = user._id.toString();
            const status = userStatusMap[uid] || { sessions: [], isOnline: false, totalMinutes: 0 };
            return {
                ...user,
                isOnline: status.isOnline,
                sessions: status.sessions,
                totalMinutesToday: status.totalMinutes
            };
        });

        return result;
    }

    /**
     * Get monthly attendance for a specific user
     * Returns day-wise sessions with totals
     */
    async getMonthlyAttendance(userId, organization, year, month) {
        const orgConnection = await getOrganizationConnection(organization);
        const Attendance = getAttendanceSessionModel(orgConnection);

        // Build date range
        const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
        const endMonth = month === 12 ? 1 : month + 1;
        const endYear = month === 12 ? year + 1 : year;
        const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

        const sessions = await Attendance.find({
            userId,
            organization,
            date: { $gte: startDate, $lt: endDate }
        }).sort({ date: 1, loginTime: 1 }).lean();

        // Group by date
        const dailyMap = {};
        for (const session of sessions) {
            if (!dailyMap[session.date]) {
                dailyMap[session.date] = {
                    date: session.date,
                    sessions: [],
                    totalMinutes: 0,
                    status: 'absent'
                };
            }
            dailyMap[session.date].sessions.push(session);
            dailyMap[session.date].totalMinutes += session.duration || 0;
            dailyMap[session.date].status = 'present';

            // If session is active, add elapsed time
            if (session.isActive) {
                const elapsed = Math.round((new Date() - new Date(session.loginTime)) / 60000);
                dailyMap[session.date].totalMinutes += elapsed;
            }
        }

        // Build full month array
        const daysInMonth = new Date(year, month, 0).getDate();
        const monthData = [];
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayData = dailyMap[dateStr] || {
                date: dateStr,
                sessions: [],
                totalMinutes: 0,
                status: 'absent'
            };

            // Check if the date is in the future
            const today = new Date();
            const checkDate = new Date(dateStr);
            if (checkDate > today) {
                dayData.status = 'upcoming';
            }

            // Check if it's a weekend (Sunday)
            const dayOfWeek = checkDate.getDay();
            if (dayOfWeek === 0) {
                dayData.isWeekend = true;
            }

            monthData.push(dayData);
        }

        // Summary
        const presentDays = monthData.filter(d => d.status === 'present').length;
        const absentDays = monthData.filter(d => d.status === 'absent' && !d.isWeekend).length;
        const totalMinutes = monthData.reduce((sum, d) => sum + d.totalMinutes, 0);

        return {
            year,
            month,
            days: monthData,
            summary: {
                totalPresent: presentDays,
                totalAbsent: absentDays,
                totalWorkingHours: Math.floor(totalMinutes / 60),
                totalWorkingMinutes: totalMinutes % 60,
                avgHoursPerDay: presentDays > 0 ? (totalMinutes / presentDays / 60).toFixed(1) : '0'
            }
        };
    }

    /**
     * Auto-logout all active sessions for an organization (end of day)
     */
    async autoLogoutAll(organization) {
        const orgConnection = await getOrganizationConnection(organization);
        const Attendance = getAttendanceSessionModel(orgConnection);
        const today = this._getTodayStr();

        const activeSessions = await Attendance.find({
            organization,
            date: today,
            isActive: true
        });

        const logoutTime = new Date();
        for (const session of activeSessions) {
            const durationMs = logoutTime - new Date(session.loginTime);
            session.logoutTime = logoutTime;
            session.duration = Math.round(durationMs / 60000);
            session.isActive = false;
            await session.save();
        }

        return { loggedOut: activeSessions.length };
    }
}

export const attendanceService = new AttendanceService();
