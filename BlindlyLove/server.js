const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

// EJS 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 정적 파일(css, js, 이미지 등) 경로
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

// --- 추가 및 수정 ---
app.use(express.urlencoded({ extended: true }));

// 현재 경로를 모든 EJS에서 사용할 수 있게 설정
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next();
});

// 회원가입 페이지
app.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

// 로그인 페이지
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// 메인 페이지
app.get('/', (req, res) => {
  res.render('index', { pageCss: 'main' });
});

// 아이디 중복 확인
app.get('/api/check-id', async (req, res) => {
  const { id } = req.query;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE user_id = ?', [id]);
    res.json({ exists: rows.length > 0 });
  } catch (err) {
    console.error('아이디 중복 확인 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 닉네임 중복 확인
app.get('/api/check-nickname', async (req, res) => {
  const { nickname } = req.query;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE nickname = ?', [nickname]);
    res.json({ exists: rows.length > 0 });
  } catch (err) {
    console.error('닉네임 중복 확인 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 회원가입 POST 처리
app.post('/signup', async (req, res) => {
  const { user_id, username, email, password } = req.body; // ✅ user_id로 받기

  if (!user_id || !username || !password) {
    return res.render('signup', { error: '필수 정보를 모두 입력해주세요.' });
  }

  try {
    const hashedPw = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO users (user_id, nickname, email, password) VALUES (?, ?, ?, ?)',
      [user_id, username, email || null, hashedPw] // ✅ user_id로 사용
    );

    res.redirect('/signup-success');
  } catch (err) {
    console.error('회원가입 오류:', err);
    res.render('signup', { error: '회원가입 중 오류가 발생했습니다.' });
  }
});


// 회원가입 성공 페이지
app.get('/signup-success', (req, res) => {
  res.render('signup-success'); // ✅ 성공 페이지 렌더링
});

// 서버 실행
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
