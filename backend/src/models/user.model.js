import mongoose from 'mongoose';

const { Schema } = mongoose;

const userSchema = new Schema(
    {
        type: { type: String, enum: ['user', 'admin'], default: 'user', required: true, index: true },

        firstName: { type: String, required: true, trim: true, maxlength: 60 },
        lastName: { type: String, required: true, trim: true, maxlength: 60 },

        email: { type: String, required: true, lowercase: true, trim: true, unique: true, index: true },
        password: { type: String, required: true, select: false },

        phone: { type: String }, // encrypted
        fcmToken: { type: String }, // encrypted
        profilePicture: { type: String, default: '' },

        twoFA: { type: Boolean, default: false },
        otp: { type: String, select: false }, // encrypted 6 digits (temporary)
        otpExpires: { type: Date, select: false },

        confirmed: { type: Boolean, default: false },

        // email change flow
        pendingEmail: { type: String, lowercase: true, trim: true },
        pendingEmailRequestedAt: { type: Date },

        // Tokens and Expirations Tracking for Auth
        confirmTokenId: { type: String, select: false },
        resetTokenId: { type: String, select: false },
        emailChangeTokenId: { type: String, select: false },

        // ListifyMe Task Manager Specific Fields
        subscriptionType: { type: String, enum: ['free', 'pro', 'lifetime'], default: 'free' },
        subscriptionExpiresAt: { type: Date },
        trialUsed: { type: Boolean, default: false },
        paymentMethod: { type: String, enum: ['cash', 'coins'], default: 'cash' },
        autoRenew: { type: Boolean, default: false },
        gracePeriodStartedAt: { type: Date },
        coins: { type: Number, default: 0, min: 0 },
        weeklyPoints: { type: Number, default: 0, min: 0 },
        language: { type: String, default: 'en' },
        adminPermissions: { 
            type: [String], 
            enum: ['manageUsers', 'manageTasks', 'manageRewards', 'manageLeaderboard', 'manageSystem'], 
            default: [] 
        },

        settings: {
            notifications: {
                push: { type: Boolean, default: true },
                email: { type: Boolean, default: true }
            }
        }
    },
    { timestamps: true }
);

export default mongoose.model('User', userSchema);
