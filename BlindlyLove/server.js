const { format } = require('date-fns');
const express = require('express');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const db = require('./config/db'); // DB 연결 설정 파일
const supportedLangs = ['ko', 'en', 'fr', 'zh', 'ja', 'es'];
const app = express();
const PORT = process.env.PORT || 3000;
const allLocales = require('./locales/all.json');


app.use((req, res, next) => {
  if (req.headers.host.startsWith('www.')) {
    return res.redirect(301, `https://${req.headers.host.replace('www.', '')}${req.url}`);
  }
  next();
});

// EJS 템플릿 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 정적 파일 제공 설정
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/ads.txt', express.static(path.join(__dirname, 'public/ads.txt')));

// 미들웨어 설정
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' })); 

// 세션 설정
app.use(session({
  secret: 'wowthats_amazing', // 이 값을 실제 운영 환경에서는 더 복잡하게 설정하세요.
  resave: false,
  saveUninitialized: true,
}));

// 사용자 정보 템플릿에 전달 미들웨어
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  res.locals.user = req.session.user || null;
  next();
});

// ✅ 다국어 locale JSON에서 현재 언어에 맞는 텍스트를 res.locals.locale에 넣어줌
app.use((req, res, next) => {
  const langMatch = req.path.match(/^\/(ko|en|fr|zh|ja|es)(\/|$)/);
  if (langMatch) {
    res.locals.lang = langMatch[1]; // 'en', 'ko', ...
    req.url = req.url.replace(`/${res.locals.lang}`, ''); // URL 정리
  } else {
    res.locals.lang = 'ko'; // 기본 언어
  }

  res.locals.locale = allLocales[res.locals.lang] || allLocales['ko'];

  res.locals.supportedLangs = supportedLangs;
  next();
});


app.get('/sitemap.xml', async (req, res) => {
  try {
    // 사이트맵에서 제외할 카테고리 키워드 정의
    // 이 키워드들이 포함된 카테고리를 가진 게시글은 사이트맵에 포함되지 않습니다.
    const testCategoryKeywords = ['테스트', 'test', 'テスト', '测试', 'noindex-category', '비공개']; 

    // SQL 쿼리에서 testCategoryKeywords에 해당하는 카테고리를 제외하는 조건 생성
    // FIND_IN_SET 함수를 사용하여 콤마로 구분된 'categories' 문자열 내에서 각 키워드의 존재 여부를 확인합니다.
    // 각 키워드에 대해 'FIND_IN_SET(?, posts.categories)' 조건을 생성하고 'OR'로 연결한 후, 전체를 'NOT'으로 감싸 제외합니다.
    const excludeConditions = testCategoryKeywords.map(keyword => `FIND_IN_SET(?, posts.categories)`).join(' OR ');

    // 데이터베이스에서 게시글 정보를 조회합니다.
    // is_private이 0 (공개)이고, 테스트 카테고리 키워드를 포함하지 않는 게시글만 선택합니다.
    const [posts] = await db.query(`
      SELECT id, updated_at, categories
      FROM posts
      WHERE is_private = 0
        AND NOT (${excludeConditions}) -- 여기에 테스트 카테고리 제외 조건 추가
      ORDER BY updated_at DESC
    `, testCategoryKeywords); // excludeConditions에 필요한 파라미터로 testCategoryKeywords 배열을 전달합니다.

    let postUrls = [];
    posts.forEach(post => {
      supportedLangs.forEach(lang => {
        postUrls.push(`
          <url>
            <loc>https://blindly.love/${lang}/post/${post.id}</loc>
            <lastmod>${format(new Date(post.updated_at), 'yyyy-MM-dd')}</lastmod>
            <priority>0.80</priority>
          </url>
        `);
      });
    });
    postUrls = postUrls.join('');

    // 정적 페이지 URL을 생성합니다. 도메인은 blindly.love로 설정되어 있습니다.
    const staticUrls = [
      // Add static pages for each supported language
      ...supportedLangs.map(lang => `<url><loc>https://blindly.love/${lang}/</loc><priority>1.00</priority></url>`),
      ...supportedLangs.map(lang => `<url><loc>https://blindly.love/${lang}/signup</loc><priority>0.80</priority></url>`)
    ].join('');

    // Construct the final Sitemap XML string.
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset
        xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.w3.org/2001/XMLSchema-instance"
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
        ${staticUrls}
        ${postUrls}
      </urlset>
    `;

    // Set the response header to XML and send the Sitemap.
    res.header('Content-Type', 'application/xml');
    res.send(sitemap.trim());
  } catch (err) {
    console.error('🚨 sitemap.xml creation error:', err);
    res.status(500).send('Sitemap creation failed');
  }
});


// 로그인 상태 확인 API
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

// 회원가입 페이지
app.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

// 로그인 처리
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

// 로그아웃 처리
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect(`/${res.locals.lang}/`);
  });
});

// ID 중복 확인 API
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

// 닉네임 중복 확인 API
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

// 회원가입 성공 페이지
app.get('/signup-success', (req, res) => {
  res.render('signup-success');
});


// 글쓰기 페이지
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


app.post('/savePost', async (req, res) => {
  const { categories, is_private, is_pinned, lang_content } = req.body;
  const pinnedValue = is_pinned === 1 || is_pinned === '1' ? 1 : 0;

  // 로그인한 사용자만 글을 쓸 수 있도록 권한 확인
  if (!req.session.user) {
    return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
  }
  if (!categories || categories.length === 0) {
    return res.status(400).json({ success: false, error: '최소 하나의 카테고리를 선택해주세요.' });
  }
  if (!lang_content || !lang_content.ko || !lang_content.ko.title) {
      return res.status(400).json({ success: false, error: '한국어 제목은 필수입니다.' });
  }

  const isPrivate = is_private ? 1 : 0;

  try {
    // 1. `posts` 테이블에 기본 게시글 정보 (카테고리, 비공개, 고정 여부 등) 저장
    // 한국어 제목과 내용은 posts 테이블의 title, content에 저장 (메인 언어)
    const [result] = await db.query(
      'INSERT INTO posts (title, content, categories, author, user_id, is_private, is_pinned) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        lang_content.ko.title, // 한국어 제목
        lang_content.ko.content, // 한국어 내용
        categories.join(','), // 카테고리 배열을 콤마로 구분된 문자열로 저장
        req.session.user.nickname,
        req.session.user.id,
        isPrivate,
        pinnedValue
      ]
    );
    const postId = result.insertId;

    // 2. `post_translations` 테이블에 각 언어별 콘텐츠 저장
    for (const langCode in lang_content) {
      const { title, content } = lang_content[langCode]; // translated_categories는 더 이상 받지 않음

      await db.query(
        'INSERT INTO post_translations (post_id, lang_code, title, content) VALUES (?, ?, ?, ?)',
        [postId, langCode, title, content]
      );
    }

    res.json({ success: true, postId: postId });
  } catch (err) {
    console.error('글 저장 오류:', err);
    res.status(500).json({ success: false, error: '서버 오류로 글을 저장할 수 없습니다.' });
  }
});

// 글 삭제 처리 (기존과 동일)
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

    // 3️⃣ 삭제 전 백업 (posts 테이블의 내용만 백업)
    const [postData] = await db.query('SELECT * FROM posts WHERE id = ?', [postId]);
    const backupPost = postData[0];

    await db.query(`
      INSERT INTO post_backups
        (post_id, title, content, categories, author, user_id, is_private, is_pinned, views, backup_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'delete')
    `, [
      backupPost.id,
      backupPost.title,
      backupPost.content,
      backupPost.categories,
      backupPost.author,
      backupPost.user_id,
      backupPost.is_private,
      backupPost.is_pinned,
      backupPost.views
    ]);

    // 4️⃣ 삭제 수행 (CASCADE 설정으로 post_translations도 함께 삭제됨)
    await db.query('DELETE FROM posts WHERE id = ?', [postId]);
    res.redirect(`/${res.locals.lang}/`); // 삭제 후 메인 페이지로 리디렉션
  } catch (err) {
    console.error('삭제 오류:', err);
    res.status(500).send('서버 오류로 삭제할 수 없습니다.');
  }
});


app.get('/edit/:id', async (req, res) => {
  const postId = req.params.id;
  const userId = req.session.user?.id;

  try {
    // 1. posts 테이블에서 기본 정보 가져오기
    const [basePostRows] = await db.query('SELECT * FROM posts WHERE id = ?', [postId]);
    if (basePostRows.length === 0) return res.status(404).send('게시글을 찾을 수 없습니다.');

    const basePost = basePostRows[0];

    // 권한 체크: 글 작성자이거나 관리자인 경우에만 수정 페이지 접근 가능
    if (basePost.user_id !== userId && (!req.session.user || req.session.user.is_admin !== 1)) {
      return res.status(403).send('글 작성자 또는 관리자만 수정할 수 있습니다.');
    }

    // 2. post_translations 테이블에서 모든 언어 번역 가져오기
    const [translationsRows] = await db.query(
      'SELECT lang_code, title, content FROM post_translations WHERE post_id = ?', // translated_categories 제거
      [postId]
    );

    const postForEjs = {
      id: basePost.id,
      categories: basePost.categories, // 쉼표로 구분된 문자열 (원본 카테고리 이름)
      is_private: basePost.is_private,
      is_pinned: basePost.is_pinned,
      author: basePost.author,
      user_id: basePost.user_id,
      // lang_content 객체에 각 언어별 데이터를 넣어 EJS에서 접근하기 쉽게 함
      // 예: post.ko.title, post.en.content
    };

    translationsRows.forEach(row => {
      postForEjs[row.lang_code] = {
        title: row.title,
        content: row.content,
        // translated_categories는 이제 여기서 처리하지 않음
      };
    });

    res.render('editor', {
      user: req.session.user,
      post: postForEjs,
      isEdit: true
    });
  } catch (err) {
    console.error('수정 페이지 오류:', err);
    res.status(500).send('서버 오류');
  }
});


app.post('/edit/:id', async (req, res) => {
  const postId = req.params.id;
  const userId = req.session.user?.id;
  const { categories, is_private, is_pinned, lang_content } = req.body;

  // 유효성 검사
  if (!categories || categories.length === 0) {
    return res.status(400).json({ success: false, error: '최소 하나의 카테고리를 선택해주세요.' });
  }
  if (!lang_content || !lang_content.ko || !lang_content.ko.title) {
      return res.status(400).json({ success: false, error: '한국어 제목은 필수입니다.' });
  }

  const isPrivate = is_private ? 1 : 0;
  const pinnedValue = is_pinned === 1 || is_pinned === '1' ? 1 : 0;

  try {
    // 1. 기존 `posts` 테이블에서 글 정보 확인 및 권한 체크
    const [basePostRows] = await db.query('SELECT * FROM posts WHERE id = ?', [postId]);
    if (basePostRows.length === 0) return res.status(404).json({ success: false, error: '게시글을 찾을 수 없습니다.' });

    const existingPost = basePostRows[0];
    if (existingPost.user_id !== userId && (!req.session.user || req.session.user.is_admin !== 1)) {
      return res.status(403).json({ success: false, error: '글 작성자 또는 관리자만 수정할 수 있습니다.' });
    }

    // 2. 수정 전 백업 (posts 테이블의 내용만 백업)
    await db.query(`
      INSERT INTO post_backups
        (post_id, title, content, categories, author, user_id, is_private, is_pinned, views, backup_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'edit')
    `, [
      existingPost.id,
      existingPost.title,
      existingPost.content,
      existingPost.categories,
      existingPost.author,
      existingPost.user_id,
      existingPost.is_private,
      existingPost.is_pinned,
      existingPost.views
    ]);

    // 3. `posts` 테이블 업데이트 (한국어 제목, 내용 및 공통 정보)
    await db.query(
      'UPDATE posts SET title = ?, content = ?, categories = ?, is_private = ?, is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [
        lang_content.ko.title, // 한국어 제목
        lang_content.ko.content, // 한국어 내용
        categories.join(','),
        isPrivate,
        pinnedValue,
        postId
      ]
    );

    // 4. `post_translations` 테이블 업데이트 또는 삽입
    for (const langCode in lang_content) {
      const { title, content } = lang_content[langCode]; // translated_categories는 더 이상 받지 않음

      // UPSERT 로직: 해당 post_id와 lang_code 조합이 있으면 UPDATE, 없으면 INSERT
      await db.query(
        `INSERT INTO post_translations (post_id, lang_code, title, content)
         VALUES (?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         content = VALUES(content),
         updated_at = CURRENT_TIMESTAMP`,
        [postId, langCode, title, content]
      );
    }

    res.json({ success: true, redirect: `/${res.locals.lang}/post/${postId}` });
  } catch (err) {
    console.error('수정 처리 오류:', err);
    res.status(500).json({ success: false, error: '서버 오류로 글을 수정할 수 없습니다.' });
  }
});


app.get('/post/:id', async (req, res) => {
  try {
    const postId = req.params.id;
    const safeLang = res.locals.lang; // req.query.lang 대신 res.locals.lang 사용

    // 조회수 중복 방지용 세션 초기화
    if (!req.session.viewedPosts) {
      req.session.viewedPosts = [];
    }

    // 1. `posts` 테이블에서 기본 게시글 정보 (메타데이터 및 is_private 등)
    const [basePostRows] = await db.query('SELECT * FROM posts WHERE id = ?', [postId]);
    if (basePostRows.length === 0) {
      return res.status(404).render('404');
    }

    const post = basePostRows[0]; // post는 기본 정보와 한국어 제목/내용을 포함

    // 비공개 글 필터링
    const isAdmin = req.session.user?.is_admin === 1;
    const isAuthor = req.session.user?.id === post.user_id;
    if (post.is_private && !isAuthor && !isAdmin) {
      return res.status(403).render('403', { message: '비공개 글입니다.', user: req.session.user });
    }

    // 중복 조회 방지
    if (!req.session.viewedPosts.includes(postId)) {
      await db.query('UPDATE posts SET views = views + 1, updated_at = updated_at WHERE id = ?', [postId]);
      req.session.viewedPosts.push(postId);
    }

    // 2. `post_translations` 테이블에서 해당 언어의 번역된 콘텐츠 가져오기
    let [translations] = await db.query(
      'SELECT title, content FROM post_translations WHERE post_id = ? AND lang_code = ?',
      [postId, safeLang]
    );

    let translation = translations[0];

    // 요청된 언어의 번역이 없는 경우, 한국어(ko) 버전으로 fallback
    if (!translation && safeLang !== 'ko') {
      console.warn(`게시글 ID ${postId}에 대한 언어 '${safeLang}' 번역이 없어 'ko'로 대체합니다.`);
      [translations] = await db.query(
        'SELECT title, content FROM post_translations WHERE post_id = ? AND lang_code = "ko"',
        [postId]
      );
      translation = translations[0];
    }
    
    // 만약 한국어 버전도 없다면 (매우 드문 경우, 새 글 작성 시 한국어는 필수로 저장하므로)
    if (!translation) {
        translation = {
            title: post.title,
            content: post.content,
        };
    }

    // 3. 게시글의 원본 카테고리(쉼표로 구분된 문자열)를 파싱하고, 각 카테고리의 번역된 이름을 조회
    const originalCategories = post.categories ? post.categories.split(',').map(c => c.trim()) : [];
    const translatedCategories = [];
    if (originalCategories.length > 0) {
      const categoryColumnForDisplay = (safeLang === 'ko') ? 'name' : `name_${safeLang}`;
      const placeholders = originalCategories.map(() => '?').join(','); // IN 절에 사용될 ? 플레이스홀더 생성

      const [categoryNameRows] = await db.query(
        `SELECT COALESCE(c.${categoryColumnForDisplay}, c.name) AS name FROM categories c WHERE c.name IN (${placeholders})`,
        originalCategories // originalCategories 배열을 파라미터로 전달
      );
      translatedCategories.push(...categoryNameRows.map(row => row.name));
    }


    // `post-view.ejs`에 전달할 최종 `post` 객체 구성
    const postForView = {
        ...post, // posts 테이블의 기본 데이터 (author, user_id, is_private, is_pinned 등)
        title: translation.title, // 요청된 언어 또는 fallback 언어의 제목
        content: translation.content, // 요청된 언어 또는 fallback 언어의 내용
        categories: translatedCategories, // 번역된 카테고리 이름 배열
        originalCategories: originalCategories // (선택 사항) 필요하다면 원본 카테고리도 전달
    };

    const canonicalUrl = `${req.protocol}://${req.get('host')}/${safeLang}/post/${postId}`; // 다국어 URL 포함
    const alternateLinks = supportedLangs.map(lang => ({
      lang,
      href: `${req.protocol}://${req.get('host')}/${lang}/post/${postId}`
    }));

    res.render('post-view', {
      post: postForView,
      user: req.session.user,
      canonicalUrl,
      alternateLinks, 
      lang: safeLang // 현재 로드된 언어를 템플릿에 전달
    });

  } catch (err) {
    console.error('🌐 다국어 글 보기 오류:', err);
    res.status(500).render('error', { message: '서버 오류로 글을 불러올 수 없습니다.', user: req.session.user });
  }
});


// 카테고리 전체 가져오기 API (기존과 동일하지만, DB 쿼리에서 lang을 사용)
app.get('/api/categories', async (req, res) => {
  const safeLang = res.locals.lang; // req.query.lang 대신 res.locals.lang 사용
  const column = (safeLang === 'ko') ? 'name' : `COALESCE(name_${safeLang}, '')`;

  try {
    // 쿼리에서 'name' 컬럼을 가져올 때, NULL이면 빈 문자열로 대체되도록 변경
    const [rows] = await db.query(`SELECT id, ${column} AS name FROM categories ORDER BY id ASC`);
    const names = rows.map(r => r.name);
    res.json({ categories: names });
  } catch (err) {
    console.error('카테고리 조회 오류:', err);
    res.status(500).json({ error: '카테고리 불러오기 실패' });
  }
});

// 카테고리 추가 API (기존과 동일)
app.post('/api/categories', async (req, res) => {
  const { name, name_en, name_fr, name_zh, name_ja, name_es } = req.body;

  if (!name) return res.status(400).json({ error: '기본 카테고리 이름(name)이 필요합니다.' });

  try {
    // 중복 체크는 name 기준 (한국어)
    const [existing] = await db.query('SELECT * FROM categories WHERE name = ?', [name]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: '이미 존재하는 카테고리입니다.' });
    }

    await db.query(
      `INSERT INTO categories (name, name_en, name_fr, name_zh, name_ja, name_es) VALUES (?, ?, ?, ?, ?, ?)`,
      [name, name_en || '', name_fr || '', name_zh || '', name_ja || '', name_es || '']
    );

    res.json({ success: true });
  } catch (err) {
    console.error('카테고리 추가 오류:', err);
    res.status(500).json({ error: '카테고리 추가 실패' });
  }
});

// 카테고리 삭제 API (기존과 동일)
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


// 검색 결과 페이지 (비공개 글 제목 공개 및 내용 숨김 적용) - 다국어 처리 수정
// 검색 결과 페이지 (비공개 글 제목 공개 및 내용 숨김 적용) - 다국어 처리 수정
app.get('/search', async (req, res) => {
  const keyword = req.query.q?.trim();
  const categoryFilter = req.query.category?.trim() || null; // ✅ 추가
  if (!keyword) return res.redirect(`/${res.locals.lang}/`); 

  const userId = req.session.user?.id;
  const isAdmin = req.session.user?.is_admin === 1;
  const safeLang = res.locals.lang;

  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    // 기본 검색 SQL
    let sql = `
      SELECT
          p.id, p.categories, p.author, p.user_id, p.created_at, p.is_private, p.is_pinned,
          COALESCE(pt_req.title, pt_ko.title, p.title) AS title,
          COALESCE(pt_req.content, pt_ko.content, p.content) AS content
      FROM posts p
      LEFT JOIN post_translations pt_req ON p.id = pt_req.post_id AND pt_req.lang_code = ?
      LEFT JOIN post_translations pt_ko ON p.id = pt_ko.post_id AND pt_ko.lang_code = 'ko'
      WHERE (
          COALESCE(pt_req.title, pt_ko.title, p.title) LIKE ?
          OR COALESCE(pt_req.content, pt_ko.content, p.content) LIKE ?
          OR p.categories LIKE ?
      )
    `;

    const params = [safeLang, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`];

    // ✅ 카테고리 필터 추가
    if (categoryFilter) {
      sql += ` AND FIND_IN_SET(?, p.categories) > 0`; 
      params.push(categoryFilter);
    }

    sql += `
      ORDER BY p.is_pinned DESC, GREATEST(p.updated_at, p.created_at) DESC
    `;

    const [allPosts] = await db.query(sql, params);

    // 비공개 글 처리
    const filteredAll = allPosts.map(post => {
      if (post.is_private && post.user_id !== userId && !isAdmin) {
        return { ...post, content: '이 글은 비공개로 설정되어 있습니다.' };
      }
      return post;
    });

    const total = filteredAll.length;
    const totalPages = Math.ceil(total / limit);
    const paginationRange = generatePagination(page, totalPages);

    // 카테고리 목록 불러오기 (관리자 전용)
    const categoryColumn = (safeLang === 'ko') ? 'name' : `name_${safeLang}`;
    const [categoryRows] = await db.query(`
      SELECT
        TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p.categories, ',', numbers.n), ',', -1)) AS original_category,
        MAX(p.created_at) AS latest,
        c.${categoryColumn} AS translated_category_name
      FROM posts p
      JOIN (
        SELECT a.N + b.N * 10 + 1 AS n
        FROM (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
              UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a,
             (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
              UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b
      ) numbers
      ON CHAR_LENGTH(p.categories) - CHAR_LENGTH(REPLACE(p.categories, ',', '')) >= numbers.n - 1
      JOIN categories c ON TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p.categories, ',', numbers.n), ',', -1)) = c.name
      GROUP BY original_category, translated_category_name
      ORDER BY latest DESC
    `);

    const allCategories = categoryRows.map(row => ({
      original: row.original_category,
      translated: row.translated_category_name
    }));
    
    for (const post of filteredAll) {
      const originalCategories = post.categories ? post.categories.split(',').map(c => c.trim()) : [];
      const translatedCategories = [];
      if (originalCategories.length > 0) {
        const categoryColumn = (safeLang === 'ko') ? 'name' : `name_${safeLang}`;
        const placeholders = originalCategories.map(() => '?').join(',');
        const [categoryNames] = await db.query(
          `SELECT COALESCE(${categoryColumn}, name) AS name FROM categories WHERE name IN (${placeholders})`,
          originalCategories
        );
        translatedCategories.push(...categoryNames.map(row => row.name));
      }
      post.translated_categories_display = translatedCategories;
    }
    
    const paginatedPosts = filteredAll.slice(offset, offset + limit);

    res.render('index', {
      posts: paginatedPosts,
      categories: allCategories,
      isSearch: true,
      searchKeyword: keyword,
      currentPath: req.path,
      pagination: {
        current: page,
        total: totalPages,
        range: paginationRange
      },
      selectedCategory: categoryFilter, // ✅ 선택된 카테고리 반영
      user: req.session.user,
      lang: safeLang,
      locale: res.locals.locale
    });
  } catch (err) {
    console.error('검색 오류:', err);
    res.status(500).send('검색 중 오류 발생');
  }
});


// AJAX 검색 API (비공개 글 제목 공개 및 내용 숨김 적용) - 다국어 처리 수정
app.get('/api/search', async (req, res) => {
  const keyword = req.query.q?.trim();
  if (!keyword) return res.json({ posts: [] });

  const userId = req.session.user?.id;
  const isAdmin = req.session.user?.is_admin === 1;
  const safeLang = res.locals.lang; // req.query.lang 대신 res.locals.lang 사용

  try {
    // 모든 관련 글을 가져옵니다 (비공개 여부와 상관없이)
    const [posts] = await db.query(`
      SELECT
          p.id, p.categories, p.author, p.user_id, p.created_at, p.is_private, p.is_pinned,
          COALESCE(pt_req.title, pt_ko.title, p.title) AS title,
          COALESCE(pt_req.content, pt_ko.content, p.content) AS content
      FROM posts p
      LEFT JOIN post_translations pt_req ON p.id = pt_req.post_id AND pt_req.lang_code = ?
      LEFT JOIN post_translations pt_ko ON p.id = pt_ko.post_id AND pt_ko.lang_code = 'ko'
      WHERE
          COALESCE(pt_req.title, pt_ko.title, p.title) LIKE ?
          OR COALESCE(pt_req.content, pt_ko.content, p.content) LIKE ?
          OR p.categories LIKE ? -- 카테고리는 원본 이름으로 검색
      ORDER BY p.is_pinned DESC, GREATEST(p.updated_at, p.created_at) DESC
    `, [safeLang, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`]);

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

    // 각 게시글의 카테고리도 번역하여 응답에 포함
    for (const post of filteredPosts) {
        const originalCategories = post.categories ? post.categories.split(',').map(c => c.trim()) : [];
        const translatedCategories = [];
        if (originalCategories.length > 0) {
            const categoryColumn = (safeLang === 'ko') ? 'name' : `name_${safeLang}`;
            const placeholders = originalCategories.map(() => '?').join(',');
            const [categoryNames] = await db.query(
                `SELECT COALESCE(${categoryColumn}, name) AS name FROM categories WHERE name IN (${placeholders})`,
                originalCategories
            );
            translatedCategories.push(...categoryNames.map(row => row.name));
        }
        post.categories = translatedCategories; // 번역된 카테고리 이름으로 대체
    }

    res.json({ posts: filteredPosts }); // 필터링된 글 목록 전달
  } catch (err) {
    console.error('AJAX 검색 오류:', err);
    res.status(500).json({ error: '검색 중 오류 발생' });
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

// 메인 페이지 (`/`) - 다국어 제목/내용 및 카테고리 번역을 가져오도록 수정
app.get('/', async (req, res) => {
  const category = req.query.category || 'all'; // 여기의 category는 'original_name' (e.g., '기술')
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const userId = req.session.user?.id;
  const isAdmin = req.session.user?.is_admin === 1;
  const safeLang = res.locals.lang; // req.query.lang 대신 res.locals.lang 사용

  try {
    let baseQuery = `
      SELECT
          p.id, p.categories, p.author, p.user_id, p.created_at, p.updated_at, p.is_private, p.is_pinned, IFNULL(p.views, 0) AS views,
          COALESCE(pt_req.title, pt_ko.title, p.title) AS title,
          COALESCE(pt_req.content, pt_ko.content, p.content) AS content
      FROM posts p
      LEFT JOIN post_translations pt_req ON p.id = pt_req.post_id AND pt_req.lang_code = ?
      LEFT JOIN post_translations pt_ko ON p.id = pt_ko.post_id AND pt_ko.lang_code = 'ko'
    `;
    let countQuery = `SELECT COUNT(*) as count FROM posts`;
    const params = [safeLang];
    const countParams = [];

    // 카테고리 필터링 시에는 `posts.categories` (원본 이름)을 기준으로 필터링
    if (category !== 'all') {
      baseQuery += ` WHERE FIND_IN_SET(?, p.categories)`;
      countQuery += ` WHERE FIND_IN_SET(?, categories)`;
      params.push(category);
      countParams.push(category);
    }

    baseQuery += ` ORDER BY p.is_pinned DESC, GREATEST(p.updated_at, p.created_at) DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    // 게시글 조회
    const [posts] = await db.query(baseQuery, params);

    // 비공개 필터링
    const filteredPosts = posts.map(post => {
      if (post.is_private && post.user_id !== userId && !isAdmin) {
        return {
          ...post,
          content: '이 글은 비공개로 설정되어 있습니다.'
        };
      }
      return post;
    });

    // 각 게시글의 카테고리도 번역하여 filteredPosts에 추가 (렌더링 시 사용)
    for (const post of filteredPosts) {
        const originalCategories = post.categories ? post.categories.split(',').map(c => c.trim()) : [];
        const translatedCategories = [];
        if (originalCategories.length > 0) {
            const categoryColumn = (safeLang === 'ko') ? 'name' : `name_${safeLang}`;
            const placeholders = originalCategories.map(() => '?').join(',');
            const [categoryNames] = await db.query(
                `SELECT COALESCE(${categoryColumn}, name) AS name FROM categories WHERE name IN (${placeholders})`, // 여기도 COALESCE 추가 및 쿼리 단순화
                originalCategories
            );
            translatedCategories.push(...categoryNames.map(row => row.name));
        }
        post.translated_categories_display = translatedCategories; // 템플릿에서 사용할 번역된 카테고리 이름
    }


    // 전체 개수
    const [[{ count }]] = await db.query(countQuery, countParams);
    const totalPages = Math.ceil(count / limit);
    const paginationRange = generatePagination(page, totalPages);

    // 🔁 전체 글에서 모든 카테고리와 최신 글 작성일 기준 정렬 (언어별 카테고리 이름으로 가져오도록 수정)
    const categoryColumnForDisplay = (safeLang === 'ko') ? 'name' : `name_${safeLang}`;
    const [categoryRows] = await db.query(`
      SELECT
        TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p.categories, ',', numbers.n), ',', -1)) AS original_category,
        MAX(p.created_at) AS latest,
        COALESCE(c.${categoryColumnForDisplay}, c.name) AS translated_category_name -- 여기가 중요!
      FROM posts p
      JOIN (
        SELECT a.N + b.N * 10 + 1 AS n
        FROM (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
              UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) a,
             (SELECT 0 AS N UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
              UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9) b
      ) numbers
      ON CHAR_LENGTH(p.categories) - CHAR_LENGTH(REPLACE(p.categories, ',', '')) >= numbers.n - 1
      JOIN categories c ON TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p.categories, ',', numbers.n), ',', -1)) = c.name
      GROUP BY original_category, translated_category_name 
      ORDER BY latest DESC
    `);

// 모든 카테고리를 원본 이름과 번역된 이름 객체 배열로 구성
const allCategories = categoryRows.map(row => ({
    original: row.original_category, // 필터링을 위해 원본 카테고리도 전달
    translated: row.translated_category_name
}));

// 현재 선택된 카테고리를 번역된 이름으로 변환하여 selectedCategory에 전달
let translatedSelectedCategory = null;
if (category !== 'all') {
    const foundCategory = allCategories.find(cat => cat.original === category);
    if (foundCategory) {
        translatedSelectedCategory = foundCategory.translated;
    }
}

res.render('index', {
  posts: filteredPosts,
  categories: allCategories, // 원본 & 번역된 카테고리 객체 배열
  isSearch: false,
  searchKeyword: '',
  currentPath: req.path,
  selectedCategory: translatedSelectedCategory, // 번역된 선택 카테고리 이름
  pagination: {
    current: page,
    total: totalPages,
    range: paginationRange
  },
  lang: safeLang // 현재 언어 정보를 EJS로 넘겨줍니다.
});
  } catch (err) {
    console.error('메인 페이지 로드 오류:', err);
    res.status(500).send('메인 페이지 로드 중 오류 발생');
  }
});


// DB 연결 확인
db.query('SELECT NOW()')
  .then(([rows]) => console.log('✅ DB 응답:', rows[0]))
  .catch(err => console.error('❌ 쿼리 에러:', err));

// 서버 실행
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});