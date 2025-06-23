const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ✅ 세션 설정
app.use(session({
  secret: '너만의_비밀문자열',
  resave: false,
  saveUninitialized: true,
}));

// ✅ 사용자 정보 템플릿에 전달
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.user = req.session.user || null;
  next();
});

// ✅ 로그인 상태 확인 API
app.get('/session', (req, res) => {
  const user = req.session.user;
  if (user) {
    res.json({
      loggedIn: true,
      username: user.nickname,
      is_admin: user.is_admin === 1
    });
  } else {
    res.json({ loggedIn: false });
  }
});

// ✅ 회원가입 페이지
app.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

// ✅ 로그인
app.post('/login', async (req, res) => {
  const { id, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE user_id = ?', [id]);
    if (rows.length === 0) return res.status(401).json({ success: false, error: '존재하지 않는 아이디입니다.' });

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ success: false, error: '비밀번호가 일치하지 않습니다.' });

    req.session.user = {
      id: user.user_id,
      nickname: user.nickname,
      is_admin: user.is_admin
    };

    res.json({ success: true });
  } catch (err) {
    console.error('로그인 오류:', err);
    res.status(500).json({ success: false, error: '서버 오류입니다.' });
  }
});

// ✅ 로그아웃
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// ✅ 글쓰기
app.get('/write', (req, res) => {
  if (!req.session.user || req.session.user.is_admin !== 1) {
    return res.status(403).send('접근 권한이 없습니다.');
  }
  res.render('editor', { user: req.session.user });
});

// ✅ ID 중복 확인
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

// ✅ 닉네임 중복 확인
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

// ✅ 회원가입 처리
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

// ✅ 회원가입 성공 페이지
app.get('/signup-success', (req, res) => {
  res.render('signup-success');
});

// ✅ 글 저장
app.post('/savePost', async (req, res) => {
  const { title, content, categories } = req.body;
  if (!title || !content || !categories) {
    return res.status(400).json({ success: false, error: '입력값 누락' });
  }

  try {
    await db.query(
      'INSERT INTO posts (title, content, categories, author) VALUES (?, ?, ?, ?)',
      [title, content, categories.join(','), req.session.user?.nickname || '익명']
    );
    res.json({ success: true });
  } catch (err) {
    console.error('글 저장 오류:', err);
    res.status(500).json({ success: false, error: '서버 오류' });
  }
});

// ✅ 검색 결과 페이지
app.get('/search', async (req, res) => {
  const keyword = req.query.q?.trim();
  if (!keyword) return res.redirect('/');

  try {
    const [posts] = await db.query(`
      SELECT id, title, content, categories, author, created_at
      FROM posts
      WHERE title LIKE ? OR content LIKE ? OR categories LIKE ?
      ORDER BY created_at DESC
    `, [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]);

    const categorySet = new Set();
    posts.forEach(post => {
      post.categories.split(',').map(cat => cat.trim()).forEach(cat => cat && categorySet.add(cat));
    });

    const categories = Array.from(categorySet);

    res.render('index', {
      posts,
      categories,
      isSearch: true,
      searchKeyword: keyword,
      currentPath: req.path  // ✅ 여기가 핵심
    });
  } catch (err) {
    console.error('검색 오류:', err);
    res.status(500).send('검색 중 오류 발생');
  }
});

// ✅ 메인 페이지
app.get('/', async (req, res) => {
  const [posts] = await db.query(`
    SELECT id, title, content, categories, author, created_at
    FROM posts
    ORDER BY created_at DESC
  `);

  const categorySet = new Set();
  posts.forEach(post => {
    post.categories.split(',').map(cat => cat.trim()).forEach(cat => cat && categorySet.add(cat));
  });

  const categories = Array.from(categorySet);

  res.render('index', {
    posts,
    categories,
    isSearch: false,
    searchKeyword: '',
    currentPath: req.path  // ✅ 여기도 핵심
  });
});

// ✅ 게시글 보기
app.get('/post/:id', async (req, res) => {
  const [rows] = await db.query('SELECT * FROM posts WHERE id = ?', [req.params.id]);
  if (rows.length === 0) return res.status(404).send('게시글을 찾을 수 없습니다.');
  res.render('post-view', { post: rows[0] });
});

// ✅ 카테고리 전체 가져오기
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories ORDER BY id ASC');
    res.json(rows);
  } catch (err) {
    console.error('카테고리 조회 오류:', err);
    res.status(500).json({ error: '카테고리 불러오기 실패' });
  }
});

// ✅ 카테고리 추가
app.post('/api/categories', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '카테고리 이름이 필요합니다.' });

  try {
    await db.query('INSERT INTO categories (name) VALUES (?)', [name]);
    res.json({ success: true });
  } catch (err) {
    console.error('카테고리 추가 오류:', err);
    res.status(500).json({ error: '카테고리 추가 실패' });
  }
});

// ✅ 카테고리 삭제
app.delete('/api/categories/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM categories WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    console.error('카테고리 삭제 오류:', err);
    res.status(500).json({ error: '카테고리 삭제 실패' });
  }
});

// ✅ AJAX 검색 API
app.get('/api/search', async (req, res) => {
  const keyword = req.query.q?.trim();
  if (!keyword) return res.json({ posts: [] });

  const [posts] = await db.query(`
    SELECT id, title, content, categories, author, created_at
    FROM posts
    WHERE title LIKE ? OR content LIKE ? OR categories LIKE ?
    ORDER BY created_at DESC
  `, [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]);

  res.json({ posts });
});

// ✅ ads.txt
app.use('/ads.txt', express.static(path.join(__dirname, 'public/ads.txt')));

// ✅ DB 연결 확인
db.query('SELECT NOW()')
  .then(([rows]) => console.log('✅ DB 응답:', rows[0]))
  .catch(err => console.error('❌ 쿼리 에러:', err));

// ✅ 서버 실행
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
