import cron from 'node-cron';
import userModel from '../models/user.model.js';

export const startSubscriptionCron = () => {
    // Run every day at midnight
    cron.schedule('0 0 * * *', async () => {
        console.log('[CRON] Running daily subscription auto-renewal check...');
        try {
            const now = new Date();
            
            // Find all users where subscription has expired and they are currently on pro
            const expiredUsers = await userModel.find({
                subscriptionType: 'pro',
                subscriptionExpiresAt: { $lt: now }
            });

            for (const user of expiredUsers) {
                if (user.autoRenew) {
                    if (user.paymentMethod === 'coins') {
                        if (user.coins >= 10000) {
                            // Auto renew with coins
                            user.coins -= 10000;
                            // Add 30 days
                            user.subscriptionExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                            user.gracePeriodStartedAt = undefined; // Clear grace period if active
                            await user.save();
                            console.log(`[CRON] Auto-renewed user ${user.email} with coins.`);
                        } else {
                            // Not enough coins, start grace period
                            if (!user.gracePeriodStartedAt) {
                                user.gracePeriodStartedAt = now;
                                await user.save();
                                console.log(`[CRON] Started grace period for user ${user.email} due to insufficient coins.`);
                            } else {
                                const daysInGrace = (now - user.gracePeriodStartedAt) / (1000 * 60 * 60 * 24);
                                if (daysInGrace > 3) {
                                    // Downgrade after 3 days
                                    user.subscriptionType = 'free';
                                    user.subscriptionExpiresAt = undefined;
                                    user.autoRenew = false;
                                    user.gracePeriodStartedAt = undefined;
                                    await user.save();
                                    console.log(`[CRON] Downgraded user ${user.email} to free after 3-day grace period.`);
                                }
                            }
                        }
                    } else if (user.paymentMethod === 'cash') {
                        // For cash, we simulate an automatic successful renewal since there is no Stripe integration.
                        user.subscriptionExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                        user.gracePeriodStartedAt = undefined;
                        await user.save();
                        console.log(`[CRON] Auto-renewed user ${user.email} with simulated cash.`);
                    }
                } else {
                    // Auto-renew is disabled, fallback to free
                    user.subscriptionType = 'free';
                    user.subscriptionExpiresAt = undefined;
                    user.gracePeriodStartedAt = undefined;
                    await user.save();
                    console.log(`[CRON] Auto-renew disabled. Downgraded user ${user.email} to free.`);
                }
            }
        } catch (err) {
            console.error('[CRON] Error during subscription check:', err);
        }
    });
};
