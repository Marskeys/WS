const db = require('./config/db'); // ✅ DB 먼저 불러오기
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

// EJS 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 정적 파일(css, js, 이미지 등) 경로
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

// 폼 데이터 파싱
app.use(express.urlencoded({ extended: true }));

// 현재 경로를 모든 EJS에서 사용할 수 있게 설정
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

// 메인 페이지
app.get('/', (req, res) => {
  res.render('index', { pageCss: 'main' });
});

// 회원가입 페이지
app.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

// 로그인 페이지
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// 아이디 중복 확인
app.get('/api/check-id', async (req, res) => {
  const { id } = req.query;
  try {
    const result = await db.query('SELECT * FROM users WHERE user_id = $1', [id]);
    res.json({ exists: result.rows.length > 0 });
  } catch (err) {
    console.error('아이디 중복 확인 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 닉네임 중복 확인
app.get('/api/check-nickname', async (req, res) => {
  const { nickname } = req.query;
  try {
    const result = await db.query('SELECT * FROM users WHERE nickname = $1', [nickname]);
    res.json({ exists: result.rows.length > 0 });
  } catch (err) {
    console.error('닉네임 중복 확인 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 회원가입 POST 처리
app.post('/signup', async (req, res) => {
  const { user_id, username, email, password } = req.body;

  if (!user_id || !username || !password) {
    return res.render('signup', { error: '필수 정보를 모두 입력해주세요.' });
  }

  try {
    const hashedPw = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO users (user_id, nickname, email, password) VALUES ($1, $2, $3, $4)',
      [user_id, username, email || null, hashedPw]
    );

    res.redirect('/signup-success');
  } catch (err) {
    console.error('회원가입 오류:', err);
    res.render('signup', { error: '회원가입 중 오류가 발생했습니다.' });
  }
});

// 회원가입 성공 페이지
app.get('/signup-success', (req, res) => {
  res.render('signup-success');
});

// DB 연결 테스트 로그
db.query('SELECT NOW()')
  .then(result => console.log('DB 응답:', result.rows[0]))
  .catch(err => console.error('쿼리 에러:', err));

// 서버 실행
app.listen(PORT, () => {
  console.log(`서버 실행 중: 포트 ${PORT}에서 애플리케이션이 실행 중입니다.`);
});
