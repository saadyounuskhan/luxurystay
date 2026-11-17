import { ApiError } from '../utils/ApiError.js';
import { ok } from '../utils/response.js';
import { logger } from '../config/logger.js';
import { aiEnabled, askAI, splitLink } from '../services/ai.service.js';
import { concierge } from './extras.controller.js';

export const aiStatus = (req, res) => ok(res, { enabled: aiEnabled() });

// Real AI (Gemini) when GEMINI_API_KEY is set. Otherwise, or if Gemini fails, the built-in concierge answers.
export async function chat(req, res) {
  const message = String(req.body.message || '').trim();
  if (!message) throw new ApiError(400, 'Type a question');
  if (!aiEnabled()) return concierge(req, res);
  try {
    const history = Array.isArray(req.body.history) ? req.body.history.filter((h) => h && typeof h.text === 'string') : [];
    const { answer, tools } = await askAI({ message, history, user: req.user });
    const { answer: text, link } = splitLink(answer);
    return ok(res, { answer: text, link, suggestions: [], ai: true, tools });
  } catch (err) {
    logger.warn(`Gemini failed, using built-in concierge: ${err.message}`);
    return concierge(req, res);
  }
}
