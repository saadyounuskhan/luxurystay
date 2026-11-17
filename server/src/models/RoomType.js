import mongoose from 'mongoose';

const schema = new mongoose.Schema(
  {
    branch: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    description: String,
    basePrice: { type: Number, required: true, min: 0 },
    capacity: { adults: { type: Number, default: 2 }, children: { type: Number, default: 0 } },
    bedType: String,
    sizeSqm: Number,
    amenities: [String],
    images: [{ url: String, publicId: String }],
    view: String,
    model3dUrl: String,
    panoramaUrl: String, // 360° equirectangular photo (2:1)
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);
schema.index({ branch: 1, slug: 1 }, { unique: true });

export const RoomType = mongoose.model('RoomType', schema);
