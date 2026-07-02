import taskModel from '../../models/task.model.js';
import subtaskModel from '../../models/subtask.model.js';
import userModel from '../../models/user.model.js';
import notificationModel from '../../models/notification.model.js';
import { categories } from '../../config/CONSTANTS.js';
import { sendPushNotification } from '../../utils/fcm.js';
import { getTranslation } from '../../utils/translations.js';
import { analyzeTaskWithAI, suggestSubtasksWithAI, suggestDescriptionWithAI } from '../../utils/aiHelper.js';


// =======================
// TASK SERVICES
// =======================

export const createTask = async (req, res) => {
    try {
        const { title, description, dueDate, priority, category, projectId } = req.body;
        const userId = req.user.id;

        const task = await taskModel.create({
            title,
            description,
            dueDate,
            priority: priority || 'medium',
            category: category || categories.general,
            projectId,
            pointsReward: 25, // Lock task reward to 25
            createdBy: userId
        });

        // Add task log / notification if needed
        await notificationModel.create({
            title: 'Task Created',
            body: `You created a new task: ${title}`,
            type: 'taskCreated',
            recipient: userId
        });

        return res.status(201).json({ message: 'Task created successfully', task });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const getTasks = async (req, res) => {
    try {
        const userId = req.user.id;
        const { priority, status, category, projectId, search } = req.query;

        const filter = { createdBy: userId };
        if (priority) filter.priority = priority;
        if (status) filter.status = status;
        if (category) filter.category = category;
        if (projectId) filter.projectId = projectId;
        if (search) filter.title = { $regex: search, $options: 'i' };

        const tasks = await taskModel.find(filter)
            .populate('subtasks')
            .sort({ dueDate: 1 });


        return res.status(200).json({ tasks });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const getTaskById = async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user.id;

        const task = await taskModel.findOne({ _id: taskId, createdBy: userId }).populate('subtasks');
        if (!task) return res.status(404).json({ message: 'Task not found' });

        return res.status(200).json({ task });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user.id;
        const updates = { ...req.body };

        const task = await taskModel.findOne({ _id: taskId, createdBy: userId });
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const wasCompleted = task.status === 'completed';
        const isCompleting = updates.status === 'completed';
        const isUncompleting = updates.status !== undefined && updates.status !== 'completed';

        // Apply updates
        Object.assign(task, updates);
        await task.save();

        // Award points if task was completed
        if (!wasCompleted && isCompleting) {
            // Check for unfinished subtasks
            const unfinishedSubtasks = await subtaskModel.countDocuments({ taskId: task._id, status: { $ne: 'completed' } });
            if (unfinishedSubtasks > 0) {
                return res.status(400).json({ message: 'Cannot complete task while there are unfinished subtasks' });
            }

            const reward = 25; // Always 25 for main task
            const user = await userModel.findByIdAndUpdate(userId, {
                $inc: { coins: reward, weeklyPoints: reward }
            }, { new: true });

            const t = getTranslation(user?.language);
            const notifyTitle = t.taskCompletedTitle;
            const notifyBody = t.taskCompletedBody(task.title, reward);

            await notificationModel.create({
                title: notifyTitle,
                body: notifyBody,
                type: 'pointsEarned',
                recipient: userId
            });

            if (user && user.fcmToken) {
                await sendPushNotification(
                    user.fcmToken,
                    notifyTitle,
                    notifyBody,
                    { taskId: task._id.toString(), coinsEarned: reward.toString() }
                ).catch(console.error);
            }
        } else if (wasCompleted && isUncompleting) {
            const reward = 25; // Always 25 for main task
            const user = await userModel.findByIdAndUpdate(userId, {
                $inc: { coins: -reward, weeklyPoints: -reward }
            }, { new: true });

            if (user) {
                let saveNeeded = false;
                if (user.coins < 0) { user.coins = 0; saveNeeded = true; }
                if (user.weeklyPoints < 0) { user.weeklyPoints = 0; saveNeeded = true; }
                if (saveNeeded) await user.save();
            }
        }

        return res.status(200).json({ message: 'Task updated successfully', task });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteTask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const userId = req.user.id;

        const task = await taskModel.findOne({ _id: taskId, createdBy: userId });
        if (!task) return res.status(404).json({ message: 'Task not found' });

        // Delete all associated subtasks
        await subtaskModel.deleteMany({ taskId });

        await taskModel.findByIdAndDelete(taskId);

        return res.status(200).json({ message: 'Task and associated subtasks deleted successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// =======================
// SUBTASK SERVICES
// =======================

export const createSubtask = async (req, res) => {
    try {
        const { taskId } = req.params;
        const { title } = req.body;
        const userId = req.user.id;

        const task = await taskModel.findOne({ _id: taskId, createdBy: userId });
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const subtask = await subtaskModel.create({
            taskId,
            title,
            pointsReward: 0
        });

        // Add subtask reference to main task
        task.subtasks.push(subtask._id);
        await task.save();

        return res.status(201).json({ message: 'Subtask created successfully', subtask });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateSubtaskStatus = async (req, res) => {
    try {
        const { subtaskId } = req.params;
        const { status } = req.body; // 'pending' or 'completed'
        const userId = req.user.id;

        const subtask = await subtaskModel.findById(subtaskId);
        if (!subtask) return res.status(404).json({ message: 'Subtask not found' });

        // Verify task ownership
        const task = await taskModel.findOne({ _id: subtask.taskId, createdBy: userId });
        if (!task) return res.status(403).json({ message: 'Forbidden' });

        const wasCompleted = subtask.status === 'completed';
        const isCompleting = status === 'completed';
        const isUncompleting = status !== undefined && status !== 'completed';

        subtask.status = status;

        if (!wasCompleted && isCompleting) {
            const subtaskCount = await subtaskModel.countDocuments({ taskId: task._id });
            const reward = subtaskCount >= 3 ? Math.round((15 / subtaskCount) * 10) / 10 : 0;
            subtask.pointsReward = reward;
        }

        await subtask.save();

        if (!wasCompleted && isCompleting) {
            const reward = subtask.pointsReward || 0;

            if (reward > 0) {
                const user = await userModel.findByIdAndUpdate(userId, {
                    $inc: { coins: reward, weeklyPoints: reward }
                }, { new: true });

                const t = getTranslation(user?.language);
                const notifyTitle = t.subtaskCompletedTitle;
                const notifyBody = t.subtaskCompletedBody(subtask.title, reward);

                await notificationModel.create({
                    title: notifyTitle,
                    body: notifyBody,
                    type: 'pointsEarned',
                    recipient: userId
                });

                if (user && user.fcmToken) {
                    await sendPushNotification(
                        user.fcmToken,
                        notifyTitle,
                        notifyBody,
                        { subtaskId: subtask._id.toString(), coinsEarned: reward.toString() }
                    ).catch(console.error);
                }
            }
        } else if (wasCompleted && isUncompleting) {
            const reward = subtask.pointsReward || 0;

            if (reward > 0) {
                const user = await userModel.findByIdAndUpdate(userId, {
                    $inc: { coins: -reward, weeklyPoints: -reward }
                }, { new: true });

                if (user) {
                    let saveNeeded = false;
                    if (user.coins < 0) { user.coins = 0; saveNeeded = true; }
                    if (user.weeklyPoints < 0) { user.weeklyPoints = 0; saveNeeded = true; }
                    if (saveNeeded) await user.save();
                }
            }
        }

        return res.status(200).json({ message: 'Subtask status updated successfully', subtask });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteSubtask = async (req, res) => {
    try {
        const { subtaskId } = req.params;
        const userId = req.user.id;

        const subtask = await subtaskModel.findById(subtaskId);
        if (!subtask) return res.status(404).json({ message: 'Subtask not found' });

        // Verify task ownership
        const task = await taskModel.findOne({ _id: subtask.taskId, createdBy: userId });
        if (!task) return res.status(403).json({ message: 'Forbidden' });

        // Pull subtask from main task array
        await taskModel.findByIdAndUpdate(subtask.taskId, {
            $pull: { subtasks: subtaskId }
        });

        await subtaskModel.findByIdAndDelete(subtaskId);

        return res.status(200).json({ message: 'Subtask deleted successfully' });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// =======================
// LEADERBOARD SERVICES
// =======================

export const getLeaderboard = async (req, res) => {
    try {
        // Find top 10 users sorted by weeklyPoints descending
        const leaderboard = await userModel.find({ confirmed: true })
            .select('firstName lastName weeklyPoints profilePicture')
            .sort({ weeklyPoints: -1 })
            .limit(10)
            .lean();

        return res.status(200).json({ leaderboard });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// =======================
// SUBSCRIPTION UPGRADE
// =======================

export const upgradeSubscription = async (req, res) => {
    try {
        const userId = req.user.id;
        const { upgradeType, paymentMethod } = req.body; // upgradeType: 'free' | 'trial' | 'pro' | 'lifetime', paymentMethod: 'cash' | 'coins'

        const user = await userModel.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const now = new Date();

        if (upgradeType === 'free') {
            user.subscriptionType = 'free';
            user.subscriptionExpiresAt = undefined;
            user.autoRenew = false;
        } else if (upgradeType === 'trial') {
            if (user.trialUsed) {
                return res.status(400).json({ message: 'Free trial has already been used. Please choose a paid subscription option.' });
            }
            user.subscriptionType = 'pro';
            user.subscriptionExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days trial
            user.trialUsed = true;
            user.autoRenew = false;
        } else if (upgradeType === 'pro') {
            if (paymentMethod === 'coins') {
                if (user.coins < 10000) {
                    return res.status(400).json({ message: 'Insufficient coins! Pro plan monthly costs 10,000 coins.' });
                }
                user.coins -= 10000;
            }
            user.subscriptionType = 'pro';
            user.subscriptionExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
            user.paymentMethod = paymentMethod || 'cash';
            user.autoRenew = true;
        } else if (upgradeType === 'lifetime') {
            if (paymentMethod === 'coins') {
                if (user.coins < 50000) {
                    return res.status(400).json({ message: 'Insufficient coins! Pro plan lifetime costs 50,000 coins.' });
                }
                user.coins -= 50000;
            }
            user.subscriptionType = 'lifetime';
            user.subscriptionExpiresAt = undefined; // No expiration date
            user.paymentMethod = paymentMethod || 'cash';
            user.autoRenew = false;
        } else {
            return res.status(400).json({ message: 'Invalid subscription tier selection.' });
        }

        user.gracePeriodStartedAt = undefined; // reset grace period if any
        await user.save();

        return res.status(200).json({
            message: `Subscription successfully updated to ${user.subscriptionType}`,
            subscriptionType: user.subscriptionType,
            subscriptionExpiresAt: user.subscriptionExpiresAt,
            user
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

// =======================
// AI TASK HELPER
// =======================

export const analyzeTask = async (req, res) => {
    try {
        const { title, description, subtaskCount, dueDate } = req.body;

        const analysis = await analyzeTaskWithAI(title, description, subtaskCount, dueDate);

        return res.status(200).json({
            message: 'Task analyzed successfully by AI',
            analysis
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const suggestSubtasks = async (req, res) => {
    try {
        const { title, description } = req.body;
        const subtasks = await suggestSubtasksWithAI(title, description);
        return res.status(200).json({
            message: 'Subtasks suggested successfully by AI',
            subtasks
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const suggestDescription = async (req, res) => {
    try {
        const { title, type } = req.body;
        const description = await suggestDescriptionWithAI(title, type);
        return res.status(200).json({
            message: 'Description suggested successfully by AI',
            description
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};


