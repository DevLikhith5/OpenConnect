import Call from '../models/Call.js';

export async function listCalls(req, res) {
  try {
    const calls = await Call.find({
      $or: [{ caller: req.userId }, { callee: req.userId }],
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('caller', 'name avatar')
      .populate('callee', 'name avatar')
      .lean();

    res.json({ calls });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
}
