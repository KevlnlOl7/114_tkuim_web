import express from 'express';
import cors from 'cors';
// 作業要求：後端-3 使用 dotenv 管理 PORT、ALLOWED_ORIGIN。
import { config } from 'dotenv';
import { router as signupRouter } from './routes/signup.js';

config();

// 作業要求：後端-3 使用 dotenv 管理 PORT、ALLOWED_ORIGIN。
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.ALLOWED_ORIGIN?.split(',') ?? '*' }));
app.use(express.json());
app.use('/api/signup', signupRouter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 作業要求：後端-4 有基礎錯誤處理（404、500）。
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

// 作業要求：後端-4 有基礎錯誤處理（404、500）。
app.use((error, req, res, next) => {
  console.error('[Server Error]', error.message);
  res.status(500).json({ error: 'Server Error' });
});

app.listen(PORT, () => {
  console.log(`Server ready on http://localhost:${PORT}`);
});