import { customAlphabet } from 'nanoid';
import cron from 'node-cron';
import userModel from '../models/user.model.js';
import taskModel from '../models/task.model.js';
import notificationModel from '../models/notification.model.js';
import leaderboardSnapshotModel from '../models/leaderboard-snapshot.model.js';
import { sendEmail } from './sendEmail.js';
import { sendPushNotification } from './fcm.js';
import { getTranslation } from './translations.js';

export const otp6 = () => customAlphabet('0123456789', 6)();

// Weekly Leaderboard Points Reset Cron (Saturday at 23:59)
export const startWeeklyPointsReset = () => {
    cron.schedule('59 23 * * 6', async () => {
        try {
            console.log('⏰ Running weekly leaderboard points reset...');
            
            // Get top 3 users with active weekly points
            const topUsers = await userModel.find({ confirmed: true, weeklyPoints: { $gt: 0 } })
                .sort({ weeklyPoints: -1 })
                .limit(3)
                .lean();

            if (topUsers.length > 0) {
                const bonuses = [100, 50, 25]; // Rank 1, 2, 3 bonuses
                const winners = topUsers.map((user, index) => ({
                    userId: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    weeklyPoints: user.weeklyPoints,
                    rank: index + 1,
                    bonusCoins: bonuses[index] || 10
                }));

                // Save snapshot
                await leaderboardSnapshotModel.create({
                    weekEnding: new Date(),
                    winners
                });

                // Award bonuses and notify
                for (const winner of winners) {
                    const updatedUser = await userModel.findByIdAndUpdate(
                        winner.userId,
                        { $inc: { coins: winner.bonusCoins } },
                        { new: true }
                    );

                    await notificationModel.create({
                        title: 'Weekly Leaderboard Bonus!',
                        body: `Congratulations! You finished Rank #${winner.rank} this week and earned a bonus of ${winner.bonusCoins} coins!`,
                        type: 'pointsEarned',
                        recipient: winner.userId
                    });

                    if (updatedUser && updatedUser.fcmToken) {
                        await sendPushNotification(
                            updatedUser.fcmToken,
                            'Weekly Leaderboard Bonus!',
                            `Congratulations! You finished Rank #${winner.rank} this week and earned ${winner.bonusCoins} bonus coins!`,
                            { rank: winner.rank.toString(), bonusCoins: winner.bonusCoins.toString() }
                        ).catch(console.error);
                    }
                }
                console.log(`✅ Snapshot saved and bonuses awarded to ${winners.length} winners.`);
            }

            // Reset points
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

                const t = getTranslation(user.language);
                const dateLocale = user.language === 'ar' ? 'ar-EG' : user.language === 'es' ? 'es-ES' : 'en-US';
                const dateStr = task.dueDate.toLocaleDateString(dateLocale);
                const subject = t.deadlineReminderEmailSubject(task.title);
                const emailText = t.deadlineReminderEmailText(user.firstName, task.title, dateStr, task.pointsReward || 0);
                const emailHtml = t.deadlineReminderEmailHtml(user.firstName, task.title, dateStr, task.pointsReward || 0);

                // Send email reminder
                await sendEmail({
                    to: user.email,
                    subject,
                    text: emailText,
                    html: emailHtml
                }).catch(console.error);

                // Send Firebase Push Notification reminder
                if (user.fcmToken) {
                    await sendPushNotification(
                        user.fcmToken,
                        t.deadlineReminderTitle(task.title),
                        t.deadlineReminderBody(user.firstName, task.title),
                        { taskId: task._id.toString() }
                    ).catch(console.error);
                }
                console.log(`✉️ Deadline reminder email sent to ${user.email} for task "${task.title}"`);
            }
        } catch (err) {
            console.error('❌ Daily task reminders failed:', err.message);
        }
    });
};


