import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import configs to ensure self-initializations kick in
import './config/firebase';
import { initializeMeilisearch } from './config/meilisearch';
import './config/redis';

// Start Background Workers
import './workers/pdf.processor';
import { startULIIPoller } from './workers/ulii.poller';

// Routes
import authRoutes from './routes/auth.routes';
import usersRoutes from './routes/users.routes';
import documentsRoutes from './routes/documents.routes';
import categoriesRoutes from './routes/categories.routes';
import searchRoutes from './routes/search.routes';
import precedentsRoutes from './routes/precedents.routes';
import requestsRoutes from './routes/requests.routes';
import notificationsRoutes from './routes/notifications.routes';

// Middleware
import { errorHandler } from './middleware';
import { globalLimiter, searchLimiter } from './middleware/rateLimit';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable trust proxy for correct IP detection in Docker/Proxies
app.set('trust proxy', 1);

// Limiters are now imported from middleware/rateLimit

// Security Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Required for cross-origin PDF viewing
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "script-src": ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
      "worker-src": ["'self'", "blob:", "https://cdnjs.cloudflare.com"],
      "img-src": ["'self'", "data:", "blob:", "https://*"],
      "connect-src": ["'self'", "https://*"],
    },
  },
}));

// Setup allowed origins from env, defaulting to local dev URL
const allowedOrigins = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:5173'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
}));

const isProd = process.env.NODE_ENV === 'production';
app.use(morgan(isProd ? 'combined' : 'dev'));
app.use(express.json());

// Apply global limiter
app.use(globalLimiter);

// Main Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/search', searchLimiter, searchRoutes);
app.use('/api/precedents', precedentsRoutes);
app.use('/api/requests', requestsRoutes);
app.use('/api/notifications', notificationsRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// Global Error Handler
app.use(errorHandler);

// Initialize Meilisearch and start server
initializeMeilisearch().then(async () => {
  // Seed initial categories if needed
  const { categoriesService } = await import('./services/categories.service');
  await categoriesService.seedDefaultCategories();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    // Start the ULII poller after server is up
    startULIIPoller();
  });
}).catch(err => {
  console.error('Failed to initialize dependencies:', err);
  process.exit(1);
});
