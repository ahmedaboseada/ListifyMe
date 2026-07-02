import userModel from '../models/user.model.js';

export const requirePermission = (permissionName) => {
    return async (req, res, next) => {
        try {
            const userId = req.user.id;
            const user = await userModel.findById(userId);

            if (!user) {
                return res.status(404).json({ message: 'User not found' });
            }

            if (user.type !== 'admin') {
                return res.status(403).json({ message: 'Admin access required.' });
            }

            // Super admin email bypasses all permission checks automatically
            if (user.email === 'ahmedabuseada22@gmail.com') {
                return next();
            }

            if (!user.adminPermissions.includes(permissionName)) {
                return res.status(403).json({
                    message: `You do not have the required permission: "${permissionName}" to perform this action.`
                });
            }

            next();
        } catch (err) {
            console.error(err);
            return res.status(500).json({ message: 'Internal server error' });
        }
    };
};
