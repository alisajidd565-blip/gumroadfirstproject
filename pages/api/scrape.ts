import type { NextApiRequest, NextApiResponse } from 'next';
import { requireAuth } from '@/lib/auth';
import { scrapeArticle } from '@/lib/scraper';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  const payload = requireAuth(req, res);
  if (!payload) return;

  const { url } = req.body as { url?: string };

  if (!url || typeof url !== 'string' || !url.trim()) {
    return res.status(400).json({ error: 'A URL is required.' });
  }

  try {
    const result = await scrapeArticle(url.trim());

    return res.status(200).json({
      title: result.title,
      text: result.text,
      word_count: result.wordCount,
    });
  } catch (err) {
    const message = err instanceof Error
      ? err.message
      : 'Failed to extract article content. Please try pasting the text manually.';

    return res.status(422).json({ error: message });
  }
}
