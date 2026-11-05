import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'manager', 'supervisor', 'technician', 'staff'], default: 'staff' },
  department: String,
  avatar: String,
  createdAt: { type: Date, default: Date.now }
});

const WorkRequestSchema = new mongoose.Schema({
  wrId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  userName: String,
  department: String,
  block: String,
  floor: String,
  room: String,
  location: String,
  pic: { type: String, default: '' },
  contactNumber: { type: String, default: '' },
  category: { type: String, required: true },
  priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
  status: { 
    type: String, 
    enum: ['OPEN', 'ASSIGNED', 'IN PROGRESS', 'PENDING USER CONFIRMATION', 'CLOSED', 'ON HOLD'], 
    default: 'OPEN' 
  },
  description: String,
  imageUrl: String,
  videoUrl: String,
  activities: [{
    action: String,
    user: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
    imageUrl: String,
    videoUrl: String
  }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const CategorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  description: String,
  createdAt: { type: Date, default: Date.now }
});

const WorkOrderSchema = new mongoose.Schema({
  woId: { type: String, required: true, unique: true },
  wrId: { type: String, ref: 'WorkRequest', required: true },
  category: String,
  assignedTechnician: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  technicianName: String,
  status: { type: String, enum: ['ASSIGNED', 'IN PROGRESS', 'COMPLETED', 'ON HOLD'], default: 'ASSIGNED' },
  startTime: Date,
  endTime: Date,
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const AssetDocumentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  type: { type: String, default: 'Other' },
  url: { type: String, default: '' },
  fileSize: String,
  uploadDate: { type: String, default: () => new Date().toISOString() },
  expiryDate: String,
  notes: String
});

const AssetSchema = new mongoose.Schema({
  no: Number,
  assetName: { type: String, required: true },
  assetNo: { type: String, required: true, unique: true, index: true },
  serialNumber: { type: String, default: '' },
  model: { type: String, default: '' },
  manufacturerName: { type: String, default: '' },
  supplierName: { type: String, default: '' },
  supplierContactNo: { type: String, default: '' },
  location: { type: String, default: '' },
  department: { type: String, default: '' },
  warrantyPeriod: { type: String, default: '' },
  startOfWarranty: { type: String, default: '' },
  endOfWarranty: { type: String, default: '' },
  ppmFrequency: { type: String, default: 'Quarterly' },
  ppm1Planned: { type: String, default: '' },
  ppm1Actual: { type: String, default: '' },
  ppm2Planned: { type: String, default: '' },
  ppm2Actual: { type: String, default: '' },
  ppm3Planned: { type: String, default: '' },
  ppm3Actual: { type: String, default: '' },
  ppm4Planned: { type: String, default: '' },
  ppm4Actual: { type: String, default: '' },
  ppm5Planned: { type: String, default: '' },
  ppm5Actual: { type: String, default: '' },
  ppm6Planned: { type: String, default: '' },
  ppm6Actual: { type: String, default: '' },
  poNo: { type: String, default: '' },
  doNo: { type: String, default: '' },
  invoiceNo: { type: String, default: '' },
  totalAmount: { type: Number, default: 0 },
  lifespan: { type: String, default: '' },
  assetCriticality: { type: String, enum: ['Critical', 'High', 'Medium', 'Low'], default: 'Medium' },
  assetCategory: { type: String, default: 'Medical Equipment' },
  typeOfEquipmentSafety: { type: String, default: '' },
  status: { type: String, default: 'Active' },
  licenseEndDate: { type: String, default: '' },
  documents: [AssetDocumentSchema],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

export const User = mongoose.model('User', UserSchema);
export const WorkRequest = mongoose.model('WorkRequest', WorkRequestSchema);
export const WorkOrder = mongoose.model('WorkOrder', WorkOrderSchema);
export const Category = mongoose.model('Category', CategorySchema);
export const Asset = mongoose.model('Asset', AssetSchema);
