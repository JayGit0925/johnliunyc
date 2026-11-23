// Founder intake -> Resend email notification (+ founder confirmation copy).
// Requires env vars on the Vercel project: RESEND_API_KEY, RESEND_FROM.
module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method not allowed' }); return; }
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  if (!key || !from) { res.status(500).json({ error: 'email not configured' }); return; }
  let data = req.body;
  if (typeof data === 'string') { try { data = JSON.parse(data); } catch (e) { data = {}; } }
  data = data || {};

  const rows = [
    ['Name', data.name], ['Business', data.biz], ['Email', data.email], ['Phone', data.phone],
    ['Stage', data.stage], ['Built (chips)', data.built_chips], ['Built (words)', data.built_text],
    ['Turn (shape)', data.turn_shape], ['Turn (moment)', data.turn_text],
    ['Serves (chips)', data.serve_chips], ['Serves (words)', data.serve_text],
    ['The one line', data.say_text],
    ['TASTE feel', data.feel], ['TASTE color', data.color], ['TASTE photo', data.photo],
    ['TASTE headline', data.headline], ['TASTE visitor action', data.cta],
    ['Admires', data.admire_text], ['Timeline', data.timeline_text],
    ['Files noted', data.files_note]
  ];
  const text = rows.map(([k, v]) => `${k}: ${v && String(v).trim() ? String(v).trim() : '—'}`).join('\n');

  async function send(payload) {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return r;
  }

  try {
    const notify = await send({
      from,
      to: ['jayli@shippingcow.ai'],
      reply_to: data.email || undefined,
      subject: `New founder intake — ${data.name || 'unnamed founder'}`,
      text: `A founder just completed the story & taste intake.\n\n${text}\n\nNext step: book the founder interview.`
    });
    if (!notify.ok) {
      const detail = (await notify.text()).slice(0, 300);
      res.status(502).json({ error: 'send failed', detail });
      return;
    }
    if (data.email) {
      await send({
        from,
        to: [data.email],
        subject: 'Your story & taste — received',
        text: `Thank you — your story and taste are in.\n\nWhat happens next:\n1. We run your AI audit — what ChatGPT, Gemini and the rest say about you today.\n2. Your founder interview is scheduled — your story, in your voice.\n3. Your website arrives in three designs, built on the taste you picked.\n\n— ShippingCow, for John Liu`
      }).catch(() => {});
    }
    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'server error' });
  }
};
