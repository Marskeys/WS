const { format } = require('date-fns');
const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const session = require('express-session');
const db = require('./config/db'); // DB 연결 설정 파일
const supportedLangs = ['ko', 'en', 'fr', 'zh', 'ja'];
const app = express();
const PORT = process.env.PORT || 3002;
const allLocales = require('./locales/all.json');

// === Helper: merge locale with safe defaults ===
function mergeLocaleWithDefaults(lang) {
  const base = (allLocales && allLocales['ko']) ? allLocales['ko'] : {};
  const cur = (allLocales && allLocales[lang]) ? allLocales[lang] : {};
  const merged = { ...base, ...cur };
  merged.search = {
    placeholder: '검색어를 입력하세요',
    resultsFor: '"%s" 검색결과',
    ...(merged.search || {})
  };
  merged.profile = {
    'profile-name': '',
    'profile-bio': '',
    'profile-tags': [],
    ...(merged.profile || {})
  };
  merged.tabs = {
    allPosts: '전체글',
    searchResults: '검색결과',
    ...(merged.tabs || {})
  };
  merged.tableHeaders = {
    number: '번호',
    title: '제목',
    author: '작성자',
    category: '카테고리',
    date: '작성일',
    views: '조회수',
    ...(merged.tableHeaders || {})
  };
  merged.ui = {
    tocButton: '목차',
    ...(merged.ui || {})
  };
  return merged;
}

const { map: slugMap } = require('./slugMap');

app.use((req, res, next) => {
  // www → non-www 리다이렉트
  if (req.headers.host.startsWith('www.')) {
    return res.redirect(
      301,
      `https://${req.headers.host.replace('www.', '')}${req.url}`
    );
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

// ✅ 공통 locals 미들웨어 (라우트보다 위)
app.use((req, res, next) => {
  // 💡 URL에서 언어 코드 추출
  const langMatch = req.path.match(/^\/(ko|en|fr|zh|ja)(\/|$)/);
  res.locals.lang = langMatch ? langMatch[1] : 'ko';
  req.lang = res.locals.lang; // 다른 미들웨어/라우트에서 쉽게 접근 가능하도록

  // locale, user, panelData 등 공통 locals 설정
  const defaultLocale = {
    meta: { title: 'Bug Loop · Online HTML Editor', description: '' },
    profile: {
      'profile-name': 'Bug Loop',
      'profile-bio': '',
      'profile-tags': []
    },
    editor: {
      'editor-title': 'Online HTML Editor'
    }
  };
  res.locals.locale = Object.assign({}, defaultLocale, mergeLocaleWithDefaults(res.locals.lang));
  if (!res.locals.locale.profile) res.locals.locale.profile = defaultLocale.profile;
  if (!res.locals.locale.editor) res.locals.locale.editor = defaultLocale.editor;
  res.locals.user = req.session.user || null;
  res.locals.currentPath = req.path;
  res.locals.supportedLangs = supportedLangs;

  // ✅ panelData를 allLocales에서 불러오기
  if (allLocales[res.locals.lang] && allLocales[res.locals.lang].panel) {
    res.locals.panelData = allLocales[res.locals.lang].panel;
  } else {
    res.locals.panelData = allLocales['ko'].panel; // 기본값
  }

  next();
});


function buildPanel({ lang, section, topic }) {
  const filePath = path.join(__dirname, 'content', String(lang).toLowerCase(),
    String(section).toLowerCase(), `${String(topic).toLowerCase()}.html`);
  try {
    if (!fs.existsSync(filePath)) {
      console.error('[PANEL] not found:', filePath);
      return {
        title: `${section.toUpperCase()} / ${topic.toUpperCase()}`,
        body: `${lang} 콘텐츠 파일이 아직 없어요: ${filePath}`,
        chips: []
      };
    }
    const html = fs.readFileSync(filePath, 'utf8');
    return { html };
  } catch (e) {
    console.error('[PANEL] read error:', filePath, e?.code || e);
    return {
      title: `${section.toUpperCase()} / ${topic.toUpperCase()}`,
      body: `${lang} 파일 읽기 오류: ${filePath} (${e?.code || e})`,
      chips: []
    };
  }
}

// ⭐ 패널 라우팅 핸들러를 위한 헬퍼 함수
async function handlePanelRoute(req, res, next) {
  try {
    const { lang, section, topic } = req.params;
    res.locals.lang = lang;

    // ✅ 특정 라우트는 패널 처리를 스킵하고 다음 미들웨어/라우트로 넘깁니다.
    if (section === 'write' || section === 'edit' || (section === 'post' && /^\d+$/.test(topic))) {
      return next();
    }

    // 💡 getSidebarData를 호출하여 사이드바 데이터를 일관되게 가져옵니다.
    const { postsForSidebar, allCategories, translatedSelectedCategory, paginationRange } = await getSidebarData(req);

    const panelData = buildPanel({ lang, section, topic });
    res.locals.panelData = panelData;
    res.locals.posts = postsForSidebar;
    res.locals.categories = allCategories; // 💡 카테고리 데이터 추가
    res.locals.selectedCategory = translatedSelectedCategory;
    res.locals.pagination = { current: 1, total: 1, range: [1] }; // 패널 페이지는 고정된 값 사용
    res.locals.isSearch = false;
    res.locals.searchKeyword = '';

    const wantsPartial =
      (typeof req.query.partial !== 'undefined' &&
        !['0', 'false', 'no', 'off'].includes(String(req.query.partial).toLowerCase()))
      || req.get('X-Requested-With') === 'XMLHttpRequest'
      || (req.headers.accept && req.headers.accept.includes('text/fragment'));

    if (wantsPartial) {
      return res.render('partials/panel');
    }
    return res.render('index');
  } catch (err) {
    console.error('패널 라우트 오류:', err);
    return res.status(500).send('서버 오류');
  }
}


const handleWriteRoute = async (req, res) => {
  if (!req.session.user || req.session.user.is_admin !== 1) {
    return res.status(403).send('접근 권한이 없습니다. 관리자만 글을 작성할 수 있습니다.');
  }

  const safeLang = req.params.lang || 'ko';
  res.locals.lang = safeLang;
  try {
    const { postsForSidebar, allCategories, translatedSelectedCategory, paginationRange } = await getSidebarData(req);

    res.render('editor', {
      user: req.session.user,
      post: null,
      isEdit: false,
      posts: postsForSidebar,
      categories: allCategories,
      isSearch: false,
      searchKeyword: '',
      selectedCategory: translatedSelectedCategory,
      locale: res.locals.locale,
      lang: safeLang,
      pagination: {
        current: parseInt(req.query.page) || 1,
        total: Math.ceil((await getPostCount(req)) / 10),
        range: paginationRange
      }
    });
  } catch (err) {
    console.error('글쓰기 페이지 로드 오류:', err);
    res.status(500).send('글쓰기 페이지 로드 중 오류 발생');
  }
};

const handleEditRoute = async (req, res) => {
  const postId = req.params.id;
  const userId = req.session.user?.id;
  const safeLang = req.params.lang || 'ko';
  res.locals.lang = safeLang;

  try {
    const [basePostRows] = await db.query('SELECT * FROM posts WHERE id = ?', [postId]);
    if (basePostRows.length === 0) return res.status(404).send('게시글을 찾을 수 없습니다.');

    const basePost = basePostRows[0];
    if (basePost.user_id !== userId && (!req.session.user || req.session.user.is_admin !== 1)) {
      return res.status(403).send('글 작성자 또는 관리자만 수정할 수 있습니다.');
    }

    const [translationsRows] = await db.query(
      'SELECT lang_code, title, content FROM post_translations WHERE post_id = ?',
      [postId]
    );

    const postForEjs = {
      id: basePost.id,
      categories: basePost.categories,
      is_private: basePost.is_private,
      is_pinned: basePost.is_pinned,
      author: basePost.author,
      user_id: basePost.user_id,
    };

    translationsRows.forEach(row => {
      postForEjs[row.lang_code] = {
        title: row.title,
        content: row.content,
      };
    });

    const { postsForSidebar, allCategories, translatedSelectedCategory, paginationRange } = await getSidebarData(req);

    res.render('editor', {
      user: req.session.user,
      post: postForEjs,
      isEdit: true,
      posts: postsForSidebar,
      categories: allCategories,
      isSearch: false,
      searchKeyword: '',
      selectedCategory: translatedSelectedCategory,
      locale: res.locals.locale,
      lang: safeLang,
      pagination: {
        current: parseInt(req.query.page) || 1,
        total: Math.ceil((await getPostCount(req)) / 10),
        range: paginationRange
      }
    });
  } catch (err) {
    console.error('수정 페이지 로드 오류:', err);
    res.status(500).send('서버 오류');
  }
};

const handlePostViewRoute = async (req, res) => {
  try {
    const postId = req.params.id;
    const safeLang = req.params.lang; // URL 파라미터에서 직접 언어 추출
    res.locals.lang = safeLang; // locals 업데이트

    if (!req.session.viewedPosts) {
      req.session.viewedPosts = [];
    }

    const [basePostRows] = await db.query('SELECT * FROM posts WHERE id = ?', [postId]);
    if (basePostRows.length === 0) {
      return res.status(404).render('404');
    }

    const post = basePostRows[0];
    const isAdmin = req.session.user?.is_admin === 1;
    const isAuthor = req.session.user?.id === post.user_id;
    if (post.is_private && !isAuthor && !isAdmin) {
      return res.status(403).render('403', { message: '비공개 글입니다.', user: req.session.user });
    }

    if (!req.session.viewedPosts.includes(postId)) {
      await db.query('UPDATE posts SET views = views + 1, updated_at = updated_at WHERE id = ?', [postId]);
      req.session.viewedPosts.push(postId);
    }

    let [translations] = await db.query(
      'SELECT title, content FROM post_translations WHERE post_id = ? AND lang_code = ?',
      [postId, safeLang]
    );

    let translation = translations[0];

    if (!translation && safeLang !== 'ko') {
      console.warn(`게시글 ID ${postId}에 대한 언어 '${safeLang}' 번역이 없어 'ko'로 대체합니다.`);
      [translations] = await db.query(
        'SELECT title, content FROM post_translations WHERE post_id = ? AND pt_ko.lang_code = "ko"',
        [postId]
      );
      translation = translations[0];
    }

    if (!translation) {
      translation = {
        title: post.title,
        content: post.content,
      };
    }

    const originalCategories = post.categories ? post.categories.split(',').map(c => c.trim()) : [];
    const translatedCategories = [];
    if (originalCategories.length > 0) {
      const categoryColumnForDisplay = (safeLang === 'ko') ? 'name' : `name_${safeLang}`;
      const placeholders = originalCategories.map(() => '?').join(',');

      const [categoryNameRows] = await db.query(
        `SELECT COALESCE(c.${categoryColumnForDisplay}, c.name) AS name FROM categories c WHERE c.name IN (${placeholders})`,
        originalCategories
      );
      translatedCategories.push(...categoryNameRows.map(row => row.name));
    }

    const postForView = {
      ...post,
      title: translation.title,
      content: translation.content,
      categories: translatedCategories,
      originalCategories: originalCategories
    };

    const canonicalUrl = `${req.protocol}://${req.get('host')}/${safeLang}/post/${postId}`;
    const alternateLinks = supportedLangs.map(lang => ({
      lang,
      href: `${req.protocol}://${req.get('host')}/${lang}/post/${postId}`
    }));

    const { postsForSidebar, allCategories, translatedSelectedCategory, paginationRange } = await getSidebarData(req);

    res.render('post-view', {
      post: postForView,
      posts: postsForSidebar,
      user: req.session.user,
      canonicalUrl,
      alternateLinks,
      lang: safeLang,
      isSearch: false,
      searchKeyword: '',
      selectedCategory: translatedSelectedCategory,
      locale: res.locals.locale,
      categories: allCategories,
      pagination: {
        current: parseInt(req.query.page) || 1,
        total: Math.ceil((await getPostCount(req)) / 10),
        range: paginationRange
      }
    });

  } catch (err) {
    console.error('🌐 다국어 글 보기 오류:', err);
    res.status(500).render('error', { message: '서버 오류로 글을 불러올 수 없습니다.', user: req.session.user });
  }
};

// ⭐ 로그아웃 라우트 (언어 코드 포함)
app.get('/:lang/logout', (req, res) => {
  req.session.destroy(() => {
    // 세션 파괴 후 리다이렉트
    res.redirect(`/${req.params.lang}/`);
  });
});

// ⭐ 로그아웃 라우트 (언어 코드 미포함, 기본값 'ko'로 처리)
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    // 세션 파괴 후 리다이렉트
    res.redirect(`/ko/`);
  });
});

// ⭐ 글쓰기 페이지 라우트 (언어 코드 포함)
app.get('/:lang/write', handleWriteRoute);

// ⭐ 글쓰기 페이지 라우트 (언어 코드 미포함, 기본값 'ko'로 처리)
app.get('/write', (req, res) => {
  req.params.lang = 'ko';
  handleWriteRoute(req, res);
});


// ⭐ 글 수정 페이지 라우트 (언어 코드 포함)
app.get('/:lang/edit/:id', handleEditRoute);

// ⭐ 글 수정 페이지 라우트 (언어 코드 미포함, 기본값 'ko'로 처리)
app.get('/edit/:id', (req, res) => {
  req.params.lang = 'ko';
  handleEditRoute(req, res);
});

// ⭐ 글 상세 페이지 라우트 (언어 코드 포함)
app.get('/:lang/post/:id', handlePostViewRoute);

// ⭐ 글 상세 페이지 라우트 (언어 코드 미포함, 기본값 'ko'로 처리)
app.get('/post/:id', (req, res) => {
  req.params.lang = 'ko'; // 기본 언어 'ko'로 설정
  handlePostViewRoute(req, res);
});

// (Removed duplicate isPanelRequest and handlePanelRoute)
app.get('/:lang/:section/:topic', handlePanelRoute);
app.get('/:section/:topic',        handlePanelRoute);
app.get('/:lang/',                 handlePanelRoute);   // 홈도 패널 교체 원하면

app.get('/sitemap.xml', async (req, res) => {
  try {
    const testCategoryKeywords = ['테스트', 'test', 'テスト', '测试', 'noindex-category', '비공개'];
    const excludeConditions = testCategoryKeywords.map(keyword => `FIND_IN_SET(?, p.categories)`).join(' OR ');
    const [posts] = await db.query(`
      SELECT p.id, p.updated_at, p.categories
      FROM posts p
      WHERE p.is_private = 0
        AND NOT (${excludeConditions})
      ORDER BY p.updated_at DESC
    `, testCategoryKeywords);

    let postUrls = [];
    posts.forEach(post => {
      supportedLangs.forEach(lang => {
        postUrls.push(`
          <url>
            <loc>https://bugloop.dev/${lang}/post/${post.id}</loc>
            <lastmod>${format(new Date(post.updated_at), 'yyyy-MM-dd')}</lastmod>
            <priority>0.80</priority>
          </url>
        `);
      });
    });
    postUrls = postUrls.join('');

    const staticUrls = [
      ...supportedLangs.map(lang => `<url><loc>https://bugloop.dev/${lang}/</loc><priority>1.00</priority></url>`),
      ...supportedLangs.map(lang => `<url><loc>https://bugloop.dev/${lang}/signup</loc><priority>0.80</priority></url>`)
    ].join('');

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
      <urlset
        xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
        ${staticUrls}
        ${postUrls}
      </urlset>
    `;

    res.header('Content-Type', 'application/xml');
    res.send(sitemap.trim());
  } catch (err) {
    console.error('🚨 sitemap.xml 생성 오류:', err);
    res.status(500).send('Sitemap 생성 실패');
  }
});

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

app.get('/signup', (req, res) => {
  res.render('signup', {
    error: null,
    selectedCategory: null,
    isSearch: false,
    searchKeyword: '',
    locale: res.locals.locale,
    lang: res.locals.lang,
    pagination: {
      current: 1,
      total: 1,
      range: [1]
    },
    categories: []
  });
});

app.post('/login', async (req, res) => {
  const { id, password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE user_id = ?', [id]);
    if (rows.length === 0) {
      return res.redirect('/login-fail');
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.redirect('/login-fail');
    }

    req.session.user = {
      id: user.user_id,
      nickname: user.nickname,
      is_admin: user.is_admin
    };

    res.redirect(`/${req.body.lang || 'ko'}/`);
  } catch (err) {
    console.error('로그인 오류:', err);
    res.redirect('/login-fail');
  }
});

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

app.get('/signup-success', (req, res) => {
  res.render('signup-success');
});

// ✅ 글 저장 처리 라우트
app.post('/savePost', async (req, res) => {
  const { categories, is_private, is_pinned, lang_content } = req.body;
  const pinnedValue = is_pinned === 1 || is_pinned === '1' ? 1 : 0;

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
    const [result] = await db.query(
      'INSERT INTO posts (title, content, categories, author, user_id, is_private, is_pinned) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        lang_content.ko.title,
        lang_content.ko.content,
        categories.join(','),
        req.session.user.nickname,
        req.session.user.id,
        isPrivate,
        pinnedValue
      ]
    );
    const postId = result.insertId;

    for (const langCode in lang_content) {
      const { title, content } = lang_content[langCode];
      if (title || content) { // 제목이나 내용 중 하나라도 있으면 저장
        await db.query(
          'INSERT INTO post_translations (post_id, lang_code, title, content) VALUES (?, ?, ?, ?)',
          [postId, langCode, title, content]
        );
      }
    }

    res.json({ success: true, postId: postId });
  } catch (err) {
    console.error('글 저장 오류:', err);
    res.status(500).json({ success: false, error: '서버 오류로 글을 저장할 수 없습니다.' });
  }
});

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

    await db.query('DELETE FROM posts WHERE id = ?', [postId]);
    res.redirect(`/${res.locals.lang}/`);
  } catch (err) {
    console.error('삭제 오류:', err);
    res.status(500).send('서버 오류로 삭제할 수 없습니다.');
  }
});


// ✅ 글 수정 처리 라우트
app.post('/edit/:id', async (req, res) => {
  const postId = req.params.id;
  const userId = req.session.user?.id;
  const { categories, is_private, is_pinned, lang_content } = req.body;

  if (!categories || categories.length === 0) {
    return res.status(400).json({ success: false, error: '최소 하나의 카테고리를 선택해주세요.' });
  }
  if (!lang_content || !lang_content.ko || !lang_content.ko.title) {
    return res.status(400).json({ success: false, error: '한국어 제목은 필수입니다.' });
  }

  const isPrivate = is_private ? 1 : 0;
  const pinnedValue = is_pinned === 1 || is_pinned === '1' ? 1 : 0;

  try {
    const [basePostRows] = await db.query('SELECT * FROM posts WHERE id = ?', [postId]);
    if (basePostRows.length === 0) return res.status(404).json({ success: false, error: '게시글을 찾을 수 없습니다.' });

    const existingPost = basePostRows[0];
    if (existingPost.user_id !== userId && (!req.session.user || req.session.user.is_admin !== 1)) {
      return res.status(403).json({ success: false, error: '글 작성자 또는 관리자만 수정할 수 있습니다.' });
    }

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

    await db.query(
      'UPDATE posts SET title = ?, content = ?, categories = ?, is_private = ?, is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [
        lang_content.ko.title,
        lang_content.ko.content,
        categories.join(','),
        isPrivate,
        pinnedValue,
        postId
      ]
    );

    for (const langCode in lang_content) {
      const { title, content } = lang_content[langCode];
      if (title || content) { // 제목이나 내용 중 하나라도 있으면 업데이트
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
    }

    res.json({ success: true, redirect: `/${res.locals.lang}/post/${postId}` });
  } catch (err) {
    console.error('수정 처리 오류:', err);
    res.status(500).json({ success: false, error: '서버 오류로 글을 수정할 수 없습니다.' });
  }
});


app.get('/api/categories', async (req, res) => {
  const safeLang = res.locals.lang;
  const column = (safeLang === 'ko') ? 'name' : `COALESCE(name_${safeLang}, '')`;

  try {
    const [rows] = await db.query(`SELECT id, ${column} AS name FROM categories ORDER BY id ASC`);
    const names = rows.map(r => r.name);
    res.json({ categories: names });
  } catch (err) {
    console.error('카테고리 조회 오류:', err);
    res.status(500).json({ error: '카테고리 불러오기 실패' });
  }
});

app.post('/api/categories', async (req, res) => {
  const { name, name_en, name_fr, name_zh, name_ja } = req.body;

  if (!name) return res.status(400).json({ error: '기본 카테고리 이름(name)이 필요합니다.' });

  try {
    const [existing] = await db.query('SELECT * FROM categories WHERE name = ?', [name]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: '이미 존재하는 카테고리입니다.' });
    }

    await db.query(
      `INSERT INTO categories (name, name_en, name_fr, name_zh, name_ja) VALUES (?, ?, ?, ?, ?)`,
      [name, name_en || '', name_fr || '', name_zh || '', name_ja || '']
    );

    res.json({ success: true });
  } catch (err) {
    console.error('카테고리 추가 오류:', err);
    res.status(500).json({ error: '카테고리 추가 실패' });
  }
});

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

// ✅ 검색 결과 페이지 라우트
// :lang 접두사를 추가하여 URL을 명확히 처리합니다.
app.get('/:lang/search', async (req, res) => {
  const keyword = req.query.q?.trim();
  if (!keyword) return res.redirect(`/${req.params.lang}/`);

  const userId = req.session.user?.id;
  const isAdmin = req.session.user?.is_admin === 1;
  const safeLang = req.params.lang; // URL 파라미터에서 직접 언어 추출
  res.locals.lang = safeLang;

  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  try {
    const [allPosts] = await db.query(`
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
          OR p.categories LIKE ?
      ORDER BY p.is_pinned DESC, GREATEST(p.updated_at, p.created_at) DESC
    `, [safeLang, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`]);


    const filteredAll = allPosts.map(post => {
      if (post.is_private && post.user_id !== userId && !isAdmin) {
        return {
          ...post,
          content: '이 글은 비공개로 설정되어 있습니다.'
        };
      }
      return post;
    });

    const total = filteredAll.length;
    const totalPages = Math.ceil(total / limit);
    const paginationRange = generatePagination(page, totalPages);

    const { allCategories } = await getSidebarData(req);

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
      selectedCategory: null,
      user: req.session.user,
      lang: safeLang,
      locale: res.locals.locale
    });
  } catch (err) {
    console.error('검색 오류:', err);
    res.status(500).send('검색 중 오류 발생');
  }
});

// ✅ AJAX 검색 API 라우트
app.get('/api/search', async (req, res) => {
  const keyword = req.query.q?.trim();
  if (!keyword) return res.json({ posts: [] });

  const userId = req.session.user?.id;
  const isAdmin = req.session.user?.is_admin === 1;
  const safeLang = res.locals.lang;

  try {
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
          OR p.categories LIKE ?
      ORDER BY p.is_pinned DESC, GREATEST(p.updated_at, p.created_at) DESC
    `, [safeLang, `%${keyword}%`, `%${keyword}%`, `%${keyword}%`]);

    const filteredPosts = posts.map(post => {
      if (post.is_private && post.user_id !== userId && !isAdmin) {
        return {
          ...post,
          content: '이 글은 비공개로 설정되어 있습니다.'
        };
      }
      return post;
    });

    for (const post of filteredPosts) {
      const originalCategories = post.categories ? post.categories.split(',').map(c => c.trim()) : [];
      const translatedCategories = [];
      if (originalCategories.length > 0) {
        const categoryColumn = (safeLang === 'ko') ? 'name' : `name_${safeLang}`;
        const placeholders = originalCategories.map(() => '?').join(',');
        const [categoryNames] = await db.query(
          `SELECT ${categoryColumn} AS name FROM categories WHERE name IN (${placeholders})`,
          originalCategories
        );
        translatedCategories.push(...categoryNames.map(row => row.name));
      }
      post.categories = translatedCategories;
    }

    res.json({ posts: filteredPosts });
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


// ⭐ 메인 페이지 라우트 핸들러를 위한 헬퍼 함수
async function handleMainPage(req, res) {
  const category = req.query.category || 'all';
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const userId = req.session.user?.id;
  const isAdmin = req.session.user?.is_admin === 1;
  const safeLang = req.params.lang || 'ko';
  res.locals.lang = safeLang;

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

    if (category !== 'all') {
      baseQuery += ` WHERE FIND_IN_SET(?, p.categories)`;
      countQuery += ` WHERE FIND_IN_SET(?, categories)`;
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
          content: '이 글은 비공개로 설정되어 있습니다.'
        };
      }
      return post;
    });

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
      post.translated_categories_display = translatedCategories;
    }

    const [[{ count }]] = await db.query(countQuery, countParams);
    const totalPages = Math.ceil(count / limit);
    const paginationRange = generatePagination(page, totalPages);

    const categoryColumnForDisplay = (safeLang === 'ko') ? 'name' : `name_${safeLang}`;
    const [categoryRows] = await db.query(`
      SELECT
        TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p.categories, ',', numbers.n), ',', -1)) AS original_category,
        MAX(p.created_at) AS latest,
        COALESCE(c.${categoryColumnForDisplay}, c.name) AS translated_category_name
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

    let translatedSelectedCategory = null;
    if (category !== 'all') {
      const foundCategory = allCategories.find(cat => cat.original === category);
      if (foundCategory) {
        translatedSelectedCategory = foundCategory.translated;
      }
    }

    res.render('index', {
      posts: filteredPosts,
      categories: allCategories,
      isSearch: false,
      searchKeyword: '',
      currentPath: req.path,
      selectedCategory: translatedSelectedCategory,
      pagination: {
        current: page,
        total: totalPages,
        range: paginationRange
      },
      lang: safeLang
    });
  } catch (err) {
    console.error('메인 페이지 로드 오류:', err);
    res.status(500).send('메인 페이지 로드 중 오류 발생');
  }
}

// ⭐ 메인 페이지 라우트 (언어 코드 포함)
app.get('/:lang', (req, res, next) => {
  const { lang } = req.params;
  if (!supportedLangs.includes(lang)) {
    // 언어 코드가 아닌 경우, 다음 미들웨어로 전달
    return next();
  }
  handleMainPage(req, res);
});

// ⭐ 메인 페이지 라우트 (언어 코드 미포함, 기본값 'ko'로 처리)
app.get('/', (req, res) => {
  req.params.lang = 'ko'; // 기본 언어 'ko'로 설정
  handleMainPage(req, res);
});


// EJS에서 slug 변환 함수 쓰게 하기
app.locals.slug = function(label, lang) {
  lang = (lang || 'ko').toLowerCase();
  const hit = slugMap[lang]?.[label];
  if (hit) return hit;
  return String(label).toLowerCase().replace(/\s+/g, '-');
};

app.get('/_slugtest', (req, res) => {
  const { lang = 'ko', label = '' } = req.query;
  const out = app.locals.slug(label, lang);
  res.type('text').send(out);
});

// Sidebar Data를 가져오는 공통 함수로 리팩토링
async function getSidebarData(req) {
  const safeLang = req.params.lang || res.locals.lang || 'ko';
  const categoryQueryParam = req.query.category || 'all';
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  let postsBaseQuery = `
    SELECT
        p.id, p.categories, p.author, p.user_id, p.created_at, p.updated_at, p.is_private, p.is_pinned, IFNULL(p.views, 0) AS views,
        COALESCE(pt_req.title, pt_ko.title, p.title) AS title,
        COALESCE(pt_req.content, pt_ko.content, p.content) AS content
    FROM posts p
    LEFT JOIN post_translations pt_req ON p.id = pt_req.post_id AND pt_req.lang_code = ?
    LEFT JOIN post_translations pt_ko ON p.id = pt_ko.post_id AND pt_ko.lang_code = 'ko'
  `;
  let postsCountQuery = `SELECT COUNT(*) as count FROM posts`;
  const postsQueryParams = [safeLang];
  const postsCountParams = [];

  if (categoryQueryParam !== 'all') {
    postsBaseQuery += ` WHERE FIND_IN_SET(?, p.categories)`;
    postsCountQuery += ` WHERE FIND_IN_SET(?, categories)`;
    postsQueryParams.push(categoryQueryParam);
    postsCountParams.push(categoryQueryParam);
  }

  postsBaseQuery += ` ORDER BY p.is_pinned DESC, GREATEST(p.updated_at, p.created_at) DESC LIMIT ? OFFSET ?`;
  postsQueryParams.push(limit, offset);

  const [postsForSidebar] = await db.query(postsBaseQuery, postsQueryParams);

  const filteredPostsForSidebar = postsForSidebar.map(sidebarPost => {
    if (sidebarPost.is_private && sidebarPost.user_id !== req.session.user?.id && !req.session.user?.is_admin === 1) {
      return {
        ...sidebarPost,
        content: '이 글은 비공개로 설정되어 있습니다.'
      };
    }
    return sidebarPost;
  });

  for (const sidebarPost of filteredPostsForSidebar) {
    const originalSidebarCategories = sidebarPost.categories ? sidebarPost.categories.split(',').map(c => c.trim()) : [];
    const translatedSidebarCategories = [];
    if (originalSidebarCategories.length > 0) {
      const sidebarCategoryColumn = (safeLang === 'ko') ? 'name' : `name_${safeLang}`;
      const placeholders = originalSidebarCategories.map(() => '?').join(',');
      const [sidebarCategoryNames] = await db.query(
        `SELECT COALESCE(${sidebarCategoryColumn}, name) AS name FROM categories WHERE name IN (${placeholders})`,
        originalSidebarCategories
      );
      translatedSidebarCategories.push(...sidebarCategoryNames.map(row => row.name));
    }
    sidebarPost.translated_categories_display = translatedSidebarCategories;
  }

  const categoryColumn = (safeLang === 'ko') ? 'name' : `name_${safeLang}`;
  const [allCategoryRows] = await db.query(`
    SELECT
      TRIM(SUBSTRING_INDEX(SUBSTRING_INDEX(p.categories, ',', numbers.n), ',', -1)) AS original_category,
      MAX(p.created_at) AS latest,
      COALESCE(c.${categoryColumn}, c.name) AS translated_category_name
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

  const allCategories = allCategoryRows.map(row => ({
    original: row.original_category,
    translated: row.translated_category_name
  }));

  let translatedSelectedCategory = null;
  if (categoryQueryParam !== 'all') {
    const foundCategory = allCategories.find(cat => cat.original === categoryQueryParam);
    if (foundCategory) {
      translatedSelectedCategory = foundCategory.translated;
    }
  }
  const [[{ count }]] = await db.query(postsCountQuery, postsCountParams);
  const totalPages = Math.ceil(count / limit);
  const paginationRange = generatePagination(page, totalPages);

  return { postsForSidebar: filteredPostsForSidebar, allCategories, translatedSelectedCategory, paginationRange };
}

// 전체 게시글 수를 가져오는 헬퍼 함수
async function getPostCount(req) {
  const categoryQueryParam = req.query.category || 'all';
  let countQuery = `SELECT COUNT(*) as count FROM posts`;
  const countParams = [];

  if (categoryQueryParam !== 'all') {
    countQuery += ` WHERE FIND_IN_SET(?, categories)`;
    countParams.push(categoryQueryParam);
  }

  const [[{ count }]] = await db.query(countQuery, countParams);
  return count;
}


// DB 연결 확인
db.query('SELECT NOW()')
  .then(([rows]) => console.log('✅ DB 응답:', rows[0]))
  .catch(err => console.error('❌ 쿼리 에러:', err));

// 서버 실행
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});