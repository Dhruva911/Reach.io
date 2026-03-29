const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../models/db');
const config = require('../config');
const { authenticate, requireRole } = require('../middleware/auth');

// POST /api/auth/register — Register new tenant + admin user
router.post('/register', async (req, res) => {
  try {
    const { company_name, email, password, first_name, last_name } = req.body;
    if (!company_name || !email || !password) {
      return res.status(400).json({ error: 'company_name, email, and password are required' });
    }

    const slug = company_name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    const passwordHash = await bcrypt.hash(password, 10);

    // Create tenant
    const tenantResult = await query(
      `INSERT INTO tenants (name, slug) VALUES ($1, $2) RETURNING id, name, slug, plan`,
      [company_name, slug + '-' + Date.now()]
    );
    const tenant = tenantResult.rows[0];

    // Create admin user
    const userResult = await query(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role) 
       VALUES ($1, $2, $3, $4, $5, 'admin') RETURNING id, email, first_name, last_name, role`,
      [tenant.id, email, passwordHash, first_name, last_name]
    );
    const user = userResult.rows[0];

    const token = jwt.sign(
      { id: user.id, tenant_id: tenant.id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.status(201).json({ token, user, tenant });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Email already registered' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await query(
      `SELECT u.*, t.name as tenant_name, t.plan as tenant_plan 
       FROM users u JOIN tenants t ON u.tenant_id = t.id 
       WHERE u.email = $1 AND u.is_active = true`,
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    // Update last login
    await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign(
      { id: user.id, tenant_id: user.tenant_id, email: user.email, role: user.role },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    res.json({
      token,
      user: {
        id: user.id, email: user.email, first_name: user.first_name,
        last_name: user.last_name, role: user.role,
        tenant: { id: user.tenant_id, name: user.tenant_name, plan: user.tenant_plan },
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me — Current user info
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.role, u.avatar_url,
              t.id as tenant_id, t.name as tenant_name, t.plan, t.channels_enabled, t.settings
       FROM users u JOIN tenants t ON u.tenant_id = t.id WHERE u.id = $1`,
      [req.user.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/invite — Invite team member (admin/manager only)
router.post('/invite', authenticate, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { email, first_name, last_name, role } = req.body;
    const tempPassword = Math.random().toString(36).slice(-12);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    const result = await query(
      `INSERT INTO users (tenant_id, email, password_hash, first_name, last_name, role) 
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, first_name, last_name, role`,
      [req.tenantId, email, passwordHash, first_name, last_name, role || 'rep']
    );

    res.status(201).json({ user: result.rows[0], temporary_password: tempPassword });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'User already exists' });
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
