// ============================================
// SEQUENCES ROUTES
// ============================================
const router = require('express').Router();
const { query } = require('../models/db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const result = await query(
      `SELECT * FROM sequences WHERE tenant_id = $1 ORDER BY is_template DESC, created_at DESC`,
      [req.tenantId]
    );
    res.json({ sequences: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await query(
      'SELECT * FROM sequences WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Sequence not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, description, steps, is_template } = req.body;
    const channels = [...new Set(steps.map(s => s.channel))];
    const result = await query(
      `INSERT INTO sequences (tenant_id, name, description, steps, total_steps, channels_used, is_template, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [req.tenantId, name, description, JSON.stringify(steps), steps.length, channels, is_template || false, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const { name, description, steps } = req.body;
    const setClauses = [];
    const params = [req.params.id, req.tenantId];
    let idx = 3;

    if (name) { setClauses.push(`name = $${idx++}`); params.push(name); }
    if (description) { setClauses.push(`description = $${idx++}`); params.push(description); }
    if (steps) {
      const channels = [...new Set(steps.map(s => s.channel))];
      setClauses.push(`steps = $${idx++}`); params.push(JSON.stringify(steps));
      setClauses.push(`total_steps = $${idx++}`); params.push(steps.length);
      setClauses.push(`channels_used = $${idx++}`); params.push(channels);
    }

    if (setClauses.length === 0) return res.status(400).json({ error: 'Nothing to update' });

    const result = await query(
      `UPDATE sequences SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      params
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Sequence not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
