import rateLimit from 'express-rate-limit';

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, 
  max: 1000000, // Effectively disabled
  message: { error: 'Disabled' }
});

export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 1000000, // Effectively disabled
  message: { error: 'Disabled' }
});

export const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000000, // Effectively disabled
  message: { error: 'Disabled' }
});
