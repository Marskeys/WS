const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session'); // ✅ 세션 추가
const db = require('./config/db'); // ✅ mysql2 연결

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
app.use(express.urlencoded({ extended: true }));

// ✅ 세션 설정
app.use(session({
  secret: '너만의_비밀문자열',
  resave: false,
  saveUninitialized: true,
}));

app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.user = req.session.user || null; // 로그인 상태 전달
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

// ✅ 로그인 페이지 (기존 GET 그대로 유지)
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// ✅ 로그인 처리
app.post('/login', async (req, res) => {
  const { id, password } = req.body;

  try {
    const [rows] = await db.query('SELECT * FROM users WHERE user_id = ?', [id]);

    if (rows.length === 0) {
      return res.render('login', { error: '존재하지 않는 아이디입니다.' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      return res.render('login', { error: '비밀번호가 일치하지 않습니다.' });
    }

    req.session.user = { id: user.user_id, nickname: user.nickname };
    res.redirect('/');
  } catch (err) {
    console.error('로그인 오류:', err);
    res.render('login', { error: '로그인 중 오류가 발생했습니다.' });
  }
});

// ✅ 로그아웃
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
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

// 회원가입 처리
app.post('/signup', async (req, res) => {
  const { user_id, username, email, password } = req.body;

  if (!user_id || !username || !password) {
    return res.render('signup', { error: '필수 정보를 모두 입력해주세요.' });
  }

  try {
    const hashedPw = await bcrypt.hash(password, 10);

    await db.query(
      'INSERT INTO users (user_id, nickname, email, password) VALUES (?, ?, ?, ?)',
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
  .then(([rows]) => console.log('✅ DB 응답:', rows[0]))
  .catch(err => console.error('❌ 쿼리 에러:', err));

// 서버 실행
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
