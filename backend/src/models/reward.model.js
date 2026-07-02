import mongoose from 'mongoose';

const { Schema } = mongoose;

const rewardSchema = new Schema(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        cost: { type: Number, required: true, min: 0 },
        type: { type: String, enum: ['theme', 'avatarFrame', 'iconPack'], required: true },
        value: { type: String, required: true }
    },
    { timestamps: true }
);

export default mongoose.model('Reward', rewardSchema);
