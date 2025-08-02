const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const session = require('express-session');
const db = require('./config/db');
const app = express();
const PORT = process.env.PORT || 3001;

// ✅ 다국어 지원을 위한 설정
const supportedLangs = ['ko', 'en', 'fr', 'zh', 'ja'];
app.locals.supportedLangs = supportedLangs;
const translations = JSON.parse(fs.readFileSync(path.join(__dirname, 'all.json'), 'utf8'));

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

// ✅ 언어 감지 미들웨어 (모든 라우트보다 먼저 실행)
app.use((req, res, next) => {
  let lang = 'ko'; // 기본 언어 설정
  const parts = req.path.split('/');

  if (parts.length > 1 && supportedLangs.includes(parts[1])) {
    lang = parts[1];
    req.url = req.url.substring(lang.length + 1) || '/';
  }

  res.locals.lang = lang;
  res.locals.translations = translations[lang] || translations['ko']; // 현재 언어에 맞는 번역 데이터 전달
  res.locals.supportedLangs = supportedLangs;
  res.locals.currentPath = req.path;
  res.locals.user = req.session.user || null;
  next();
});

// ✅ 카테고리 이름 컬럼을 동적으로 가져오는 헬퍼 함수 추가
const getCategoryNameColumn = (lang) => {
  if (lang === 'ko') {
    return 'name';
  }
  return `name_${lang}`;
};

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
app.get('/write', async (req, res) => {
  // 관리자만 글쓰기 가능하도록 권한 확인
  if (!req.session.user || req.session.user.is_admin !== 1) {
    return res.status(403).send('접근 권한이 없습니다. 관리자만 글을 작성할 수 있습니다.');
  }

  try {
    // ✅ 카테고리 목록을 현재 언어에 맞게 가져옴 (수정)
    const lang = res.locals.lang;
    const categoryNameColumn = getCategoryNameColumn(lang);
    const [categories] = await db.query(`SELECT id, ${categoryNameColumn} AS name FROM categories`);

    res.render('editor', {
      user: req.session.user,
      post: null,      // 새 글 작성 시에는 post가 null
      isEdit: false,   // 새 글 작성 모드임을 나타냄
      categories,
      lang // 현재 언어를 에디터 템플릿에 전달
    });
  } catch (err) {
    console.error('글쓰기 페이지 오류:', err);
    res.status(500).send('서버 오류');
  }
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
  const { categories, is_private, is_pinned, lang_content } = req.body;
  const pinnedValue = is_pinned === 1 || is_pinned === '1' ? 1 : 0;
  
  // 필수 항목 유효성 검사: 한국어 제목, 내용, 카테고리만 확인
  const koreanContent = lang_content.ko;
  if (!koreanContent || !koreanContent.title || !koreanContent.content || !categories || categories.length === 0) {
    return res.status(400).json({ success: false, error: '제목, 내용, 카테고리를 모두 입력해주세요.' });
  }
  
  if (!req.session.user) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }

  const isPrivate = is_private ? 1 : 0;

  try {
    // 1️⃣ 먼저 posts 테이블에 공통 정보 저장
    const [postResult] = await db.query(
      'INSERT INTO posts (categories, author, user_id, is_private, is_pinned) VALUES (?, ?, ?, ?, ?)',
      [
        categories.join(','),
        req.session.user.nickname,
        req.session.user.id,
        isPrivate,
        pinnedValue
      ]
    );

    const postId = postResult.insertId;

    // 2️⃣ post_translations 테이블에 번역된 제목과 내용 저장
    // 개별 INSERT를 반복하여 안정성 확보 (기존 코드 수정)
    for (const lang_code in lang_content) {
      const { title, content } = lang_content[lang_code];
      const contentToInsert = content || '<p><br></p>';
      
      await db.query(
        'INSERT INTO post_translations (post_id, lang_code, title, content) VALUES (?, ?, ?, ?)',
        [postId, lang_code, title || null, contentToInsert]
      );
    }
    
    res.json({ success: true, postId: postId });
  } catch (err) {
    console.error('글 저장 오류:', err);
    res.status(500).json({ success: false, error: '서버 오류로 글을 저장할 수 없습니다.' });
  }
});

// ✅ 글 삭제 처리 (기존과 동일)
app.post('/delete/:id', async (req, res) => {
  const postId = req.params.id;
  const userId = req.session.user?.id;

  try {
    const [rows] = await db.query('SELECT user_id FROM posts WHERE id = ?', [postId]);
    if (rows.length === 0) {
      return res.status(404).send('게시글을 찾을 수 없습니다.');
    }

    const post = rows[0];

    if (post.user_id !== userId && (!req.session.user || req.session.user.is_admin !== 1)) {
      return res.status(403).send('글 작성자 또는 관리자만 삭제할 수 있습니다.');
    }

    // posts 테이블에서 삭제하면 post_translations도 CASCADE로 함께 삭제됨
    await db.query('DELETE FROM posts WHERE id = ?', [postId]);
    res.redirect('/');
  } catch (err) {
    console.error('삭제 오류:', err);
    res.status(500).send('서버 오류로 삭제할 수 없습니다.');
  }
});

// ✅ 글 수정 페이지
app.get('/edit/:id', async (req, res) => {
  const postId = req.params.id;
  const userId = req.session.user?.id;
  const lang = req.query.lang || 'ko'; // 쿼리 파라미터로 언어 코드를 받음

  try {
    // 1️⃣ posts 테이블에서 기본 정보 조회
    const [posts] = await db.query('SELECT * FROM posts WHERE id = ?', [postId]);
    if (posts.length === 0) return res.status(404).send('게시글을 찾을 수 없습니다.');
    const post = posts[0];

    // 2️⃣ 권한 체크
    if (post.user_id !== userId && (!req.session.user || req.session.user.is_admin !== 1)) {
      return res.status(403).send('글 작성자 또는 관리자만 수정할 수 있습니다.');
    }
    
    // 3️⃣ post_translations 테이블에서 모든 언어의 번역된 제목/내용 조회
    const [translations] = await db.query(
        'SELECT lang_code, title, content FROM post_translations WHERE post_id = ?',
        [postId]
    );
    
    // 4️⃣ post 객체에 모든 번역된 내용을 추가
    post.translations = {};
    translations.forEach(t => {
      post.translations[t.lang_code] = {
        title: t.title,
        content: t.content
      };
    });

    // 5️⃣ 카테고리 목록을 현재 언어에 맞게 가져옴 (수정)
    const categoryNameColumn = getCategoryNameColumn(lang);
    const [categories] = await db.query(`SELECT id, ${categoryNameColumn} AS name FROM categories`);

    res.render('editor', {
      user: req.session.user,
      post,
      isEdit: true,
      categories,
      lang // 현재 언어를 에디터 템플릿에 전달
    });
  } catch (err) {
    console.error('수정 페이지 오류:', err);
    res.status(500).send('서버 오류');
  }
});

// ✅ 글 수정 처리
app.post('/edit/:id', async (req, res) => {
  const postId = req.params.id;
  const userId = req.session.user?.id;
  // ✅ post_translations 테이블에 맞게 수정
  const { categories, is_private, is_pinned, lang_content } = req.body;

  const isPrivate = is_private ? 1 : 0;
  const pinnedValue = is_pinned === 1 || is_pinned === '1' ? 1 : 0;

  // ✅ 필수 항목 유효성 검사: 한국어 제목, 내용, 카테고리만 확인하도록 수정
  const koreanContent = lang_content.ko;
  if (!koreanContent || !koreanContent.title || !koreanContent.content || !categories || categories.length === 0) {
    return res.status(400).json({ success: false, error: '제목, 내용, 카테고리를 모두 입력해주세요.' });
  }

  try {
    // 1️⃣ 글의 작성자 ID 확인
    const [posts] = await db.query('SELECT user_id FROM posts WHERE id = ?', [postId]);
    if (posts.length === 0) return res.status(404).json({ success: false, error: '게시글을 찾을 수 없습니다.' });
    const post = posts[0];

    // 2️⃣ 권한 확인: 글 작성자이거나 관리자인 경우에만 수정 가능
    if (post.user_id !== userId && (!req.session.user || req.session.user.is_admin !== 1)) {
      return res.status(403).json({ success: false, error: '글 작성자 또는 관리자만 수정할 수 있습니다.' });
    }

    // 3️⃣ posts 테이블 업데이트 (제목, 내용 제외)
    await db.query(
      'UPDATE posts SET categories = ?, is_private = ?, is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [categories.join(','), isPrivate, pinnedValue, postId]
    );

    // 4️⃣ post_translations 테이블 업데이트 (제목, 내용)
    const translationsToUpdate = Object.keys(lang_content).map(lang_code => {
      const { title, content } = lang_content[lang_code];
      return [postId, lang_code, title || null, content || '<p><br></p>'];
    });

    for (const [pId, lang_code, title, content] of translationsToUpdate) {
      await db.query(
        'INSERT INTO post_translations (post_id, lang_code, title, content) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE title = VALUES(title), content = VALUES(content)',
        [pId, lang_code, title, content]
      );
    }
    
    res.json({ success: true, redirect: `/${res.locals.lang}/post/${postId}` });
  } catch (err) {
    console.error('수정 처리 오류:', err);
    res.status(500).json({ success: false, error: '서버 오류로 글을 수정할 수 없습니다.' });
  }
});


// ✅ 특정 글 보기 페이지
app.get('/post/:id', async (req, res) => {
  const lang = res.locals.lang;

  try {
    const postId = req.params.id;
    if (!req.session.viewedPosts) {
      req.session.viewedPosts = [];
    }

    // ✅ post_translations와 posts 테이블을 JOIN하여 현재 언어의 글을 가져옴
    const [rows] = await db.query(`
      SELECT
        p.id,
        t.title,
        t.content,
        p.categories,
        p.author,
        p.user_id,
        p.created_at,
        p.updated_at,
        p.is_private,
        p.is_pinned,
        IFNULL(p.views, 0) AS views
      FROM posts p
      JOIN post_translations t ON p.id = t.post_id
      WHERE p.id = ? AND t.lang_code = ?
    `, [postId, lang]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: '게시글을 찾을 수 없습니다.' });
    }

    const post = rows[0];

    if (post.is_private && (!req.session.user || req.session.user.id !== post.user_id)) {
      return res.status(403).json({ success: false, message: '이 글은 비공개로 설정되어 접근할 수 없습니다.' });
    }

    if (!req.session.viewedPosts.includes(postId)) {
      await db.query('UPDATE posts SET views = views + 1, updated_at = updated_at WHERE id = ?', [postId]);
      req.session.viewedPosts.push(postId);
    }

    res.render('post-view', { post, user: req.session.user });

  } catch (err) {
    console.error('글 보기 오류:', err);
    res.status(500).json({ success: false, message: '서버 오류로 글을 불러올 수 없습니다.' });
  }
});


// ✅ 검색 결과 페이지 (다국어 지원)
app.get('/search', async (req, res) => {
  const keyword = req.query.q?.trim();
  if (!keyword) return res.redirect('/');
  const lang = res.locals.lang;

  const userId = req.session.user?.id;
  const isAdmin = req.session.user?.is_admin === 1;

  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const baseQuery = `
      SELECT
        p.id,
        t.title,
        t.content,
        p.categories,
        p.author,
        p.user_id,
        p.created_at,
        p.is_private,
        p.is_pinned
      FROM posts p
      JOIN post_translations t ON p.id = t.post_id
      WHERE t.lang_code = ? AND (t.title LIKE ? OR t.content LIKE ?)
      ORDER BY p.is_pinned DESC, GREATEST(p.updated_at, p.created_at) DESC
      LIMIT ? OFFSET ?
    `;

    const countQuery = `
      SELECT COUNT(p.id) AS count
      FROM posts p
      JOIN post_translations t ON p.id = t.post_id
      WHERE t.lang_code = ? AND (t.title LIKE ? OR t.content LIKE ?)
    `;

    const searchParams = [lang, `%${keyword}%`, `%${keyword}%`];
    const [posts] = await db.query(baseQuery, [...searchParams, limit, offset]);
    const [[{ count }]] = await db.query(countQuery, searchParams);

    const filteredPosts = posts.map(post => {
      if (post.is_private && post.user_id !== userId && !isAdmin) {
        return {
          ...post,
          content: res.locals.translations.private_post_message
        };
      }
      return post;
    });

    const totalPages = Math.ceil(count / limit);
    const paginationRange = generatePagination(page, totalPages);
    
    // ✅ 카테고리 목록을 현재 언어에 맞게 가져옴 (수정)
    const categoryNameColumn = getCategoryNameColumn(lang);
    const [categories] = await db.query(`SELECT id, ${categoryNameColumn} AS name FROM categories`);

    res.render('index', {
      posts: filteredPosts,
      categories,
      isSearch: true,
      searchKeyword: keyword,
      currentPath: req.path,
      pagination: {
        current: page,
        total: totalPages,
        range: paginationRange
      },
      selectedCategory: null,
      user: req.session.user
    });
  } catch (err) {
    console.error('검색 오류:', err);
    res.status(500).send('검색 중 오류 발생');
  }
});

function generatePagination(current, total) {
  const delta = 2;
  const range = [];
  const rangeWithDots = [];
  let l;

  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || (i >= current - delta && i <= current + delta)) {
      range.push(i);
    }
  }

  for (let i of range) {
    if (l) {
      if (i - l === 2) {
        rangeWithDots.push(l + 1);
      } else if (i - l > 2) {
        rangeWithDots.push('...');
      }
    }
    rangeWithDots.push(i);
    l = i;
  }
  return rangeWithDots;
}

// ✅ 메인 페이지 (다국어 지원)
app.get('/', async (req, res) => {
  const category = req.query.category || 'all';
  const page = parseInt(req.query.page) || 1;
  const limit = 9;
  const offset = (page - 1) * limit;

  const userId = req.session.user?.id;
  const isAdmin = req.session.user?.is_admin === 1;
  const lang = res.locals.lang;

  try {
    // 1️⃣ 카테고리 목록을 현재 언어에 맞게 가져옴 (수정)
    const categoryNameColumn = getCategoryNameColumn(lang);
    const [categories] = await db.query(`SELECT id, ${categoryNameColumn} AS name FROM categories`);

    // 2️⃣ 포스트 목록을 가져오는 쿼리 수정 (JOIN 사용)
    let baseQuery = `
      SELECT
        p.id,
        t.title,
        t.content,
        p.categories,
        p.author,
        p.user_id,
        p.created_at,
        p.updated_at,
        p.is_private,
        p.is_pinned,
        IFNULL(p.views, 0) AS views
      FROM posts p
      JOIN post_translations t ON p.id = t.post_id
      WHERE t.lang_code = ?
    `;
    let countQuery = `
      SELECT COUNT(p.id) as count
      FROM posts p
      JOIN post_translations t ON p.id = t.post_id
      WHERE t.lang_code = ?
    `;

    const params = [lang];
    const countParams = [lang];

    if (category !== 'all') {
      // ✅ 카테고리 이름으로 찾기 위해 동적 컬럼명 사용
      baseQuery += ` AND FIND_IN_SET((SELECT ${categoryNameColumn} FROM categories WHERE ${categoryNameColumn} = ?), p.categories)`;
      countQuery += ` AND FIND_IN_SET((SELECT ${categoryNameColumn} FROM categories WHERE ${categoryNameColumn} = ?), p.categories)`;
      params.push(category);
      countParams.push(category);
    }

    baseQuery += ` ORDER BY p.is_pinned DESC, GREATEST(p.updated_at, p.created_at) DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [posts] = await db.query(baseQuery, params);

    const filteredPosts = posts.map(post => {
      if (post.is_private && post.user_id !== userId && !isAdmin) {
        return {
          ...post,
          content: res.locals.translations.private_post_message
        };
      }
      return post;
    });

    const [[{ count }]] = await db.query(countQuery, countParams);
    const totalPages = Math.ceil(count / limit);
    const paginationRange = generatePagination(page, totalPages);

    res.render('index', {
      posts: filteredPosts,
      categories,
      isSearch: false,
      searchKeyword: '',
      currentPath: req.path,
      selectedCategory: category === 'all' ? null : category,
      pagination: {
        current: page,
        total: totalPages,
        range: paginationRange
      }
    });
  } catch (err) {
    console.error('메인 페이지 로드 오류:', err);
    res.status(500).send('메인 페이지 로드 중 오류 발생');
  }
});


// ✅ 카테고리 전체 가져오기 API (다국어 지원)
app.get('/api/categories', async (req, res) => {
  const lang = res.locals.lang;
  try {
    // ✅ 현재 언어에 맞는 카테고리 이름 가져오기 (수정)
    const categoryNameColumn = getCategoryNameColumn(lang);
    const [rows] = await db.query(`SELECT id, ${categoryNameColumn} AS name FROM categories ORDER BY id ASC`);
    res.json({ categories: rows.map(r => r.name) });
  } catch (err) {
    console.error('카테고리 조회 오류:', err);
    res.status(500).json({ error: '카테고리 불러오기 실패' });
  }
});

// ✅ 카테고리 추가 API (다국어 지원)
app.post('/api/categories', async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: '카테고리 이름이 필요합니다.' });

  try {
    // ✅ name_ko 대신 name 컬럼으로 중복 확인 (수정)
    const [existing] = await db.query('SELECT * FROM categories WHERE name = ? OR name_en = ? OR name_fr = ? OR name_zh = ? OR name_ja = ?', [name, name, name, name, name]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: '이미 존재하는 카테고리입니다.' });
    }
    // ✅ name_ko 대신 name 컬럼에 이름을 추가하고, 나머지는 NULL로 둠 (수정)
    await db.query('INSERT INTO categories (name) VALUES (?)', [name]);
    res.json({ success: true });
  } catch (err) {
    console.error('카테고리 추가 오류:', err);
    res.status(500).json({ error: '카테고리 추가 실패' });
  }
});

// ✅ 카테고리 삭제 API (기존과 동일)
app.delete('/api/categories/:name', async (req, res) => {
  const { name } = req.params;
  try {
    // ✅ name_ko 대신 name 컬럼으로 삭제 (수정)
    await db.query(
      `DELETE FROM categories WHERE name = ? OR name_en = ? OR name_fr = ? OR name_zh = ? OR name_ja = ?`,
      [decodeURIComponent(name), decodeURIComponent(name), decodeURIComponent(name), decodeURIComponent(name), decodeURIComponent(name)]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('카테고리 삭제 오류:', err);
    res.status(500).json({ error: '카테고리 삭제 실패' });
  }
});


// ✅ AJAX 검색 API (다국어 지원)
app.get('/api/search', async (req, res) => {
  const keyword = req.query.q?.trim();
  if (!keyword) return res.json({ posts: [] });

  const userId = req.session.user?.id;
  const isAdmin = req.session.user?.is_admin === 1;
  const lang = res.locals.lang;

  try {
    // post_translations 테이블을 JOIN하여 현재 언어의 글에서 검색
    const [posts] = await db.query(`
      SELECT
        p.id,
        t.title,
        t.content,
        p.categories,
        p.author,
        p.user_id,
        p.created_at,
        p.is_private,
        p.is_pinned
      FROM posts p
      JOIN post_translations t ON p.id = t.post_id
      WHERE t.lang_code = ? AND (t.title LIKE ? OR t.content LIKE ?)
      ORDER BY p.is_pinned DESC, GREATEST(p.updated_at, p.created_at) DESC
    `, [lang, `%${keyword}%`, `%${keyword}%`]);

    const filteredPosts = posts.map(post => {
      if (post.is_private && post.user_id !== userId && !isAdmin) {
        return {
          ...post,
          content: res.locals.translations.private_post_message
        };
      }
      return post;
    });
    res.json({ posts: filteredPosts });
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
    res.render('game');
});

// ✅ 서버 실행
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});