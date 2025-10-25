const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'blind_dongsun',
  password: 'sksmsrhoscksgdk_213',
  database: 'mars_keys',
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection()
  .then(() => console.log('✅ MarsKeys DB 연결 성공!'))
  .catch(err => console.error('❌ DB 연결 실패:', err));

module.exports = pool;
