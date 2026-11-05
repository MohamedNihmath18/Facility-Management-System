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
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      
      if (
        allowedOrigins.some(allowed => origin.startsWith(allowed) || allowed === origin) ||
        origin.endsWith('.netlify.app') ||
        origin.includes('localhost')
      ) {
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
        console.log('✅ Connected to MongoDB successfully');
        isDbConnected = true;
        seedData().catch(err => console.error('❌ Seeding error:', err));
      })
      .catch(err => {
        isDbConnected = false;
        console.error('❌ MongoDB connection error:', err.message);
        if (err.message.includes('ECONNREFUSED')) {
          console.error('   CRITICAL: MongoDB connection refused. Ensure your MONGODB_URI is correct and accessible.');
        }
      });
  } else {
    console.warn('⚠️ MONGODB_URI not found in environment variables.');
  }

  app.use(express.json({ limit: '50mb' }));

  // Middleware to check DB connection for API routes
  app.use('/api', (req, res, next) => {
    if (!isDbConnected) {
      if (req.method === 'GET') {
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

  // Seed Data Function (only creates default users if DB is completely empty)
  async function seedData() {
    try {
      const userCount = await User.countDocuments();
      console.log(`📊 Current user count: ${userCount}`);
      if (userCount === 0) {
        console.log('🌱 Seeding initial users...');
        const hashedPassword = await bcrypt.hash('password123', 10);

        await User.create([
          {
            name: 'Supervisor Mark',
            username: 'admin',
            email: 'mark@mahsa.edu.my',
            password: hashedPassword,
            role: 'admin',
            department: 'Facilities',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mark'
          },
          {
            name: 'Facility Manager Alex',
            username: 'manager',
            email: 'alex@mahsa.edu.my',
            password: hashedPassword,
            role: 'manager',
            department: 'Management',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex'
          },
          {
            name: 'Mike Johnson',
            username: 'mike',
            email: 'mike@mahsa.edu.my',
            password: hashedPassword,
            role: 'technician',
            department: 'Medical Equipment',
            avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike'
          }
        ]);
        console.log('✅ Initial users seeded');
      }
    } catch (err: any) {
      console.error('❌ Seed data failed:', err.message);
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
