import mongoose from 'mongoose';

const { Schema } = mongoose;

const leaderboardSnapshotSchema = new Schema(
    {
        weekEnding: { type: Date, required: true, index: true },
        winners: [
            {
                userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
                firstName: { type: String, required: true },
                lastName: { type: String, required: true },
                weeklyPoints: { type: Number, required: true },
                rank: { type: Number, required: true },
                bonusCoins: { type: Number, required: true }
            }
        ]
    },
    { timestamps: true }
);

export default mongoose.model('LeaderboardSnapshot', leaderboardSnapshotSchema);
