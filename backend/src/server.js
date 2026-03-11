import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRoutes from './routes/api.js';
import { paystackWebhook } from './controllers/paymentsController.js';

const app = express();
app.set('trust proxy', 1);
const PORT = process.env.PORT || 3001;

app.use(helmet());

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_2,
].filter(Boolean);
app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server (no origin) and explicitly listed origins only
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(morgan('combined'));

// Must be before express.json()
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), paystackWebhook);

app.use(express.json());

app.get('/', (_, res) => res.json({ message: 'Pharmacy Pilot API', docs: '/api', health: '/health' }));
app.use('/api', apiRoutes);
app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Pharmacy API running on http://localhost:${PORT}`);
});
