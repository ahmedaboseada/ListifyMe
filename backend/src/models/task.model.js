import mongoose from 'mongoose';

const { Schema } = mongoose;

const taskSchema = new Schema(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        dueDate: { type: Date, required: true },
        priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
        status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
        category: { type: String, trim: true, default: 'General' },
        pointsReward: { type: Number, default: 10, min: 0 },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        subtasks: [{ type: Schema.Types.ObjectId, ref: 'SubTask' }]
    },
    { timestamps: true }
);

export default mongoose.model('Task', taskSchema);
