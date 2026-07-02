import userModel from '../models/user.model.js';
import projectModel from '../models/project.model.js';
import taskModel from '../models/task.model.js';

export const checkProjectLimit = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Admin bypass limit checks
        if (user.type === 'admin') {
            return next();
        }

        if (user.subscriptionType === 'free') {
            const projectCount = await projectModel.countDocuments({ createdBy: userId });
            if (projectCount >= 3) {
                return res.status(403).json({
                    message: 'Free tier users can only create up to 3 projects. Please upgrade to Pro for unlimited projects.'
                });
            }
        }

        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};

export const checkTaskLimit = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Admin bypass limit checks
        if (user.type === 'admin') {
            return next();
        }

        if (user.subscriptionType === 'free') {
            // Only count active (non-completed) tasks
            const activeTasksCount = await taskModel.countDocuments({
                createdBy: userId,
                status: { $ne: 'completed' }
            });

            if (activeTasksCount >= 5) {
                return res.status(403).json({
                    message: 'Free tier users can only have up to 5 active tasks. Please complete existing tasks or upgrade to Pro.'
                });
            }
        }

        next();
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error' });
    }
};
