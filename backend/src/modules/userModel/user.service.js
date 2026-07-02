import userModel from '../../models/user.model.js';
import { OAuth2Client } from 'google-auth-library';
import { revokeTokenModel } from '../../models/revoke-token.model.js';

import * as HT from '../../utils/hash/index.js';
import * as ET from '../../utils/encryption/index.js';
import * as VT from '../../utils/token/index.js';
import { otp6 } from '../../utils/index.js';
import { nanoid } from 'nanoid';

import { sendEmailEvent, sendOTPEvent, sendEmailChangeConfirmEvent } from '../../utils/sendEmail-events/index.js';

const isAdminPrefix = (user) => user?.type === 'admin';

const publicUser = async (u) => {
    let decryptedPhone = u.phone;
    if (u.phone) {
        try { decryptedPhone = await ET.decrypt(u.phone); } catch (err) { }
    }
    let decryptedFcm = u.fcmToken;
    if (u.fcmToken) {
        try { decryptedFcm = await ET.decrypt(u.fcmToken); } catch (err) { }
    }
    return {
        id: String(u._id),
        type: u.type,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        twoFA: u.twoFA,
        profilePicture: u.profilePicture,
        confirmed: u.confirmed,
        pendingEmail: u.pendingEmail,
        pendingEmailRequestedAt: u.pendingEmailRequestedAt,
        phone: decryptedPhone,
        fcmToken: decryptedFcm,
        subscriptionType: u.subscriptionType,
        coins: u.coins,
        weeklyPoints: u.weeklyPoints,
        language: u.language,
        settings: u.settings,
        createdAt: u.createdAt,
    };
};

export const signup = async (req, res) => {
    try {
        const {
            firstName,
            lastName,
            email,
            password,
            type,
            twoFA,
            fcmToken,
            language,
        } = req.body;

        const emailNorm = email.toLowerCase().trim();

        const exists = await userModel.findOne({ email: emailNorm }).lean();
        if (exists) return res.status(400).json({ message: "Email already exists." });

        const hashedPassword = await HT.hash({
            plainText: password,
            SALT_ROUNDS: Number(process.env.SALT_ROUNDS || 12),
        });

        const encryptedFcmToken = fcmToken ? await ET.encrypt(fcmToken) : undefined;

        const user = await userModel.create({
            type: type || 'user',
            firstName,
            lastName,
            email: emailNorm,
            password: hashedPassword,
            fcmToken: encryptedFcmToken,
            twoFA: !!twoFA,
            language: language || 'en',
        });

        // Tokens
        const confirmTokenId = nanoid();
        user.confirmTokenId = confirmTokenId;
        await user.save();

        sendEmailEvent({
            email: user.email,
            name: `${user.firstName} ${user.lastName}`,
            tokenId: confirmTokenId
        }).catch(console.error);

        // tokens
        const tokenId = nanoid();
        const accessToken = isAdminPrefix(user)
            ? await VT.generateAdminAccessToken(user, "1h", tokenId)
            : await VT.generateUserAccessToken(user, "1h", tokenId);

        const refreshToken = isAdminPrefix(user)
            ? await VT.generateAdminRefreshToken(user, process.env.JWT_EXPIRES_IN || "7d", tokenId)
            : await VT.generateUserRefreshToken(user, process.env.JWT_EXPIRES_IN || "7d", tokenId);

        const payload = {
            message: "User created successfully. Please confirm your email.",
            user: await publicUser(user),
            accessToken,
            refreshToken,
        };

        return res.status(201).json(payload);
    } catch (err) {
        console.error("Signup error:", err.message);
        return res.status(500).json({ message: "Internal server error." });
    }
};

export const signin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await userModel.findOne({ email: email.toLowerCase().trim() }).select('+password').lean();
        if (!user) return res.status(404).json({ message: 'User Not Found' });
        if (!user.confirmed) return res.status(400).json({ message: 'Email Not Confirmed' });

        const ok = await HT.compareHash({ plainText: password, cypherText: user.password });
        if (!ok) return res.status(400).json({ message: 'Invalid credentials' });

        if (user.twoFA) {
            const otp = otp6();
            const otpEnc = await ET.encrypt(otp);
            const otpExpires = new Date(Date.now() + 5 * 60 * 1000);
            await userModel.updateOne({ _id: user._id }, { otp: otpEnc, otpExpires });

            sendOTPEvent({ email: user.email, otp, name: `${user.firstName} ${user.lastName}` }).catch(console.error);

            const challengeToken = VT.generate2FAToken(user._id, '5m');
            return res.status(200).json({ message: 'OTP sent', requiresOtp: true, challengeToken });
        }

        const tokenId = nanoid();
        const accessToken = isAdminPrefix(user) ? await VT.generateAdminAccessToken(user, '1h', tokenId) : await VT.generateUserAccessToken(user, '1h', tokenId);
        const refreshToken = isAdminPrefix(user) ? await VT.generateAdminRefreshToken(user, process.env.JWT_EXPIRES_IN || '7d', tokenId) : await VT.generateUserRefreshToken(user, process.env.JWT_EXPIRES_IN || '7d', tokenId);

        return res.status(200).json({
            message: 'User Logged In Successfully',
            user: await publicUser(user),
            accessToken,
            refreshToken,
        });
    } catch (err) {
        console.error("Signin error:", err.message);
        return res.status(500).json({ message: "Internal server error." });
    }
};

export const signinWithOtp = async (req, res) => {
    try {
        const { challengeToken, otp } = req.body;

        let decoded;
        try {
            decoded = VT.verify2FAToken(challengeToken);
        } catch {
            return res.status(401).json({ message: 'Unauthorized' });
        }
        if (decoded?.purpose !== '2fa') return res.status(401).json({ message: 'Unauthorized' });

        const user = await userModel.findById(decoded.id).select('+otp +otpExpires');
        if (!user) return res.status(404).json({ message: 'User Not Found' });
        if (!user.otp) return res.status(400).json({ message: 'Invalid OTP' });
        if (user.otpExpires && Date.now() > user.otpExpires) return res.status(400).json({ message: 'OTP Expired' });

        const otpPlain = await ET.decrypt(user.otp);
        if (String(otpPlain) !== String(otp)) return res.status(400).json({ message: 'Invalid OTP' });

        await userModel.updateOne({ _id: user._id }, { $unset: { otp: 1, otpExpires: 1 } });

        const tokenId = nanoid();
        const accessToken = isAdminPrefix(user) ? await VT.generateAdminAccessToken(user, '1h', tokenId) : await VT.generateUserAccessToken(user, '1h', tokenId);
        const refreshToken = isAdminPrefix(user) ? await VT.generateAdminRefreshToken(user, process.env.JWT_EXPIRES_IN || '7d', tokenId) : await VT.generateUserRefreshToken(user, process.env.JWT_EXPIRES_IN || '7d', tokenId);

        return res.status(200).json({
            message: 'User Logged In Successfully',
            user: await publicUser(user),
            accessToken,
            refreshToken,
        });
    } catch (err) {
        console.error("SigninWithOtp error:", err.message);
        return res.status(500).json({ message: "Internal server error." });
    }
};

export const confirmEmail = async (req, res) => {
    try {
        const { token } = req.params;
        const decoded = VT.verifyConfirmEmailToken(token);
        if (!decoded?.email) return res.status(400).json({ message: 'Invalid Token' });

        const user = await userModel.findOne({ email: decoded.email.toLowerCase().trim() }).select('+confirmTokenId');
        if (!user) return res.status(404).json({ message: 'User Not Found' });
        if (user.confirmed) return res.status(400).json({ message: 'Email Already Confirmed' });
        if (!user.confirmTokenId || decoded.jti !== user.confirmTokenId) return res.status(400).json({ message: 'Token invalid or revoked' });

        user.confirmed = true;
        user.confirmTokenId = undefined; // Single-use
        await user.save();
        return res.status(200).json({ message: 'Email Confirmed Successfully' });
    } catch (err) {
        if (err?.name === 'JsonWebTokenError') return res.status(400).json({ message: 'Invalid Token' });
        if (err?.name === 'TokenExpiredError') return res.status(400).json({ message: 'Token Expired' });
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const requestEmailChange = async (req, res) => {
    try {
        const { newEmail } = req.body;

        const user = await userModel.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User Not Found' });

        const exists = await userModel.findOne({ email: newEmail.toLowerCase().trim() }).lean();
        if (exists) return res.status(400).json({ message: 'Email already exists.' });

        const emailChangeTokenId = nanoid();
        user.pendingEmail = newEmail.toLowerCase().trim();
        user.pendingEmailRequestedAt = new Date();
        user.confirmed = false;
        user.emailChangeTokenId = emailChangeTokenId;
        await user.save();

        sendEmailChangeConfirmEvent({
            email: user.pendingEmail,
            name: `${user.firstName} ${user.lastName}`,
            userId: user._id,
            oldEmail: user.email,
            newEmail: user.pendingEmail,
            tokenId: emailChangeTokenId
        }).catch(console.error);

        return res.status(200).json({ message: 'Confirmation email sent to new email address.' });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const cancelEmailChange = async (req, res) => {
    try {
        const user = await userModel.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User Not Found' });

        if (!user.pendingEmail) return res.status(400).json({ message: 'No pending email change' });

        user.pendingEmail = undefined;
        user.pendingEmailRequestedAt = undefined;
        user.confirmed = true;

        await user.save();
        return res.status(200).json({ message: 'Email change cancelled' });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const confirmEmailChange = async (req, res) => {
    try {
        const { token } = req.params;
        const decoded = VT.verifyEmailChangeToken(token);
        if (!decoded || decoded.purpose !== 'email_change') return res.status(400).json({ message: 'Invalid Token' });

        const user = await userModel.findById(decoded.id).select('+emailChangeTokenId');
        if (!user) return res.status(404).json({ message: 'User Not Found' });

        const newEmail = String(decoded.newEmail || '').toLowerCase().trim();
        if (!user.pendingEmail || user.pendingEmail !== newEmail) return res.status(400).json({ message: 'No pending email change' });
        if (!user.emailChangeTokenId || decoded.jti !== user.emailChangeTokenId) return res.status(400).json({ message: 'Token invalid or revoked' });

        const exists = await userModel.findOne({ email: newEmail }).lean();
        if (exists && String(exists._id) !== String(user._id)) return res.status(400).json({ message: 'Email already exists.' });

        user.email = newEmail;
        user.pendingEmail = undefined;
        user.pendingEmailRequestedAt = undefined;
        user.confirmed = true;
        user.emailChangeTokenId = undefined;

        await user.save();
        return res.status(200).json({ message: 'Email changed and confirmed successfully' });
    } catch (err) {
        if (err?.name === 'JsonWebTokenError') return res.status(400).json({ message: 'Invalid Token' });
        if (err?.name === 'TokenExpiredError') return res.status(400).json({ message: 'Token Expired' });
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const toggle2FA = async (req, res) => {
    try {
        const { enabled } = req.body;

        const user = await userModel.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User Not Found' });

        user.twoFA = !!enabled;
        if (!user.twoFA) user.otp = undefined;

        await user.save();
        return res.status(200).json({ message: '2FA updated', twoFA: user.twoFA });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const getMe = async (req, res) => {
    try {
        const user = await userModel.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User Not Found' });

        // Auto renew or grace period logic
        if (user.subscriptionType === 'pro' && user.subscriptionExpiresAt) {
            const now = new Date();
            const expires = new Date(user.subscriptionExpiresAt);
            if (now > expires) {
                const gracePeriodEnd = new Date(expires.getTime() + 3 * 24 * 60 * 60 * 1000);
                if (now > gracePeriodEnd) {
                    if (user.paymentMethod === 'coins') {
                        if (user.coins >= 10000) {
                            user.coins -= 10000;
                            user.subscriptionExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                            await user.save();
                        } else {
                            user.subscriptionType = 'free';
                            user.subscriptionExpiresAt = undefined;
                            await user.save();
                        }
                    } else {
                        // cash auto renew mock
                        user.subscriptionExpiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
                        await user.save();
                    }
                }
            }
        }

        return res.status(200).json({ user: await publicUser(user) });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const getProfileForAll = async (req, res) => {
    try {
        const { id } = req.params;
        const user = await userModel.findById(id).lean();
        if (!user) return res.status(404).json({ message: 'User Not Found' });

        return res.status(200).json({ user: await publicUser(user) });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const logout = async (req, res) => {
    try {
        const tokenId = req.user.jti;
        const expiredAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
        await revokeTokenModel.create({ tokenId, expiredAt });
        return res.status(200).json({ message: 'Logged Out Successfully' });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const refreshToken = async (req, res) => {
    try {
        const { authorization } = req.headers;
        if (!authorization) return res.status(401).json({ message: 'Unauthorized' });

        const [prefix, token] = authorization.split(' ');
        if (!prefix || !token) return res.status(401).json({ message: 'Unauthorized' });

        const rotate = async (decoded, isAdmin) => {
            const isRevoked = await revokeTokenModel.findOne({ tokenId: decoded.jti }).lean();
            if (isRevoked) return res.status(403).json({ message: 'Please login again' });

            const user = await userModel.findById(decoded.id);
            if (!user) return res.status(404).json({ message: 'User Not Found' });

            const newTokenId = nanoid();
            const expiredAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
            await revokeTokenModel.create({ tokenId: decoded.jti, expiredAt });

            const accessToken = isAdmin ? await VT.generateAdminAccessToken(user, '1h', newTokenId) : await VT.generateUserAccessToken(user, '1h', newTokenId);
            const refreshToken = isAdmin ? await VT.generateAdminRefreshToken(user, '14d', newTokenId) : await VT.generateUserRefreshToken(user, '14d', newTokenId);

            return res.status(200).json({ message: 'Token refreshed', accessToken, refreshToken });
        };

        if (prefix === process.env.PREFIX_ADMIN) {
            return VT.verifyAdminRefreshToken(token, async (err, decoded) => {
                if (err) return res.status(401).json({ message: 'Unauthorized' });
                return rotate(decoded, true);
            });
        }

        if (prefix === process.env.PREFIX_USER) {
            return VT.verifyUserRefreshToken(token, async (err, decoded) => {
                if (err) return res.status(401).json({ message: 'Unauthorized' });
                return rotate(decoded, false);
            });
        }

        return res.status(401).json({ message: 'Unauthorized' });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const requestOTP = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await userModel.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(404).json({ message: 'User Not Found' });

        const otp = otp6();
        const otpEnc = await ET.encrypt(otp);
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000);

        await userModel.updateOne({ _id: user._id }, { otp: otpEnc, otpExpires });

        sendOTPEvent({
            email: user.email,
            otp,
            name: `${user.firstName} ${user.lastName}`,
        }).catch(console.error);

        return res.status(200).json({ message: 'OTP sent' });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const checkOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await userModel.findOne({ email: email.toLowerCase().trim() }).select('+otp +otpExpires');
        if (!user) return res.status(404).json({ message: 'User Not Found' });

        if (!user.otp) return res.status(400).json({ message: 'Invalid OTP' });
        if (user.otpExpires && Date.now() > user.otpExpires) return res.status(400).json({ message: 'OTP Expired' });

        const decryptedOtp = await ET.decrypt(user.otp);
        if (String(decryptedOtp) !== String(otp)) return res.status(400).json({ message: 'Invalid OTP' });

        await userModel.updateOne({ _id: user._id }, { $unset: { otp: 1, otpExpires: 1 } });

        return res.status(200).json({ message: 'OTP Verified Successfully' });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const forgetPassword = async (req, res) => {
    try {
        const { email } = req.body;

        const user = await userModel.findOne({ email: email.toLowerCase().trim() });
        if (!user) return res.status(404).json({ message: 'User Not Found' });

        const otp = otp6();
        const otpEnc = await ET.encrypt(otp);

        await userModel.updateOne({ _id: user._id }, { otp: otpEnc });

        await sendOTPEvent({
            email: user.email,
            otp,
            name: `${user.firstName} ${user.lastName}`,
        });

        return res.status(200).json({ message: 'Password reset OTP sent to email' });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const verifyForgetPasswordOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;

        const user = await userModel.findOne({ email: email.toLowerCase().trim() }).select('+otp +otpExpires');
        if (!user) return res.status(404).json({ message: 'User Not Found' });

        if (!user.otp) return res.status(400).json({ message: 'Invalid OTP' });
        if (user.otpExpires && Date.now() > user.otpExpires) return res.status(400).json({ message: 'OTP Expired' });

        const decryptedOtp = await ET.decrypt(user.otp);
        if (String(decryptedOtp) !== String(otp)) return res.status(400).json({ message: 'Invalid OTP' });

        await userModel.updateOne({ _id: user._id }, { $unset: { otp: 1, otpExpires: 1 } });

        const resetTokenId = nanoid();
        user.resetTokenId = resetTokenId;
        await user.save();

        const resetToken = VT.generateResetPasswordToken(user._id, '15m', resetTokenId);

        return res.status(200).json({ message: 'OTP Verified Successfully', resetToken });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const updateProfile = async (req, res) => {
    try {
        const patch = { ...req.body };
        if (req.files?.avatar?.[0]?.cloudinaryUrl) {
            patch.profilePicture = req.files.avatar[0].cloudinaryUrl;
        }

        if (patch.phone) patch.phone = await ET.encrypt(patch.phone);

        // Security locks on email change
        delete patch.email;
        delete patch.password;
        delete patch.type;
        delete patch.confirmed;
        delete patch.coins;
        delete patch.weeklyPoints;

        const user = await userModel.findByIdAndUpdate(req.user.id, patch, { new: true });
        if (!user) return res.status(404).json({ message: 'User Not Found' });

        return res.status(200).json({ message: 'Profile Updated Successfully', user: await publicUser(user) });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;

        const user = await userModel.findById(req.user.id).select('+password');
        if (!user) return res.status(404).json({ message: 'User Not Found' });

        const ok = await HT.compareHash({ plainText: oldPassword, cypherText: user.password });
        if (!ok) return res.status(400).json({ message: 'Incorrect old password' });

        const hashedPassword = await HT.hash({
            plainText: newPassword,
            SALT_ROUNDS: Number(process.env.SALT_ROUNDS || 12),
        });

        user.password = hashedPassword;
        await user.save();

        return res.status(200).json({ message: 'Password changed successfully' });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const resetPassword = async (req, res) => {
    try {
        const { resetToken, newPassword } = req.body;

        let decoded;
        try {
            decoded = VT.verifyResetPasswordToken(resetToken);
        } catch {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        if (decoded?.purpose !== 'reset_password') return res.status(400).json({ message: 'Invalid token purpose' });

        const user = await userModel.findById(decoded.id).select('+resetTokenId');
        if (!user) return res.status(404).json({ message: 'User Not Found' });
        if (!user.resetTokenId || decoded.jti !== user.resetTokenId) return res.status(400).json({ message: 'Token invalid or revoked' });

        const hashedPassword = await HT.hash({
            plainText: newPassword,
            SALT_ROUNDS: Number(process.env.SALT_ROUNDS || 12),
        });

        user.password = hashedPassword;
        user.resetTokenId = undefined; // Revoke
        await user.save();

        return res.status(200).json({ message: 'Password reset successfully' });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const googleAuth = async (req, res) => {
    try {
        const { idToken, userType } = req.body;

        const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
        const ticket = await client.verifyIdToken({
            idToken,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

        const payload = ticket.getPayload();
        const { email, given_name, family_name, picture } = payload;

        let user = await userModel.findOne({ email: email.toLowerCase().trim() });

        if (!user) {
            const randomPassword = await HT.hash({
                plainText: nanoid(16) + 'A1!a',
                SALT_ROUNDS: Number(process.env.SALT_ROUNDS || 12)
            });

            user = await userModel.create({
                type: userType && ['admin', 'user'].includes(userType) ? userType : 'user',
                firstName: given_name || 'Google',
                lastName: family_name || 'User',
                email: email.toLowerCase().trim(),
                password: randomPassword,
                profilePicture: picture || '',
                confirmed: true,
            });
        }

        const tokenId = nanoid();
        const accessToken = isAdminPrefix(user)
            ? await VT.generateAdminAccessToken(user, '1h', tokenId)
            : await VT.generateUserAccessToken(user, '1h', tokenId);

        const refreshToken = isAdminPrefix(user)
            ? await VT.generateAdminRefreshToken(user, process.env.JWT_EXPIRES_IN || '7d', tokenId)
            : await VT.generateUserRefreshToken(user, process.env.JWT_EXPIRES_IN || '7d', tokenId);

        return res.status(200).json({
            message: 'Google Auth Successful',
            user: await publicUser(user),
            accessToken,
            refreshToken,
        });

    } catch (err) {
        return res.status(401).json({ message: 'Google Authentication Failed', error: err.message });
    }
};

export const updateSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const { settings, language } = req.body;

        const user = await userModel.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (settings) {
            user.settings = {
                ...user.settings,
                notifications: {
                    ...user.settings?.notifications,
                    ...settings.notifications
                }
            };
        }

        if (language) {
            user.language = language;
        }

        await user.save();

        return res.status(200).json({ message: 'Settings updated successfully', settings: user.settings, language: user.language });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const deleteAccount = async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await userModel.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        await userModel.findByIdAndDelete(userId);

        return res.status(200).json({ message: 'Account permanently deleted successfully.' });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const updateFcmToken = async (req, res) => {
    try {
        const { fcmToken } = req.body;
        if (!fcmToken) return res.status(400).json({ message: 'fcmToken is required' });

        const encryptedFcm = await ET.encrypt(fcmToken);
        const user = await userModel.findByIdAndUpdate(req.user.id, { fcmToken: encryptedFcm }, { new: true });
        if (!user) return res.status(404).json({ message: 'User not found' });

        return res.status(200).json({ message: 'fcmToken updated successfully', fcmToken });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const getAllFcmTokens = async (req, res) => {
    try {
        const users = await userModel.find({ fcmToken: { $exists: true, $ne: null } }).select('fcmToken email firstName lastName');
        const list = [];
        for (const u of users) {
            if (u.fcmToken) {
                try {
                    const decrypted = await ET.decrypt(u.fcmToken);
                    if (decrypted) {
                        list.push({
                            userId: u._id,
                            email: u.email,
                            name: `${u.firstName} ${u.lastName}`,
                            fcmToken: decrypted
                        });
                    }
                } catch (err) {}
            }
        }
        return res.status(200).json({ fcmTokens: list });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const resendConfirmEmail = async (req, res) => {
    try {
        const user = await userModel.findById(req.user.id);
        if (!user) return res.status(404).json({ message: 'User Not Found' });

        if (user.confirmed) return res.status(400).json({ message: 'Email Already Confirmed' });

        const confirmTokenId = nanoid();
        user.confirmTokenId = confirmTokenId;
        await user.save();

        sendEmailEvent({ email: user.email, name: `${user.firstName} ${user.lastName}`, tokenId: confirmTokenId }).catch(console.error);

        return res.status(200).json({ message: 'Confirmation email sent successfully.' });
    } catch (err) {
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const getAllUsers = async (req, res) => {
    try {
        const users = await userModel.find().select('firstName lastName email type adminPermissions confirmed createdAt');
        return res.status(200).json({ users });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

export const updateAdminPermissions = async (req, res) => {
    try {
        const { userId } = req.params;
        const { type, subscriptionType, adminPermissions } = req.body;

        // Retrieve current logged in user to check email
        const currentUser = await userModel.findById(req.user.id);
        if (!currentUser || currentUser.email !== 'ahmedabuseada22@gmail.com') {
            return res.status(403).json({ message: 'Only the super admin (ahmedabuseada22@gmail.com) is allowed to manage admin roles and permissions.' });
        }

        const user = await userModel.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });

        // Enforce that the super admin's own type and permissions cannot be revoked
        if (user.email === 'ahmedabuseada22@gmail.com') {
            return res.status(400).json({ message: 'The super admin account cannot be demoted or have permissions modified.' });
        }

        if (type !== undefined) user.type = type;
        if (subscriptionType !== undefined) user.subscriptionType = subscriptionType;
        if (adminPermissions !== undefined) user.adminPermissions = adminPermissions;

        await user.save();

        return res.status(200).json({ message: 'Permissions updated successfully', user });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: 'Internal server error.' });
    }
};

