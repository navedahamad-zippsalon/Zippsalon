import { Request, Response, NextFunction } from "express";
import { addStaffSchema, markAttendanceSchema, updateStaffSchema } from "./staff.validation";
import { 
    addStaffService, 
    getAllStaffService, 
    getStaffFilterOptionsService,
    getAdminStaffService,
    markAttendanceService, 
    getMyAttendanceService,
    updateStaffService, 
    deleteStaffService,
    getSalonAttendanceService,
    getMyProfileService,
    getMyDashboardService,
    getMyAppointmentsService,
    getMyEarningsService,
    getMyCommissionsService,
    getMyScheduleService,
    getMyReviewsService,
    getMyPostsService,
    createMyPostService,
    updateMyPostService,
    deleteMyPostService,
    archiveMyPostService,
    getMyStoriesService,
    createMyStoryService,
    updateMyStoryService,
    deleteMyStoryService,
    getMyNotificationsService,
    getMyBankDetailsService,
    updateMyBankDetailsService,
    deleteMyBankDetailsService,
    generateMyBankDetailsQrService,
    getMySupportFaqsService,
    getMySupportTicketsService,
    createMySupportTicketService,
    markMyNotificationReadService,
    markAllMyNotificationsReadService
} from "./staff.service";
import { AuthRequest } from "../../common/middleware/auth.middleware";
import { sendCsv } from "../../common/utils/csv.util";
import { staffAttendanceQuerySchema } from "../../validators/staff";

export const addStaff = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = addStaffSchema.parse(req.body);
        const staff = await addStaffService(req.user!.userId, data, req.user!.roles);
        res.status(201).json({ 
            success: true,
            message: "Staff added successfully", 
            data: staff 
        });
    } catch (err) {
        next(err);
    }
};

export const updateStaff = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const { id } = req.params;
        const data = updateStaffSchema.parse(req.body);
        const staff = await updateStaffService(id as string, req.user!.userId, data, req.user!.roles);
        res.status(200).json({ 
            success: true,
            message: "Staff updated successfully", 
            data: staff 
        });
    } catch (err) {
        next(err);
    }
};

export const deleteStaff = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await deleteStaffService(req.params.id as string, req.user!.userId, req.user!.roles);
        res.status(200).json({ success: true, message: "Staff deactivated successfully" });
    } catch (err) {
        next(err);
    }
};

export const getAllStaff = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const staff = await getAllStaffService(req.user!.userId, req.user!.roles, req.query);
        res.status(200).json({
            success: true,
            message: "Staff fetched successfully",
            data: staff.items,
            pagination: staff.pagination,
        });
    } catch (err) {
        next(err);
    }
};

export const getStaffFilterOptions = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const options = await getStaffFilterOptionsService(req.user!.userId, req.user!.roles);
        res.status(200).json({ success: true, data: options });
    } catch (err) {
        next(err);
    }
};

export const exportAdminStaff = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await getAdminStaffService(req.query, true);
        return sendCsv(res, `staff_filtered_${new Date().toISOString().slice(0, 10)}.csv`, ['ID', 'First Name', 'Last Name', 'Email', 'Phone', 'Salon', 'City', 'State', 'Country', 'Status'], result.items.map((item: any) => [item.id, item.user.firstName, item.user.lastName, item.user.email, item.user.phone, item.salon.name, item.salon.address?.city, item.salon.address?.state, item.salon.address?.country, item.isActive ? 'ACTIVE' : 'INACTIVE']));
    } catch (err) { next(err); }
};

export const markAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const data = markAttendanceSchema.parse(req.body);
        const adminId = req.user!.userId;
        const attendance = await markAttendanceService(data.staffId, data.date, data.status, adminId, req.user!.roles);
        res.status(200).json({ 
            success: true,
            message: "Attendance marked successfully", 
            data: attendance 
        });
    } catch (err) {
        next(err);
    }
};

export const getSalonAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const filters = staffAttendanceQuerySchema.parse(req.query);
        const result = await getSalonAttendanceService(filters, req.user!.userId, req.user!.roles);
        res.status(200).json({
            success: true,
            message: "Salon attendance fetched successfully",
            data: result.attendances,
            pagination: result.pagination,
        });
    } catch (err) {
        next(err);
    }
};

export const getMyAttendance = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const attendances = await getMyAttendanceService(req.user!.userId);
        res.status(200).json({
            success: true,
            message: "Attendance records fetched successfully",
            data: attendances
        });
    } catch (err) {
        next(err);
    }
};

export const getMyProfile = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const profile = await getMyProfileService(req.user!.userId);
        res.status(200).json({
            success: true,
            message: "Staff profile fetched successfully",
            data: profile
        });
    } catch (err) {
        next(err);
    }
};

export const getMyDashboard = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const dashboard = await getMyDashboardService(req.user!.userId);
        res.status(200).json({
            success: true,
            message: "Staff dashboard data fetched successfully",
            data: dashboard
        });
    } catch (err) {
        next(err);
    }
};

export const getMyAppointments = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const appointments = await getMyAppointmentsService(req.user!.userId, req.query);
        res.status(200).json({
            success: true,
            message: "Staff appointments fetched successfully",
            data: appointments
        });
    } catch (err) {
        next(err);
    }
};

export const getMyEarnings = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const earnings = await getMyEarningsService(req.user!.userId);
        res.status(200).json({
            success: true,
            message: "Staff earnings fetched successfully",
            data: earnings
        });
    } catch (err) {
        next(err);
    }
};

export const getMyCommissions = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const commissions = await getMyCommissionsService(req.user!.userId);
        res.status(200).json({
            success: true,
            message: "Staff commission history fetched successfully",
            data: commissions
        });
    } catch (err) {
        next(err);
    }
};

export const getMySchedule = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const schedule = await getMyScheduleService(req.user!.userId);
        res.status(200).json({
            success: true,
            message: "Staff schedule fetched successfully",
            data: schedule
        });
    } catch (err) {
        next(err);
    }
};

export const getMyReviews = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const reviews = await getMyReviewsService(req.user!.userId);
        res.status(200).json({
            success: true,
            message: "Staff reviews fetched successfully",
            data: reviews
        });
    } catch (err) {
        next(err);
    }
};

export const getMyPosts = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await getMyPostsService(req.user!.userId, req.query);
        res.status(200).json({
            success: true,
            message: "Staff posts fetched successfully",
            data: result
        });
    } catch (err) {
        next(err);
    }
};

export const createMyPost = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const post = await createMyPostService(req.user!.userId, req.body);
        res.status(201).json({
            success: true,
            message: "Staff post created successfully",
            data: post
        });
    } catch (err) {
        next(err);
    }
};

export const updateMyPost = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const post = await updateMyPostService(req.user!.userId, String(req.params.id), req.body);
        res.status(200).json({
            success: true,
            message: "Staff post updated successfully",
            data: post
        });
    } catch (err) {
        next(err);
    }
};

export const deleteMyPost = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const post = await deleteMyPostService(req.user!.userId, String(req.params.id));
        res.status(200).json({
            success: true,
            message: "Staff post deleted successfully",
            data: post
        });
    } catch (err) {
        next(err);
    }
};

export const archiveMyPost = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const post = await archiveMyPostService(req.user!.userId, String(req.params.id));
        res.status(200).json({
            success: true,
            message: "Staff post archived successfully",
            data: post
        });
    } catch (err) {
        next(err);
    }
};

export const getMyStories = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const result = await getMyStoriesService(req.user!.userId, req.query);
        res.status(200).json({
            success: true,
            message: "Staff stories fetched successfully",
            data: result
        });
    } catch (err) {
        next(err);
    }
};

export const createMyStory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const story = await createMyStoryService(req.user!.userId, req.body, req.file);
        res.status(201).json({
            success: true,
            message: "Staff story created successfully",
            data: story
        });
    } catch (err) {
        next(err);
    }
};

export const updateMyStory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const story = await updateMyStoryService(req.user!.userId, String(req.params.id), req.body, req.file);
        res.status(200).json({
            success: true,
            message: "Staff story updated successfully",
            data: story
        });
    } catch (err) {
        next(err);
    }
};

export const deleteMyStory = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const story = await deleteMyStoryService(req.user!.userId, String(req.params.id));
        res.status(200).json({
            success: true,
            message: "Staff story deleted successfully",
            data: story
        });
    } catch (err) {
        next(err);
    }
};

export const getMyNotifications = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const notifications = await getMyNotificationsService(req.user!.userId);
        res.status(200).json({
            success: true,
            message: "Staff notifications fetched successfully",
            data: notifications
        });
    } catch (err) {
        next(err);
    }
};

export const getMyBankDetails = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const bankDetails = await getMyBankDetailsService(req.user!.userId);
        res.status(200).json({
            success: true,
            message: "Staff bank details fetched successfully",
            data: bankDetails
        });
    } catch (err) {
        next(err);
    }
};

export const updateMyBankDetails = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const bankDetails = await updateMyBankDetailsService(req.user!.userId, req.body);
        res.status(200).json({
            success: true,
            message: "Staff bank details updated successfully",
            data: bankDetails
        });
    } catch (err) {
        next(err);
    }
};

export const deleteMyBankDetails = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        await deleteMyBankDetailsService(req.user!.userId);
        res.status(200).json({ success: true, message: "Bank details deleted successfully" });
    } catch (err) {
        next(err);
    }
};

export const generateMyBankDetailsQr = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const qr = await generateMyBankDetailsQrService(req.user!.userId);
        res.status(200).json({ success: true, data: qr });
    } catch (err) {
        next(err);
    }
};

export const getMySupportFaqs = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const faqs = await getMySupportFaqsService();
        res.status(200).json({
            success: true,
            message: "Staff support FAQs fetched successfully",
            data: faqs
        });
    } catch (err) {
        next(err);
    }
};

export const getMySupportTickets = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const tickets = await getMySupportTicketsService(req.user!.userId);
        res.status(200).json({
            success: true,
            message: "Staff support tickets fetched successfully",
            data: tickets
        });
    } catch (err) {
        next(err);
    }
};

export const createMySupportTicket = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const ticket = await createMySupportTicketService(req.user!.userId, req.body);
        res.status(201).json({
            success: true,
            message: "Support ticket created successfully",
            data: ticket
        });
    } catch (err) {
        next(err);
    }
};

export const markMyNotificationRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const notificationId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const notification = await markMyNotificationReadService(req.user!.userId, notificationId);
        res.status(200).json({
            success: true,
            message: "Notification marked as read",
            data: notification
        });
    } catch (err) {
        next(err);
    }
};

export const markAllMyNotificationsRead = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const notifications = await markAllMyNotificationsReadService(req.user!.userId);
        res.status(200).json({
            success: true,
            message: "All notifications marked as read",
            data: notifications
        });
    } catch (err) {
        next(err);
    }
};
