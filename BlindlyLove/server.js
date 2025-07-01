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
  secret: '너만의_비밀문자열', // 이 값을 실제 운영 환경에서는 더 복잡하게 설정하세요.
  resave: false,
  saveUninitialized: true,
}));

// ✅ 사용자 정보 템플릿에 전달 미들웨어
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

// ✅ 로그인 처리
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

// ✅ 로그아웃 처리
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// ✅ 글쓰기 페이지
app.get('/write', (req, res) => {
  // 관리자만 글쓰기 가능하도록 권한 확인
  if (!req.session.user || req.session.user.is_admin !== 1) {
    return res.status(403).send('접근 권한이 없습니다. 관리자만 글을 작성할 수 있습니다.');
  }
  res.render('editor', {
    user: req.session.user,
    post: null,      // 새 글 작성 시에는 post가 null
    isEdit: false    // 새 글 작성 모드임을 나타냄
  });
});

// ✅ ID 중복 확인 API
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

// ✅ 닉네임 중복 확인 API
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
  // 필수 정보 유효성 검사
  if (!user_id || !username || !password) {
    return res.render('signup', { error: '필수 정보를 모두 입력해주세요.' });
  }

  try {
    // 비밀번호 해싱
    const hashedPw = await bcrypt.hash(password, 10);
    // 사용자 정보 DB 저장
    await db.query(
      'INSERT INTO users (user_id, nickname, email, password) VALUES (?, ?, ?, ?)',
      [user_id, username, email || null, hashedPw]
    );
    res.redirect('/signup-success'); // 회원가입 성공 페이지로 리디렉션
  } catch (err) {
    console.error('회원가입 오류:', err);
    res.render('signup', { error: '회원가입 중 오류가 발생했습니다.' });
  }
});

// ✅ 회원가입 성공 페이지
app.get('/signup-success', (req, res) => {
  res.render('signup-success');
});

// ✅ 새 글 저장 처리
app.post('/savePost', async (req, res) => {
  const { title, content, categories, is_private, is_pinned } = req.body;
  const pinnedValue = is_pinned === 1 || is_pinned === '1' ? 1 : 0;
  // 필수 입력값 확인
  if (!title || !content || !categories) {
    return res.status(400).json({ success: false, error: '제목, 내용, 카테고리를 모두 입력해주세요.' });
  }
  // 로그인한 사용자만 글을 쓸 수 있도록 권한 확인
  if (!req.session.user) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }

  // is_private 값을 1 (비공개) 또는 0 (공개)으로 변환
  const isPrivate = is_private ? 1 : 0; // 프론트에서 1로 넘어오면 true, 아니면 false (0)

  try {
    // 글 정보 DB 저장
    const [result] = await db.query(
      'INSERT INTO posts (title, content, categories, author, user_id, is_private, is_pinned) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        title,
        content,
        categories.join(','), // 카테고리 배열을 콤마로 구분된 문자열로 저장
        req.session.user.nickname, // 세션에서 작성자 닉네임 가져오기
        req.session.user.id,       // 세션에서 작성자 ID 가져오기
        isPrivate,
        pinnedValue
      ]
    );
    // 글 저장 성공 후, 저장된 글의 ID와 함께 성공 응답
    res.json({ success: true, postId: result.insertId });
  } catch (err) {
    console.error('글 저장 오류:', err);
    res.status(500).json({ success: false, error: '서버 오류로 글을 저장할 수 없습니다.' });
  }
});

// ✅ 글 삭제 처리
app.post('/delete/:id', async (req, res) => {
  const postId = req.params.id;
  const userId = req.session.user?.id; // 현재 로그인된 사용자 ID

  try {
    // 1️⃣ 해당 글의 작성자 ID 불러오기
    const [rows] = await db.query('SELECT user_id FROM posts WHERE id = ?', [postId]);
    if (rows.length === 0) {
      return res.status(404).send('게시글을 찾을 수 없습니다.');
    }

    const post = rows[0];

    // 2️⃣ 권한 확인: 글 작성자이거나 관리자인 경우에만 삭제 가능
    if (post.user_id !== userId && (!req.session.user || req.session.user.is_admin !== 1)) {
      return res.status(403).send('글 작성자 또는 관리자만 삭제할 수 있습니다.');
    }

    // 3️⃣ 삭제 수행
    await db.query('DELETE FROM posts WHERE id = ?', [postId]);
    res.redirect('/'); // 삭제 후 메인 페이지로 리디렉션
  } catch (err) {
    console.error('삭제 오류:', err);
    res.status(500).send('서버 오류로 삭제할 수 없습니다.');
  }
});

// ✅ 글 수정 페이지
app.get('/edit/:id', async (req, res) => {
  const postId = req.params.id;
  const userId = req.session.user?.id; // 현재 로그인된 사용자 ID

  try {
    const [rows] = await db.query('SELECT * FROM posts WHERE id = ?', [postId]);
    if (rows.length === 0) return res.status(404).send('게시글을 찾을 수 없습니다.');

    const post = rows[0];

    // 권한 체크: 글 작성자이거나 관리자인 경우에만 수정 페이지 접근 가능
    if (post.user_id !== userId && (!req.session.user || req.session.user.is_admin !== 1)) {
      return res.status(403).send('글 작성자 또는 관리자만 수정할 수 있습니다.');
    }

    // `editor.ejs`에 수정 모드로 렌더링
    res.render('editor', {
      user: req.session.user,
      post,  // 기존 글 정보를 템플릿에 전달
      isEdit: true // 수정 모드임을 나타냄
    });
  } catch (err) {
    console.error('수정 페이지 오류:', err);
    res.status(500).send('서버 오류');
  }
});

// ✅ 글 수정 처리
app.post('/edit/:id', async (req, res) => {
  const postId = req.params.id;
  const userId = req.session.user?.id; // 현재 로그인된 사용자 ID
  const { title, content, categories, is_private } = req.body;

  // is_private 값을 1 (비공개) 또는 0 (공개)으로 변환
  const isPrivate = is_private ? 1 : 0;

  try {
    // 글의 작성자 ID 확인
    const [rows] = await db.query('SELECT user_id FROM posts WHERE id = ?', [postId]);
    if (rows.length === 0) return res.status(404).send('게시글을 찾을 수 없습니다.');

    const post = rows[0];
    // 권한 확인: 글 작성자이거나 관리자인 경우에만 수정 가능
    if (post.user_id !== userId && (!req.session.user || req.session.user.is_admin !== 1)) {
      return res.status(403).send('글 작성자 또는 관리자만 수정할 수 있습니다.');
    }

    // 글 정보 DB 업데이트
    await db.query(
      'UPDATE posts SET title = ?, content = ?, categories = ?, is_private = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [title, content, categories.join(','), isPrivate, postId]
    );

    res.json({ success: true, redirect: `/post/${postId}` }); // 수정 후 해당 글 페이지로 리디렉션
  } catch (err) {
    console.error('수정 처리 오류:', err);
    res.status(500).send('서버 오류');
  }
});

// ✅ 특정 글 보기 페이지 (비공개 글 접근 시 JSON 응답으로 변경)
app.get('/post/:id', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (rows.length === 0) {
      // 게시글을 찾을 수 없으면 404 응답을 JSON으로 보냅니다.
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
    }

    const post = rows[0];

    // **비공개 글 접근 제한 로직**
    // 1. 글이 비공개(is_private: 1)인 경우
    // 2. 로그인하지 않았거나 (req.session.user 없음)
    // 3. 로그인했더라도 현재 로그인된 사용자의 ID와 글 작성자 ID가 다르면 (req.session.user.id !== post.user_id)
    //    -> JSON 응답으로 접근 거부 메시지 전송 (클라이언트에서 처리)
    if (post.is_private && (!req.session.user || req.session.user.id !== post.user_id)) {
      return res.status(403).json({ success: false, message: '이 글은 비공개로 설정되어 접근할 수 없습니다.' });
    }

    // 접근이 허용된 경우, post-view 템플릿 렌더링
    res.render('post-view', { post, user: req.session.user });
  } catch (err) {
    console.error('글 보기 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류로 글을 불러올 수 없습니다.' });
  }
});

// ✅ 검색 결과 페이지 (비공개 글 제목 공개 및 내용 숨김 적용)
app.get('/search', async (req, res) => {
  const keyword = req.query.q?.trim();
  if (!keyword) return res.redirect('/');

  const userId = req.session.user?.id;
  const isAdmin = req.session.user?.is_admin === 1;

  try {
    // 모든 관련 글을 가져옵니다 (비공개 여부와 상관없이)
    const [posts] = await db.query(`
      SELECT id, title, content, categories, author, user_id, created_at, is_private, is_pinned
      FROM posts
      WHERE title LIKE ? OR content LIKE ? OR categories LIKE ?
      ORDER BY is_pinned DESC, GREATEST(updated_at, created_at) DESC
    `, [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]);

    // 비공개 글의 내용을 필터링합니다
    const filteredPosts = posts.map(post => {
      // 글이 비공개이고, 작성자도 아니고, 관리자도 아닌 경우
      if (post.is_private && post.user_id !== userId && !isAdmin) {
        return {
          ...post,
          content: '이 글은 비공개로 설정되어 있습니다.' // 내용은 숨기고 메시지 표시
          // title과 is_private는 그대로 유지됩니다.
        };
      }
      return post;
    });

    const categorySet = new Set();
    filteredPosts.forEach(post => {
      post.categories.split(',').map(cat => cat.trim()).forEach(cat => cat && categorySet.add(cat));
    });

    const categories = Array.from(categorySet);

    res.render('index', {
      posts: filteredPosts, // 필터링된 글 목록 전달
      categories,
      isSearch: true,
      searchKeyword: keyword,
      currentPath: req.path
    });
  } catch (err) {
    console.error('검색 오류:', err);
    res.status(500).send('검색 중 오류 발생');
  }
});

// ✅ 메인 페이지 (비공개 글 제목 공개 및 내용 숨김 적용)
app.get('/', async (req, res) => {
  const userId = req.session.user?.id;
  const isAdmin = req.session.user?.is_admin === 1;
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    // 총 게시글 수 조회 (비공개 포함)
    const [[{ count }]] = await db.query('SELECT COUNT(*) AS count FROM posts');

    // 페이징된 글 조회
    const [posts] = await db.query(`
      SELECT id, title, content, categories, author, user_id, created_at, updated_at, is_private, is_pinned
      FROM posts
      ORDER BY is_pinned DESC, GREATEST(updated_at, created_at) DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const filteredPosts = posts.map(post => {
      if (post.is_private && post.user_id !== userId && !isAdmin) {
        return {
          ...post,
          content: '이 글은 비공개로 설정되어 있습니다.'
        };
      }
      return post;
    });

    const categorySet = new Set();
    filteredPosts.forEach(post => {
      post.categories.split(',').map(c => c.trim()).forEach(c => c && categorySet.add(c));
    });

    const categories = Array.from(categorySet);
    const totalPages = Math.ceil(count / limit);

    res.render('index', {
      posts: filteredPosts,
      categories,
      isSearch: false,
      searchKeyword: '',
      currentPath: req.path,
      pagination: {
        current: page,
        total: totalPages
      }
    });
  } catch (err) {
    console.error('메인 페이지 로드 오류:', err);
    res.status(500).send('메인 페이지 로드 중 오류 발생');
  }
});


// ✅ 카테고리 전체 가져오기 API
app.get('/api/categories', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories ORDER BY id ASC');
    res.json({ categories: rows.map(r => r.name) });
  } catch (err) {
    console.error('카테고리 조회 오류:', err);
    res.status(500).json({ error: '카테고리 불러오기 실패' });
  }
});

// ✅ 카테고리 추가 API
app.post('/api/categories', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '카테고리 이름이 필요합니다.' });

  try {
    // 중복 카테고리 추가 방지
    const [existing] = await db.query('SELECT * FROM categories WHERE name = ?', [name]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: '이미 존재하는 카테고리입니다.' });
    }
    await db.query('INSERT INTO categories (name) VALUES (?)', [name]);
    res.json({ success: true });
  } catch (err) {
    console.error('카테고리 추가 오류:', err);
    res.status(500).json({ error: '카테고리 추가 실패' });
  }
});

// ✅ 카테고리 삭제 API
app.delete('/api/categories/:name', async (req, res) => {
  const { name } = req.params;
  try {
    await db.query('DELETE FROM categories WHERE name = ?', [decodeURIComponent(name)]);
    res.json({ success: true });
  } catch (err) {
    console.error('카테고리 삭제 오류:', err);
    res.status(500).json({ error: '카테고리 삭제 실패' });
  }
});


// ✅ AJAX 검색 API (비공개 글 제목 공개 및 내용 숨김 적용)
app.get('/api/search', async (req, res) => {
  const keyword = req.query.q?.trim();
  if (!keyword) return res.json({ posts: [] });

  const userId = req.session.user?.id;
  const isAdmin = req.session.user?.is_admin === 1;

  try {
    // 모든 관련 글을 가져옵니다 (비공개 여부와 상관없이)
    const [posts] = await db.query(`
      SELECT id, title, content, categories, author, user_id, created_at, is_private, is_pinned
      FROM posts
      WHERE title LIKE ? OR content LIKE ? OR categories LIKE ?
      ORDER BY is_pinned DESC, GREATEST(updated_at, created_at) DESC
    `, [`%${keyword}%`, `%${keyword}%`, `%${keyword}%`]);

    // 비공개 글의 내용을 필터링합니다
    const filteredPosts = posts.map(post => {
      // 글이 비공개이고, 작성자도 아니고, 관리자도 아닌 경우
      if (post.is_private && post.user_id !== userId && !isAdmin) {
        return {
          ...post,
          content: '이 글은 비공개로 설정되어 있습니다.' // 내용은 숨기고 메시지 표시
        };
      }
      return post;
    });
    res.json({ posts: filteredPosts }); // 필터링된 글 목록 전달
  } catch (err) {
    console.error('AJAX 검색 오류:', err);
    res.status(500).json({ error: '검색 중 오류 발생' });
  }
});

// ✅ ads.txt (정적 파일 제공)
app.use('/ads.txt', express.static(path.join(__dirname, 'public/ads.txt')));

// ✅ DB 연결 확인
db.query('SELECT NOW()')
  .then(([rows]) => console.log('✅ DB 응답:', rows[0]))
  .catch(err => console.error('❌ 쿼리 에러:', err));

app.get('/game', (req, res) => {
    res.render('game'); // views/game.ejs 렌더링
});

// ✅ 서버 실행
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});
