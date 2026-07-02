import { customAlphabet } from 'nanoid';
import cron from 'node-cron';
import userModel from '../models/user.model.js';
import taskModel from '../models/task.model.js';
import { sendEmail } from './sendEmail.js';

export const otp6 = () => customAlphabet('0123456789', 6)();

// Weekly Leaderboard Points Reset Cron (Saturday at 23:59)
export const startWeeklyPointsReset = () => {
    cron.schedule('59 23 * * 6', async () => {
        try {
            console.log('⏰ Running weekly leaderboard points reset...');
            await userModel.updateMany({}, { $set: { weeklyPoints: 0 } });
            console.log('✅ Weekly points reset completed');
        } catch (err) {
            console.error('❌ Weekly points reset failed:', err.message);
        }
    });
};

// Daily Task Deadline Reminders Cron (runs daily at 9:00 AM)
export const startDailyDeadlineReminders = () => {
    cron.schedule('0 9 * * *', async () => {
        try {
            console.log('⏰ Running daily task deadline reminders...');
            const now = new Date();
            const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

            // Find tasks due within the next 24 hours that are not completed
            const tasksDue = await taskModel.find({
                dueDate: { $gte: now, $lte: tomorrow },
                status: { $ne: 'completed' }
            }).populate('createdBy');

            for (const task of tasksDue) {
                const user = task.createdBy;
                if (!user || !user.email) continue;

                // Send email reminder
                const text = `Hi ${user.firstName},\n\nThis is a reminder that your task "${task.title}" is due on ${task.dueDate.toLocaleDateString()}.\n\nDon't forget to complete it to earn ${task.pointsReward || 0} coins!`;
                
                await sendEmail({
                    to: user.email,
                    subject: `Deadline Reminder: ${task.title}`,
                    text,
                    html: `<h3>Task Reminder</h3><p>Hi ${user.firstName},</p><p>This is a reminder that your task <strong>"${task.title}"</strong> is due on <strong>${task.dueDate.toLocaleString()}</strong>.</p><p>Complete it to earn <strong>${task.pointsReward || 0} coins!</strong></p>`
                }).catch(console.error);

                // In future, Firebase Cloud Messaging notification can be sent here using user.fcmToken
                console.log(`✉️ Deadline reminder email sent to ${user.email} for task "${task.title}"`);
            }
        } catch (err) {
            console.error('❌ Daily task reminders failed:', err.message);
        }
    });
};
