import mongoose from 'mongoose';
import { categories } from '../config/CONSTANTS.js';

const { Schema } = mongoose;

const projectSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        description: { type: String, trim: true },
        category: { type: String, enum: Object.values(categories), default: categories.general },
        createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true }
    },
    { timestamps: true }
);

export default mongoose.model('Project', projectSchema);
