import mongoose from 'mongoose';

const { Schema } = mongoose;

const notificationSchema = new Schema(
    {
        title: { type: String, required: true },
        body: { type: String, required: true },
        type: { type: String, required: true },
        recipient: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
        isRead: { type: Boolean, default: false }
    },
    { timestamps: true }
);

export default mongoose.model('Notification', notificationSchema);
