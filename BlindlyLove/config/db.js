// config/db.js
const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://blindly_love_db_user:4psdH0qQWv59T4emHpFwbTd2URKP38Ok@dpg-d16llk0dl3ps739hl9pg-a.oregon-postgres.render.com/blindly_love_db',
  ssl: {
    rejectUnauthorized: false
  }
});

client.connect()
  .then(() => console.log('✅ PostgreSQL 연결 성공!'))
  .catch(err => console.error('❌ PostgreSQL 연결 실패:', err));

module.exports = client;
