import express from 'express';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import cors from 'cors';
import facilityRoutes from './routes/FacilityRoutes.ts';
import { User, WorkRequest } from './models/FacilityModels.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // CORS Configuration
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:5173',
    process.env.FRONTEND_URL
  ].filter(Boolean) as string[];

  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.some(allowed => origin.startsWith(allowed) || allowed === origin)) {
        callback(null, true);
      } else {
        console.warn(`🚫 CORS blocked for origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true
  }));

  // MongoDB Connection
  const MONGODB_URI = process.env.MONGODB_URI;
  let isDbConnected = false;

  if (MONGODB_URI) {
    const maskedUri = MONGODB_URI.replace(/\/\/.*@/, '//****:****@');
    console.log(`📡 Attempting to connect to MongoDB: ${maskedUri}`);
    
    mongoose.connect(MONGODB_URI)
      .then(() => {
        console.log('✅ Connected to MongoDB');
        isDbConnected = true;
        seedData().catch(err => console.error('❌ Seeding error:', err));
      })
      .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        if (err.message.includes('ECONNREFUSED') && (MONGODB_URI.includes('127.0.0.1') || MONGODB_URI.includes('localhost'))) {
          console.warn('💡 Tip: Your MONGODB_URI is pointing to localhost, but MongoDB might not be running locally in this environment.');
          console.warn('   If you are using AI Studio Build, please provide a remote MongoDB URI (like MongoDB Atlas) in the Secrets panel.');
        }
        console.log('Running in limited mode without database persistence.');
      });
  } else {
    console.warn('⚠️ MONGODB_URI not found in environment variables.');
    console.warn('💡 Tip: To enable persistence, please set the MONGODB_URI environment variable in your project settings/secrets.');
    console.warn('   Example: mongodb+srv://<user>:<password>@cluster.mongodb.net/dbname');
  }

  app.use(express.json({ limit: '50mb' }));

  // Middleware to check DB connection for API routes
  app.use('/api', (req, res, next) => {
    if (!isDbConnected) {
      if (req.method === 'GET') {
        // For GET requests, we can try to proceed but warn, 
        // or return 503 if we want to be strict.
        // Let's be strict to avoid UI hanging while Mongoose buffers.
        return res.status(503).json({ 
          error: 'Database connection unavailable',
          details: 'The server is running but cannot connect to MongoDB. Please check your MONGODB_URI secret.'
        });
      }
      return res.status(503).json({ 
        error: 'Database connection unavailable',
        details: 'Write operations are disabled without a database connection. Please configure MONGODB_URI.'
      });
    }
    next();
  });

  // API Routes
  app.use('/api', facilityRoutes);

  // Seed Data Function
  async function seedData() {
    try {
      const userCount = await User.countDocuments();
      console.log(`📊 Current user count: ${userCount}`);
      if (userCount === 0) {
        console.log('🌱 Seeding initial data...');
        
        const hashedPassword = await bcrypt.hash('qwerty', 10);

        const admin = await User.create({
          name: 'Supervisor Mark',
          username: 'admin',
          email: 'mark@mahsa.edu.my',
          password: hashedPassword,
          role: 'admin',
          department: 'Facilities',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mark'
        });

        const manager = await User.create({
          name: 'Facility Manager Alex',
          username: 'manager',
          email: 'alex@mahsa.edu.my',
          password: hashedPassword,
          role: 'manager',
          department: 'Management',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
        });

        const tech = await User.create({
          name: 'Mike Johnson',
          username: 'mike',
          email: 'mike@mahsa.edu.my',
          password: hashedPassword,
          role: 'technician',
          department: 'Medical Equipment',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike'
        });

        await WorkRequest.create([
          {
            wrId: 'WR-2026-001',
            userId: admin._id,
            userName: 'Dr. Sarah Ahmad',
            department: 'Cardiology',
            block: 'Block A',
            floor: '3rd Floor',
            room: 'Room 305',
            location: 'Block A, 3rd Floor, Room 305',
            category: 'Medical Equipment',
            pic: 'Nurse Jane',
            contactNumber: '+60123456789',
            priority: 'CRITICAL',
            status: 'IN PROGRESS',
            description: 'Defibrillator not charging'
          },
          {
            wrId: 'WR-2026-002',
            userId: admin._id,
            userName: 'Nurse Maria Santos',
            department: 'Emergency',
            block: 'Block B',
            floor: '1st Floor',
            room: 'ER-2',
            location: 'Block B, 1st Floor, ER-2',
            category: 'HVAC',
            pic: 'Maintenance Team',
            contactNumber: '+60198765432',
            priority: 'HIGH',
            status: 'ASSIGNED',
            description: 'AC leaking water'
          }
        ]);
        console.log('✅ Seeding complete');
      }
    } catch (err: any) {
      console.error('❌ Seed data failed:', err.message);
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
