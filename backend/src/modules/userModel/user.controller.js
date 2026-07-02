import { Router } from 'express';
import { validation } from '../../middlewares/validation.js';
import { verifyToken } from '../../middlewares/authentication.js';
import { restrictTo } from '../../middlewares/restrictTo.js';
import { requirePermission } from '../../middlewares/permission.js';

import * as UVS from './user.validation.js';
import * as US from './user.service.js';

const userRouter = Router();

// =======================
// PUBLIC
// =======================
userRouter.post('/signup', validation(UVS.signupSchema), US.signup);
userRouter.post('/signin', validation(UVS.signinSchema), US.signin);
userRouter.post('/google', validation(UVS.googleAuthSchema), US.googleAuth);
userRouter.post('/signin/otp', validation(UVS.signinOtpSchema), US.signinWithOtp);

userRouter.get('/confirmEmail/:token', US.confirmEmail);
userRouter.get('/confirmEmailChange/:token', validation(UVS.confirmEmailChangeSchema), US.confirmEmailChange);

userRouter.post('/refreshToken', US.refreshToken);
userRouter.post('/requestOTP', US.requestOTP);
userRouter.post('/checkOTP', US.checkOTP);

userRouter.post('/forgetPassword', validation(UVS.forgetPasswordSchema), US.forgetPassword);
userRouter.post('/forgetPassword/verify', validation(UVS.verifyForgetPasswordOTPSchema), US.verifyForgetPasswordOTP);
userRouter.post('/resetPassword', validation(UVS.resetPasswordSchema), US.resetPassword);
userRouter.get('/profile/:id', validation(UVS.getProfileSchema), US.getProfileForAll);

// =======================
// PROTECTED
// =======================
userRouter.use(verifyToken);
userRouter.use(restrictTo(['user', 'admin']));

userRouter.get('/me', US.getMe);
userRouter.post('/logout', US.logout);

userRouter.patch('/email/change', validation(UVS.changeEmailSchema), US.requestEmailChange);
userRouter.patch('/email/cancel', US.cancelEmailChange);

userRouter.patch('/2fa', validation(UVS.toggle2FASchema), US.toggle2FA);
userRouter.patch('/updateProfile', US.updateProfile);
userRouter.patch('/changePassword', validation(UVS.changePasswordSchema), US.changePassword);
userRouter.post('/resendConfirmEmail', US.resendConfirmEmail);

userRouter.patch('/settings', US.updateSettings);
userRouter.delete('/me', US.deleteAccount);

userRouter.get('/fcm-tokens', US.getAllFcmTokens);
userRouter.patch('/fcm-token', validation(UVS.updateFcmTokenSchema), US.updateFcmToken);

// Admin user and permission endpoints
userRouter.get('/all-users', restrictTo(['admin']), requirePermission('manageUsers'), US.getAllUsers);
userRouter.patch('/:userId/permissions', restrictTo(['admin']), validation(UVS.updateAdminPermissionsSchema), US.updateAdminPermissions);

export default userRouter;

