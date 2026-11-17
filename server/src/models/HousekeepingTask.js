import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    room: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    type: { type: String, enum: ['checkout_clean', 'daily_clean', 'inspection', 'turndown'], default: 'daily_clean' },
    priority: { type: String, enum: ['low', 'normal', 'high'], default: 'normal' },
    assignedTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    status: { type: String, enum: ['pending', 'in_progress', 'done', 'inspected'], default: 'pending' },
    dueAt: Date,
    startedAt: Date,
    completedAt: Date,
    notes: String,
  },
  { timestamps: true }
);
schema.index({ assignedTo: 1, status: 1 });

export const HousekeepingTask = mongoose.model('HousekeepingTask', schema);
