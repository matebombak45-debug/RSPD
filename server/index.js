const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.post('/api/register', (req, res) => {
  const { fullName, badge, password, rank } = req.body || {};
  if(!fullName || !badge || !password) return res.status(400).json({ error: 'Missing fields' });
  try{
    const exists = db.getUserByBadge(badge);
    if(exists) return res.status(409).json({ error: 'Badge already exists' });
    const hash = bcrypt.hashSync(password, 8);
    const user = db.createUser({ id: require('crypto').randomUUID(), badge, ic: fullName, password_hash: hash, rank });
    return res.json({ ok: true, user: { id: user.id, badge: user.badge, ic: user.ic, rank: user.rank } });
  }catch(err){
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', (req, res) => {
  const { badge, password } = req.body || {};
  if(!badge || !password) return res.status(400).json({ error: 'Missing fields' });
  try{
    const user = db.getUserByBadge(badge);
    if(!user) return res.status(401).json({ error: 'Invalid credentials' });
    if(!bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: 'Invalid credentials' });
    const out = { id: user.id, badge: user.badge, ic: user.ic, rank: user.rank, created_at: user.created_at };
    return res.json({ ok: true, user: out });
  }catch(err){
    console.error(err);
    return res.status(500).json({ error: 'Server error' });
  }
});

// serve static files (project root)
app.use(express.static(path.join(__dirname, '..')));

app.listen(PORT, () => console.log(`RCPD server running on http://localhost:${PORT}`));
