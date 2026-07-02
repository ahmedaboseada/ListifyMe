export const userTypes = Object.freeze({
    user: 'user',
    admin: 'admin',
});

export const taskStatus = Object.freeze({
    pending: 'pending',
    inProgress: 'in-progress',
    completed: 'completed',
});

export const taskPriority = Object.freeze({
    low: 'low',
    medium: 'medium',
    high: 'high',
});

export const subtaskStatus = Object.freeze({
    pending: 'pending',
    completed: 'completed',
});

export const subscriptionPlans = Object.freeze({
    free: 'free',
    pro: 'pro',
});

export const notificationTypes = Object.freeze({
    taskReminder: 'taskReminder',
    taskCreated: 'taskCreated',
    taskCompleted: 'taskCompleted',
    weeklyLeaderboard: 'weeklyLeaderboard',
    pointsEarned: 'pointsEarned',
    systemAlert: 'systemAlert',
});

export const allowedFileExtensions = Object.freeze({
    image: ['jpg', 'jpeg', 'png', 'webp'],
});
