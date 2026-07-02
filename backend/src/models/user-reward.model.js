import mongoose from 'mongoose';

const { Schema } = mongoose;

const userRewardSchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        rewardId: { type: Schema.Types.ObjectId, ref: 'Reward', required: true }
    },
    { timestamps: true }
);

// Prevent duplicate purchases of the same reward by the same user
userRewardSchema.index({ userId: 1, rewardId: 1 }, { unique: true });

export default mongoose.model('UserReward', userRewardSchema);
