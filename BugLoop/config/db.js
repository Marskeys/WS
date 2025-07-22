// config/db.js
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'blindly_love',
  password: 'wowthats_amazing',
  database: 'bug_loop',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection()
  .then(() => console.log('✅ MySQL 연결 성공!!'))
  .catch(err => console.error('❌ MySQL 연결 실패:', err));

module.exports = pool;
