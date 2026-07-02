import mongoose from 'mongoose';
import { categories } from '../config/CONSTANTS.js';

const { Schema } = mongoose;

const taskSchema = new Schema(
    {
        title: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        dueDate: { type: Date, required: true },
        priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
        status: { type: String, enum: ['pending', 'in-progress', 'completed'], default: 'pending' },
        category: { type: String, enum: Object.values(categories), default: categories.general },
        projectId: { type: Schema.Types.ObjectId, ref: 'Project', index: true },
        pointsReward: { type: Number, default: 25, min: 0 },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        subtasks: [{ type: Schema.Types.ObjectId, ref: 'SubTask' }]
    },
    { timestamps: true }
);

export default mongoose.model('Task', taskSchema);

