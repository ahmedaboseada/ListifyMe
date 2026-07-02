import taskModel from '../../models/task.model.js';
import subtaskModel from '../../models/subtask.model.js';
import userModel from '../../models/user.model.js';
import notificationModel from '../../models/notification.model.js';

// =======================
// TASK SERVICES
// =======================

export const createTask = async (req, res) => {
    try {
        const { title, description, dueDate, priority, category, pointsReward } = req.body;
        const userId = req.user.id;

        const task = await taskModel.create({
            title,
            description,
            dueDate,
            priority: priority || 'medium',
            category: category || 'General',
            pointsReward: pointsReward !== undefined ? pointsReward : 10,
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
        const { priority, status, category, search } = req.query;

        const filter = { createdBy: userId };
        if (priority) filter.priority = priority;
        if (status) filter.status = status;
        if (category) filter.category = category;
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

        // Apply updates
        Object.assign(task, updates);
        await task.save();

        // Award points if task was completed
        if (!wasCompleted && isCompleting) {
            const reward = task.pointsReward || 10;
            await userModel.findByIdAndUpdate(userId, {
                $inc: { coins: reward, weeklyPoints: reward }
            });

            await notificationModel.create({
                title: 'Coins & Points Awarded!',
                body: `You completed "${task.title}" and earned ${reward} coins!`,
                type: 'pointsEarned',
                recipient: userId
            });
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
        const { title, pointsReward } = req.body;
        const userId = req.user.id;

        const task = await taskModel.findOne({ _id: taskId, createdBy: userId });
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const subtask = await subtaskModel.create({
            taskId,
            title,
            pointsReward: pointsReward !== undefined ? pointsReward : 2
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

        subtask.status = status;
        await subtask.save();

        if (!wasCompleted && isCompleting) {
            const reward = subtask.pointsReward || 2;
            await userModel.findByIdAndUpdate(userId, {
                $inc: { coins: reward, weeklyPoints: reward }
            });

            await notificationModel.create({
                title: 'Coins Awarded!',
                body: `You completed subtask "${subtask.title}" and earned ${reward} coins!`,
                type: 'pointsEarned',
                recipient: userId
            });
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
        const { subscriptionType } = req.body; // 'free' or 'pro'

        if (!['free', 'pro'].includes(subscriptionType)) {
            return res.status(400).json({ message: 'Invalid subscription type' });
        }

        const user = await userModel.findByIdAndUpdate(
            userId,
            { subscriptionType },
            { new: true }
        );

        if (!user) return res.status(404).json({ message: 'User not found' });

        return res.status(200).json({
            message: `Subscription successfully updated to ${subscriptionType}`,
            subscriptionType: user.subscriptionType
        });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
