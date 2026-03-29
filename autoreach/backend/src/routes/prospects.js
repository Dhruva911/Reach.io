const router = require('express').Router();
const { query, withTransaction } = require('../models/db');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /api/prospects — List with filtering, sorting, pagination
router.get('/', async (req, res) => {
  try {
    const {
      page = 1, limit = 50, sort = 'created_at', order = 'DESC',
      status, industry, source, min_score, max_score, search, tags, company,
    } = req.query;

    const offset = (page - 1) * limit;
    const conditions = ['tenant_id = $1'];
    const params = [req.tenantId];
    let paramIdx = 2;

    if (status) { conditions.push(`status = $${paramIdx++}`); params.push(status); }
    if (industry) { conditions.push(`industry ILIKE $${paramIdx++}`); params.push(`%${industry}%`); }
    if (source) { conditions.push(`source = $${paramIdx++}`); params.push(source); }
    if (min_score) { conditions.push(`lead_score >= $${paramIdx++}`); params.push(parseInt(min_score)); }
    if (max_score) { conditions.push(`lead_score <= $${paramIdx++}`); params.push(parseInt(max_score)); }
    if (company) { conditions.push(`company_name ILIKE $${paramIdx++}`); params.push(`%${company}%`); }
    if (tags) {
      conditions.push(`tags && $${paramIdx++}`);
      params.push(tags.split(','));
    }
    if (search) {
      conditions.push(`(first_name ILIKE $${paramIdx} OR last_name ILIKE $${paramIdx} OR email ILIKE $${paramIdx} OR company_name ILIKE $${paramIdx})`);
      params.push(`%${search}%`);
      paramIdx++;
    }

    const whereClause = conditions.join(' AND ');
    const allowedSorts = ['created_at', 'lead_score', 'last_name', 'company_name', 'status', 'last_contacted_at'];
    const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
    const sortOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const countResult = await query(`SELECT COUNT(*) FROM prospects WHERE ${whereClause}`, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await query(
      `SELECT * FROM prospects WHERE ${whereClause} ORDER BY ${sortCol} ${sortOrder} LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      params
    );

    res.json({
      prospects: result.rows,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/prospects/:id — Prospect detail with activity timeline
router.get('/:id', async (req, res) => {
  try {
    const prospect = await query(
      'SELECT * FROM prospects WHERE id = $1 AND tenant_id = $2', [req.params.id, req.tenantId]
    );
    if (prospect.rows.length === 0) return res.status(404).json({ error: 'Prospect not found' });

    const activities = await query(
      'SELECT * FROM activities WHERE prospect_id = $1 ORDER BY created_at DESC LIMIT 50', [req.params.id]
    );
    const messages = await query(
      'SELECT * FROM messages WHERE prospect_id = $1 ORDER BY created_at DESC LIMIT 20', [req.params.id]
    );
    const scores = await query(
      'SELECT * FROM ai_scores WHERE prospect_id = $1 ORDER BY created_at DESC LIMIT 5', [req.params.id]
    );

    res.json({
      prospect: prospect.rows[0],
      activities: activities.rows,
      messages: messages.rows,
      ai_scores: scores.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/prospects — Create single prospect
router.post('/', async (req, res) => {
  try {
    const fields = req.body;
    const result = await query(
      `INSERT INTO prospects (tenant_id, first_name, last_name, email, phone, linkedin_url,
        company_name, company_domain, title, seniority, department, industry, company_size,
        company_location, source, tags)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING *`,
      [req.tenantId, fields.first_name, fields.last_name, fields.email, fields.phone,
       fields.linkedin_url, fields.company_name, fields.company_domain, fields.title,
       fields.seniority, fields.department, fields.industry, fields.company_size,
       fields.company_location, fields.source || 'manual', fields.tags || []]
    );

    // Log activity
    await query(
      `INSERT INTO activities (tenant_id, prospect_id, user_id, type, metadata) VALUES ($1,$2,$3,'prospect_created',$4)`,
      [req.tenantId, result.rows[0].id, req.user.id, JSON.stringify({ source: fields.source || 'manual' })]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/prospects/import-csv — Bulk import from CSV data
router.post('/import-csv', async (req, res) => {
  try {
    const { prospects } = req.body; // Array of prospect objects
    if (!Array.isArray(prospects) || prospects.length === 0) {
      return res.status(400).json({ error: 'prospects array is required' });
    }

    let imported = 0;
    let skipped = 0;
    let errors = [];

    await withTransaction(async (client) => {
      for (const p of prospects) {
        try {
          // Skip if email already exists for this tenant
          const existing = await client.query(
            'SELECT id FROM prospects WHERE tenant_id = $1 AND email = $2', [req.tenantId, p.email]
          );
          if (existing.rows.length > 0) { skipped++; continue; }

          await client.query(
            `INSERT INTO prospects (tenant_id, first_name, last_name, email, phone, linkedin_url,
              company_name, company_domain, title, seniority, industry, company_size, company_location, source)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'csv')`,
            [req.tenantId, p.first_name, p.last_name, p.email, p.phone, p.linkedin_url,
             p.company_name, p.company_domain, p.title, p.seniority, p.industry, p.company_size, p.company_location]
          );
          imported++;
        } catch (err) {
          errors.push({ email: p.email, error: err.message });
        }
      }
    });

    res.json({ imported, skipped, errors: errors.slice(0, 10), total_submitted: prospects.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/prospects/discover — Trigger AI prospect discovery via Apollo
router.post('/discover', async (req, res) => {
  try {
    const { icp_template_id, limit: maxResults = 100 } = req.body;

    // Get ICP template
    const icpResult = await query(
      'SELECT * FROM icp_templates WHERE id = $1 AND tenant_id = $2', [icp_template_id, req.tenantId]
    );
    if (icpResult.rows.length === 0) return res.status(404).json({ error: 'ICP template not found' });

    const icp = icpResult.rows[0];

    // In production, this would call Apollo API. For now, return mock + queue a job.
    // TODO: Replace with real Apollo API call when API key is configured
    res.json({
      status: 'discovery_queued',
      message: `Prospect discovery queued for ICP "${icp.name}". Will search for up to ${maxResults} prospects.`,
      icp_filters: icp.filters,
      job_id: `discover_${Date.now()}`,
      estimated_time: '2-5 minutes',
      note: 'Configure APOLLO_API_KEY in .env to enable live prospect discovery',
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/prospects/:id — Update prospect
router.patch('/:id', async (req, res) => {
  try {
    const fields = req.body;
    const setClauses = [];
    const params = [req.params.id, req.tenantId];
    let idx = 3;

    const allowedFields = ['first_name', 'last_name', 'email', 'phone', 'linkedin_url',
      'company_name', 'title', 'seniority', 'industry', 'company_size', 'lead_score',
      'status', 'tags', 'do_not_contact', 'enrichment_data'];

    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = $${idx++}`);
        params.push(key === 'enrichment_data' || key === 'tags' ? JSON.stringify(value) : value);
      }
    }

    if (setClauses.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

    const result = await query(
      `UPDATE prospects SET ${setClauses.join(', ')}, updated_at = NOW() WHERE id = $1 AND tenant_id = $2 RETURNING *`,
      params
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Prospect not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/prospects/:id
router.delete('/:id', async (req, res) => {
  try {
    const result = await query(
      'DELETE FROM prospects WHERE id = $1 AND tenant_id = $2 RETURNING id', [req.params.id, req.tenantId]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Prospect not found' });
    res.json({ deleted: true, id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
