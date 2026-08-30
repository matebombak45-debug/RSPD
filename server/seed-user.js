const db = require('./db');
const bcrypt = require('bcryptjs');

const badge = '6007';
const fullName = 'Larry Johnshom';
const password = 'Kazincbarcika0220';
const rank = 'Főhadnagy';

function run(){
  const existing = db.getUserByBadge(badge);
  if(existing){
    console.log('User already exists:', existing.badge);
    return;
  }
  const hash = bcrypt.hashSync(password, 8);
  const user = db.createUser({ id: require('crypto').randomUUID(), badge, ic: fullName, password_hash: hash, rank });
  console.log('Created user:', user.badge, user.ic);
}

run();
