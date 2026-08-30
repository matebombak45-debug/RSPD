const fs = require('fs');
const path = require('path');
const dbFile = path.join(__dirname, 'users.json');

function read(){
  if(!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify({users:[]}, null, 2));
  return JSON.parse(fs.readFileSync(dbFile));
}

function write(data){
  fs.writeFileSync(dbFile, JSON.stringify(data, null, 2));
}

function getUserByBadge(badge){
  if(!badge) return null;
  const data = read();
  return data.users.find(u => String(u.badge).toUpperCase() === String(badge).toUpperCase()) || null;
}

function createUser({id,badge,ic,password_hash,rank}){
  const data = read();
  const now = new Date().toISOString();
  const user = { id, badge: String(badge).toUpperCase(), ic, password_hash, rank: rank||'Főhadnagy', created_at: now };
  data.users.push(user);
  write(data);
  return user;
}

module.exports = { getUserByBadge, createUser };
