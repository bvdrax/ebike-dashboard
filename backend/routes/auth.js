const router = require('express').Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pool } = require('../migrations/run');
const { requireAuth, requireRole } = require('../middleware/auth');

// POST /api/auth/setup — one-time admin account creation
router.post('/setup', async (req, res, next) => {
  try {
    const { setup_key, username, password, display_name } = req.body;
    if (setup_key !== process.env.ADMIN_SETUP_KEY) {
      return res.status(403).json({ error: 'Invalid setup key' });
    }
    const { rows } = await pool.query("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
    if (rows.length > 0) {
      return res.status(409).json({ error: 'Admin already exists' });
    }
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, role, display_name) VALUES ($1, $2, $3, $4) RETURNING id, username, role, display_name',
      [username, hash, 'admin', display_name || username]
    );
    res.json({ user: result.rows[0] });
  } catch (err) { next(err); }
});

// POST /api/auth/login
router.post('/login', async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const { rows } = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role, display_name: user.display_name },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.json({ token, user: { id: user.id, username: user.username, role: user.role, display_name: user.display_name } });
  } catch (err) { next(err); }
});

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

// GET /api/auth/users (admin only)
router.get('/users', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { rows } = await pool.query(
      'SELECT id, username, display_name, role, created_at FROM users ORDER BY id'
    );
    res.json(rows);
  } catch (err) { next(err); }
});

// POST /api/auth/users (admin only)
router.post('/users', requireAuth, requireRole('admin'), async (req, res, next) => {
  try {
    const { username, password, role, display_name } = req.body;
    if (!['athlete', 'parent'].includes(role)) {
      return res.status(400).json({ error: 'Role must be athlete or parent' });
    }
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, role, display_name) VALUES ($1, $2, $3, $4) RETURNING id, username, role, display_name',
      [username, hash, role, display_name || username]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Username already exists' });
    next(err);
  }
});

module.exports = router;
