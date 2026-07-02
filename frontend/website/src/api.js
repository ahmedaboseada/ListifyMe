const API_URL = 'http://localhost:8000';

export const request = async (endpoint, options = {}) => {
    const token = localStorage.getItem('token');
    const userType = localStorage.getItem('userType'); // 'admin' or 'user'
    
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    if (token) {
        const prefix = userType === 'admin' ? 'admin' : 'bearer';
        headers['Authorization'] = `${prefix} ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
        ...options,
        headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        if (response.status === 401 || (response.status === 404 && data.message === 'User Not Found')) {
            localStorage.removeItem('token');
            localStorage.removeItem('userType');
            window.location.reload();
        }
        throw new Error(data.message || 'Something went wrong');
    }

    return data;
};

export const api = {
    // Auth
    login: (email, password) => request('/users/signin', { method: 'POST', body: JSON.stringify({ email, password }) }),
    signup: (userData) => request('/users/signup', { method: 'POST', body: JSON.stringify(userData) }),
    getMe: () => request('/users/me'),
    updateSettings: (settings) => request('/users/settings', { method: 'PATCH', body: JSON.stringify(settings) }),
    updateProfile: (profileData) => request('/users/updateProfile', { method: 'PATCH', body: JSON.stringify(profileData) }),
    forgetPassword: (email) => request('/users/forgetPassword', { method: 'POST', body: JSON.stringify({ email }) }),
    verifyForgetPasswordOTP: (email, otp) => request('/users/forgetPassword/verify', { method: 'POST', body: JSON.stringify({ email, otp }) }),
    resetPassword: (email, otp, newPassword) => request('/users/resetPassword', { method: 'POST', body: JSON.stringify({ email, otp, newPassword }) }),
    requestOTP: (email) => request('/users/requestOTP', { method: 'POST', body: JSON.stringify({ email }) }),
    checkOTP: (email, otp) => request('/users/checkOTP', { method: 'POST', body: JSON.stringify({ email, otp }) }),
    toggle2FA: (enable) => request('/users/2fa', { method: 'PATCH', body: JSON.stringify({ enable }) }),
    changePassword: (oldPassword, newPassword) => request('/users/changePassword', { method: 'PATCH', body: JSON.stringify({ oldPassword, newPassword }) }),
    requestEmailChange: (newEmail) => request('/users/email/change', { method: 'PATCH', body: JSON.stringify({ newEmail }) }),
    
    // Admin user management
    getUsers: () => request('/users/all-users'),
    updateAdminPermissions: (userId, data) => request(`/users/${userId}/permissions`, { method: 'PATCH', body: JSON.stringify(data) }),

    // Projects
    getProjects: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/projects?${query}`);
    },
    createProject: (projectData) => request('/projects', { method: 'POST', body: JSON.stringify(projectData) }),
    getProject: (projectId) => request(`/projects/${projectId}`),
    updateProject: (projectId, projectData) => request(`/projects/${projectId}`, { method: 'PATCH', body: JSON.stringify(projectData) }),
    deleteProject: (projectId) => request(`/projects/${projectId}`, { method: 'DELETE' }),

    // Tasks
    getTasks: (params = {}) => {
        const query = new URLSearchParams(params).toString();
        return request(`/tasks?${query}`);
    },
    createTask: (taskData) => request('/tasks', { method: 'POST', body: JSON.stringify(taskData) }),
    getTask: (taskId) => request(`/tasks/${taskId}`),
    updateTask: (taskId, taskData) => request(`/tasks/${taskId}`, { method: 'PATCH', body: JSON.stringify(taskData) }),
    deleteTask: (taskId) => request(`/tasks/${taskId}`, { method: 'DELETE' }),
    
    // Subtasks
    createSubtask: (taskId, subtaskData) => request(`/tasks/${taskId}/subtask`, { method: 'POST', body: JSON.stringify(subtaskData) }),
    updateSubtaskStatus: (subtaskId, status) => request(`/tasks/subtask/${subtaskId}`, { method: 'PATCH', body: JSON.stringify({ status }) }),
    deleteSubtask: (subtaskId) => request(`/tasks/subtask/${subtaskId}`, { method: 'DELETE' }),

    // Leaderboard
    getLeaderboard: () => request('/tasks/leaderboard'),

    // Rewards
    getRewards: () => request('/rewards'),
    createReward: (rewardData) => request('/rewards', { method: 'POST', body: JSON.stringify(rewardData) }),
    updateReward: (rewardId, rewardData) => request(`/rewards/${rewardId}`, { method: 'PATCH', body: JSON.stringify(rewardData) }),
    deleteReward: (rewardId) => request(`/rewards/${rewardId}`, { method: 'DELETE' }),
    purchaseReward: (rewardId) => request('/rewards/purchase', { method: 'POST', body: JSON.stringify({ rewardId }) }),
    getMyRewards: () => request('/rewards/my-rewards'),

    // AI
    analyzeTaskAI: (taskData) => request('/tasks/ai/analyze', { method: 'POST', body: JSON.stringify(taskData) }),
    suggestSubtasksAI: (title, description) => request('/tasks/ai-suggest-subtasks', { method: 'POST', body: JSON.stringify({ title, description }) }),
    suggestDescriptionAI: (title, type) => request('/tasks/ai-suggest-description', { method: 'POST', body: JSON.stringify({ title, type }) }),

    // Upgrade
    upgradeSubscription: (upgradeType, paymentMethod) => request('/tasks/upgrade', { method: 'POST', body: JSON.stringify({ upgradeType, paymentMethod }) })
};
export default api;
