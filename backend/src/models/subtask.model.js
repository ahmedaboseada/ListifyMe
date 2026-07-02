import mongoose from 'mongoose';

const { Schema } = mongoose;

const subtaskSchema = new Schema(
    {
        taskId: { type: Schema.Types.ObjectId, ref: 'Task', required: true, index: true },
        title: { type: String, required: true, trim: true },
        status: { type: String, enum: ['pending', 'completed'], default: 'pending' },
        pointsReward: { type: Number, default: 2, min: 0 }
    },
    { timestamps: true }
);

export default mongoose.model('SubTask', subtaskSchema);
