const mysql = require('mysql2/promise');

const db = mysql.createPool({
  host: 'localhost',
  user: 'root',         // DB 사용자명
  password: '',  // DB 비밀번호
  database: 'blindly-blog', // 자기 DB 이름
});

module.exports = db;
