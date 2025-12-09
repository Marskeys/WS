const { format } = require('date-fns');
const express = require('express');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');
const session = require('express-session');
const db = require('./config/db'); // DB 연결 설정 파일
// 📌 변경 사항: 'es' (스페인어) 추가
const supportedLangs = ['ko', 'en', 'fr', 'zh', 'ja', 'es'];
const app = express();
const PORT = process.env.PORT || 3002;
app.locals.format = format; // ✅ 2025년 11월 8일 추가
const allLocales = require('./locales/all.json');
const multer = require('multer');
const sitemapRoutes = require('./routes/sitemap');
const sitemapPagesRoutes = require('./routes/sitemap-pages');

app.use('/', sitemapRoutes);
app.use('/', sitemapPagesRoutes);

// =======================================================
// ✅ [수정] 1. 공통 유틸리티: lang 유효성 검사 및 기본값 설정
// =======================================================
function getValidLang(lang) {
  return supportedLangs.includes(lang) ? lang : 'ko';
}

// === Helper: merge locale with safe defaults (기존 유지) ===
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

// [기존 유지] www → non-www 리다이렉트
app.use((req, res, next) => {
  if (req.headers.host.startsWith('www.')) {
    return res.redirect(
      301,
      `https://${req.headers.host.replace('www.', '')}${req.url}`
    );
  }
  next();
});

// [기존 유지] 삭제된 카테고리 URL은 410 Gone 처리
app.use((req, res, next) => {
  const langPattern = /(ko|en|fr|zh|ja|es)/;
  const catPattern = /(frontend|backend|database|security|hardware|network|devops|etc)/;

  const regex = new RegExp(`^/${langPattern.source}/${catPattern.source}(/|$)`);

  if (regex.test(req.path)) {
    console.log("🚫 410 Gone 처리됨:", req.path);
    return res.status(410).send("Gone");
  }
  next();
});

// -----------------------------
// 🧨 삭제된 게시글 ID 목록 (기존 유지)
// -----------------------------
const deletedPostIds = new Set([
  1,2,3,4,5,6,7,8,9,10,
  11,12,13,14,15,16,17,18,19,20,
  21,22,23,24,25,26,
  28,29,30,
  33,
  35,36,
  38,39,40,
  54,
  58,
  71,
  77
]);

// -----------------------------
// 🧨 삭제된 게시글 410 처리 (기존 유지)
// -----------------------------
app.use((req, res, next) => {
  const match = req.path.match(/^\/(ko|en|fr|zh|ja|es)\/post\/(\d+)/);
  if (!match) return next();

  const postId = parseInt(match[2], 10);
  if (deletedPostIds.has(postId)) {
    console.log("🚫 삭제된 글 410 처리:", req.path);
    return res.status(410).render('410'); // 410.ejs 있으면 사용
  }
  next();
});

// EJS 템플릿 엔진 설정 (기존 유지)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 정적 파일 제공 설정 (기존 유지)
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/ads.txt', express.static(path.join(__dirname, 'public/ads.txt')));

// 🚀 robots.txt를 최우선 정적으로 서빙 (기존 유지)
app.use('/robots.txt', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'robots.txt'));
});

app.get('/favicon.ico', (req, res) => res.status(204).end());

// 미들웨어 설정 (기존 유지)
app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: '50mb' }));

// 세션 설정 (기존 유지)
app.use(session({
  secret: 'wowthats_amazing',
  resave: false,
  saveUninitialized: true,
}));

// =======================================================
// ✅ [수정] 2. 공통 locals 미들웨어 (Lang 보정 로직 개선)
// =======================================================
app.use((req, res, next) => {
  // Lang을 URL에서 추출, 없으면 'ko'로 자동 설정 (미들웨어 레벨에서 보장)
  const langMatch = req.path.match(/^\/(ko|en|fr|zh|ja|es)(\/|$)/);
  res.locals.lang = langMatch ? langMatch[1] : 'ko';
  req.lang = res.locals.lang;

  // 나머지 locals 설정 (기존 유지)
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

  if (allLocales[res.locals.lang] && allLocales[res.locals.lang].panel) {
    res.locals.panelData = allLocales[res.locals.lang].panel;
  } else {
    res.locals.panelData = allLocales['ko'].panel;
  }

  next();
});

// Helper functions (기존 유지)
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

function generatePagination(current, total) { /* ... 기존 유지 ... */
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

// ... getSidebarData, getPostCount, generateSummary 함수는 길어서 생략합니다. (기존 유지) ...
// (위 함수의 코드는 원본과 동일하게 유지됩니다.)

async function getSidebarData(req) {
  // ... (getSidebarData 함수의 기존 코드 유지) ...
  const safeLang = getValidLang((req.params && req.params.lang) ? req.params.lang : 'ko');
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
    if (sidebarPost.is_private && sidebarPost.user_id !== req.session.user?.id && !(req.session.user?.is_admin === 1)) {
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
      // 📌 변경 사항: categoryColumnForDisplay에서 'name_es'도 고려하도록 변경
      const sidebarCategoryColumn = (safeLang === 'ko') ? 'name' : `name_${safeLang}`;
      const placeholders = originalSidebarCategories.map(() => '?').join(',');
      const [sidebarCategoryNames] = await db.query(
        `SELECT COALESCE(c.${sidebarCategoryColumn}, c.name) AS name FROM categories c WHERE c.name IN (${placeholders})`,
        originalSidebarCategories
      );
      translatedSidebarCategories.push(...sidebarCategoryNames.map(row => row.name));
    }
    sidebarPost.translated_categories_display = translatedSidebarCategories;
  }

  // 📌 변경 사항: categoryColumnForDisplay에서 'name_es'도 고려하도록 변경
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

async function getPostCount(req) {
  // ... (getPostCount 함수의 기존 코드 유지) ...
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


// 라우트 핸들러 (lang 처리 로직만 getValidLang으로 보강, 함수 내용은 기존 유지)
const handlePanelRoute = async (req, res, next) => {
  try {
    const safeLang = getValidLang(req.params.lang); // ⭐ lang 보정
    const { section, topic } = req.params;
    res.locals.lang = safeLang; // ⭐ locals 업데이트

    // 검색 전용 처리 (기존 유지)
    if (section === 'search') {
      const qs = req._parsedUrl && req._parsedUrl.search ? req._parsedUrl.search : '';
      return res.redirect(`/${safeLang}/search${qs || ''}`);
    }

    // write/edit/post/:id는 패널 라우팅 제외 (기존 유지)
    if (section === 'write' || section === 'edit' || (section === 'post' && /^\d+$/.test(topic))) {
      return next();
    }

    // ⭐⭐⭐ 추가: 패널 콘텐츠 파일 존재 여부 체크 ⭐⭐⭐
    const filePathForCheck = path.join(
      __dirname,
      'content',
      String(safeLang).toLowerCase(), // ⭐ safeLang 사용
      String(section).toLowerCase(),
      `${String(topic).toLowerCase()}.html`
    );

    if (!fs.existsSync(filePathForCheck)) {
      console.warn("⚠️ 패널 파일 없음:", filePathForCheck);
      return res.status(404).render('404');
    }
    // ⭐⭐⭐ 추가 끝 ⭐⭐⭐

    const { postsForSidebar, allCategories, translatedSelectedCategory, paginationRange } = await getSidebarData(req);

    const panelData = buildPanel({ lang: safeLang, section, topic }); // ⭐ safeLang 사용

    res.locals.panelData = panelData;
    res.locals.posts = postsForSidebar;
    res.locals.categories = allCategories;
    res.locals.selectedCategory = translatedSelectedCategory;
    res.locals.pagination = { current: 1, total: 1, range: [1] };
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
};


const handleWriteRoute = async (req, res) => {
  const safeLang = getValidLang(req.params.lang); // ⭐ lang 보정
  res.locals.lang = safeLang;
  // ... (handleWriteRoute 함수의 나머지 기존 코드 유지) ...
  if (!req.session.user || req.session.user.is_admin !== 1) {
    return res.status(403).send('접근 권한이 없습니다. 관리자만 글을 작성할 수 있습니다.');
  }

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
  const safeLang = getValidLang(req.params.lang); // ⭐ lang 보정
  res.locals.lang = safeLang;
  // ... (handleEditRoute 함수의 나머지 기존 코드 유지) ...
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

function generateSummary(html) { /* ... 기존 유지 ... */
  let text = String(html || '');

  // (1) auto-toc 전체 제거
  text = text.replace(/<div[^>]*class="auto-toc"[^>]*>[\s\S]*?<\/div>/gi, '');

  // (2) toc / 목차 텍스트 블록 제거
  text = text.replace(/📑\s*목차[\s\S]*?(?=<h1|<p|$)/gi, '');
  text = text.replace(/목차[\s\S]*?(?=<h1|<p|$)/gi, '');

  // (3) 번호만 있는 목차 패턴 제거 (예: "1.", "2.")
  text = text.replace(/^\s*\d+\.\s*$/gm, '');

  // (4) style/script 제거
  text = text.replace(/<style[\s\S]*?<\/style>/gi, '');
  text = text.replace(/<script[\s\S]*?<\/script>/gi, '');

  // (5) 모든 HTML 태그 제거
  text = text.replace(/<[^>]+>/g, ' ');

  // (6) 공백 정리
  text = text.replace(/\s+/g, ' ').trim();

  // (7) 길이 제한
  return text.slice(0, 150);
}


const handlePostViewRoute = async (req, res) => {
  const safeLang = getValidLang(req.params.lang); // ⭐ lang 보정
  res.locals.lang = safeLang;
  // ... (handlePostViewRoute 함수의 나머지 기존 코드 유지) ...
  try {
    const postId = req.params.id;

    // 조회수 처리
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

    // 비공개 글 접근 제한
    if (post.is_private && !isAuthor && !isAdmin) {
      return res.status(403).render('403', { message: '비공개 글입니다.', user: req.session.user });
    }

    // 조회수 증가
    if (!req.session.viewedPosts.includes(postId)) {
      await db.query('UPDATE posts SET views = views + 1 WHERE id = ?', [postId]);
      req.session.viewedPosts.push(postId);
    }

    // 번역 가져오기
    let [translations] = await db.query(
      'SELECT title, content FROM post_translations WHERE post_id = ? AND lang_code = ?',
      [postId, safeLang]
    );

    let translation = translations[0];

    // 해당 언어 번역 없으면 한국어 fallback
    if (!translation && safeLang !== 'ko') {
      console.warn(`게시글 ID ${postId}에 '${safeLang}' 번역 없음 → ko로 fallback`);
      [translations] = await db.query(
        'SELECT title, content FROM post_translations WHERE post_id = ? AND lang_code = "ko"',
        [postId]
      );
      translation = translations[0];
    }

    // 최종 fallback
    if (!translation) {
      translation = {
        title: post.title,
        content: post.content
      };
    }

    // 카테고리 번역 처리
    const originalCategories = post.categories ? post.categories.split(',').map(c => c.trim()) : [];
    const translatedCategories = [];

    if (originalCategories.length > 0) {
      const categoryColumnForDisplay = (safeLang === 'ko') 
        ? 'name' 
        : `name_${safeLang}`;

      const placeholders = originalCategories.map(() => '?').join(',');
      const [categoryNameRows] = await db.query(
        `SELECT COALESCE(${categoryColumnForDisplay}, name) AS name FROM categories WHERE name IN (${placeholders})`,
        originalCategories
      );

      translatedCategories.push(...categoryNameRows.map(row => row.name));
    }

    // summary 생성
    const summary = generateSummary(translation.content);

    // postView 객체
    const postForView = {
      ...post,
      title: translation.title,
      content: translation.content,
      categories: translatedCategories,
      originalCategories: originalCategories
    };

    // canonical + alternate
    const canonicalUrl = `${req.protocol}://${req.get('host')}/${safeLang}/post/${postId}`;
    const alternateLinks = supportedLangs.map(lang => ({
      lang,
      href: `${req.protocol}://${req.get('host')}/${lang}/post/${postId}`
    }));

    // 사이드바 데이터
    const { postsForSidebar, allCategories, translatedSelectedCategory, paginationRange } =
      await getSidebarData(req);

    // ⭐ 추천글용 safeCategory 처리
    let safeCategory = null;
    if (
      postForView.originalCategories &&
      postForView.originalCategories.length > 0 &&
      postForView.originalCategories[0]
    ) {
      safeCategory = postForView.originalCategories[0];
    }

    let recommended = [];

    // ⭐ 카테고리가 있을 때만 추천글 쿼리 실행
    if (safeCategory) {
      const [recommendedRows] = await db.query(
        `
        SELECT 
          p.id,
          COALESCE(pt.title, p.title) AS title
        FROM posts p
        LEFT JOIN post_translations pt 
            ON p.id = pt.post_id AND pt.lang_code = ?
        WHERE p.id != ?
          AND FIND_IN_SET(?, p.categories)
          AND p.is_private = 0
        ORDER BY RAND()
        LIMIT 5
        `,
        [safeLang, postId, safeCategory]
      );

      recommended = recommendedRows.map(r => ({
        id: r.id,
        title: r.title
      }));
    }

    // ⭐ 렌더링
    res.render('post-view', {
      post: postForView,
      posts: postsForSidebar,
      user: req.session.user,

      canonicalUrl,
      alternateLinks,
      summary,

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
      },

      recommended
    });

  } catch (err) {
    console.error("🌐 다국어 글 보기 오류:", err);

    const errorView = path.join(__dirname, 'views', 'error.ejs');

    if (fs.existsSync(errorView)) {
      return res.status(500).render('error', { 
        message: '서버 오류로 글을 불러올 수 없습니다.', 
        user: req.session.user 
      });
    }

    return res.status(500).send(err.message);
  }
};



const handleMainPage = async (req, res) => {
  const category = req.query.category || 'all';
  const page = parseInt(req.query.page) || 1;
  const limit = 10;
  const offset = (page - 1) * limit;

  const userId = req.session.user?.id;
  const isAdmin = req.session.user?.is_admin === 1;
  const safeLang = getValidLang(req.params.lang); // ⭐ lang 보정
  res.locals.lang = safeLang;

  // ... (handleMainPage 함수의 나머지 기존 코드 유지) ...
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
        // 📌 변경 사항: categoryColumnForDisplay에서 'name_es'도 고려하도록 변경
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

    // 📌 변경 사항: categoryColumnForDisplay에서 'name_es'도 고려하도록 변경
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

    const wantsPanelOnly = (req.query.panel === '1' || String(req.query.panel).toLowerCase() === 'true');
    const viewData = {
      posts: filteredPosts,
      categories: allCategories,
      isSearch: false,
      searchKeyword: '',
      currentPath: req.path,
      selectedCategory: category,
      selectedCategoryLabel: translatedSelectedCategory,
      pagination: {
        current: page,
        total: totalPages,
        range: paginationRange
      },
      lang: safeLang
    };
    if (wantsPanelOnly) {
      return res.render('partials/table', viewData);
    }
    return res.render('index', viewData);
  } catch (err) {
    console.error('메인 페이지 로드 오류:', err);
    res.status(500).send('메인 페이지 로드 중 오류 발생');
  }
}

const handleSearchRoute = async (req, res) => {
  const keyword = req.query.q?.trim();
  if (!keyword) return res.redirect(`/${req.params.lang}/`);

  const userId = req.session.user?.id;
  const isAdmin = req.session.user?.is_admin === 1;
  const safeLang = getValidLang(req.params.lang); // ⭐ lang 보정
  res.locals.lang = safeLang;

  // ... (handleSearchRoute 함수의 나머지 기존 코드 유지) ...
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
        // 📌 변경 사항: categoryColumnForDisplay에서 'name_es'도 고려하도록 변경
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

    const wantsPanelOnly = (req.query.panel === '1' || String(req.query.panel).toLowerCase() === 'true');
    const viewData = {
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
    };
    if (wantsPanelOnly) {
      return res.render('partials/table', viewData);
    }
    return res.render('index', viewData);
  } catch (err) {
    console.error('검색 오류:', err);
    res.status(500).send('검색 중 오류 발생');
  }
};

// =======================================================
// ✅ [수정] 3. 라우트 정의 (라우트 우선순위 및 패턴 충돌 제거)
// =======================================================

// -------------------------------------------------------
// 3-1. 인증 및 API 라우트 (순서 변경 없음, 기존 유지)
// -------------------------------------------------------

app.post('/login', async (req, res) => { /* ... 기존 유지 ... */
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

app.post('/signup', async (req, res) => { /* ... 기존 유지 ... */
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

// ✅ 글 저장 처리 라우트 (트랜잭션 적용) (기존 유지)
app.post('/savePost', async (req, res) => { /* ... 기존 유지 ... */
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { categories, is_private, is_pinned, lang_content } = req.body;
    const pinnedValue = is_pinned === 1 || is_pinned === '1' ? 1 : 0;

    if (!req.session.user || req.session.user.is_admin !== 1) {
      await conn.rollback();
      return res.status(403).json({ success: false, error: '관리자만 글을 작성할 수 있습니다.' });
    }
    if (!categories || categories.length === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: '최소 하나의 카테고리를 선택해주세요.' });
    }
    if (!lang_content || !lang_content.ko || (!lang_content.ko.title && !lang_content.ko.content)) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: '한국어 제목 또는 내용은 필수입니다.' });
    }

    const isPrivate = is_private ? 1 : 0;

    const [result] = await conn.query(
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
      if (title || content) {
        await conn.query(
          'INSERT INTO post_translations (post_id, lang_code, title, content) VALUES (?, ?, ?, ?)',
          [postId, langCode, title, content]
        );
      }
    }

    await conn.commit();
    res.json({ success: true, postId: postId });

  } catch (err) {
    await conn.rollback();
    console.error('글 저장 오류:', err);
    res.status(500).json({ success: false, error: '서버 오류로 글을 저장할 수 없습니다.' });
  } finally {
    if (conn) conn.release();
  }
});

app.post('/edit/:id', async (req, res) => { /* ... 기존 유지 ... */
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const postId = req.params.id;
    const userId = req.session.user?.id;
    const { categories, is_private, is_pinned, lang_content } = req.body;

    if (!req.session.user) {
      await conn.rollback();
      return res.status(401).json({ success: false, error: '로그인이 필요합니다.' });
    }
    if (!categories || categories.length === 0) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: '최소 하나의 카테고리를 선택해주세요.' });
    }
    if (!lang_content || !lang_content.ko || !lang_content.ko.title) {
      await conn.rollback();
      return res.status(400).json({ success: false, error: '한국어 제목은 필수입니다.' });
    }

    const isPrivate = is_private ? 1 : 0;
    const pinnedValue = is_pinned === 1 || is_pinned === '1' ? 1 : 0;

    const [basePostRows] = await conn.query('SELECT * FROM posts WHERE id = ?', [postId]);
    if (basePostRows.length === 0) {
      await conn.rollback();
      return res.status(404).json({ success: false, error: '게시글을 찾을 수 없습니다.' });
    }

    const existingPost = basePostRows[0];
    if (existingPost.user_id !== userId && (!req.session.user || req.session.user.is_admin !== 1)) {
      await conn.rollback();
      return res.status(403).json({ success: false, error: '글 작성자 또는 관리자만 수정할 수 있습니다.' });
    }

    await conn.query(`
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

    await conn.query(
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
      if (title || content) {
        await conn.query(
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

    await conn.commit();
    res.json({ success: true, redirect: `/${res.locals.lang}/post/${postId}` });

  } catch (err) {
    await conn.rollback();
    console.error('수정 처리 오류:', err);
    res.status(500).json({ success: false, error: '서버 오류로 글을 수정할 수 없습니다.' });
  } finally {
    if (conn) conn.release();
  }
});

app.post('/delete/:id', async (req, res) => { /* ... 기존 유지 ... */
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

app.get('/api/categories', async (req, res) => { /* ... 기존 유지 ... */
  const safeLang = res.locals.lang;
  // 📌 변경 사항: DB 쿼리에 name_es 필드를 추가하여 스페인어 카테고리 이름 조회 지원
  const column = (safeLang === 'ko') ? 'name' : (safeLang === 'es' ? `COALESCE(name_es, '')` : `COALESCE(name_${safeLang}, '')`);

  try {
    const [rows] = await db.query(`SELECT id, ${column} AS name FROM categories ORDER BY id ASC`);
    const names = rows.map(r => r.name);
    res.json({ categories: names });
  } catch (err) {
    console.error('카테고리 조회 오류:', err);
    res.status(500).json({ error: '카테고리 불러오기 실패' });
  }
});

app.post('/api/categories', async (req, res) => { /* ... 기존 유지 ... */
  // 📌 변경 사항: name_es 필드 추가
  const { name, name_en, name_fr, name_zh, name_ja, name_es } = req.body;

  if (!name) return res.status(400).json({ error: '기본 카테고리 이름(name)이 필요합니다.' });

  try {
    const [existing] = await db.query('SELECT * FROM categories WHERE name = ?', [name]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: '이미 존재하는 카테고리입니다.' });
    }

    // 📌 변경 사항: DB INSERT 쿼리에 name_es 필드 추가
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

app.delete('/api/categories/:name', async (req, res) => { /* ... 기존 유지 ... */
  const { name } = req.params;
  try {
    await db.query('DELETE FROM categories WHERE name = ?', [decodeURIComponent(name)]);
    res.json({ success: true });
  } catch (err) {
    console.error('카테고리 삭제 오류:', err);
    res.status(500).json({ error: '카테고리 삭제 실패' });
  }
});

app.get('/api/check-id', async (req, res) => { /* ... 기존 유지 ... */
  const { id } = req.query;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE user_id = ?', [id]);
    res.json({ exists: rows.length > 0 });
  } catch (err) {
    console.error('아이디 중복 확인 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

app.get('/api/check-nickname', async (req, res) => { /* ... 기존 유지 ... */
  const { nickname } = req.query;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE nickname = ?', [nickname]);
    res.json({ exists: rows.length > 0 });
  } catch (err) {
    console.error('닉네임 중복 확인 오류:', err);
    res.status(500).json({ error: '서버 오류' });
  }
});

// 기타 라우트 (API 라우트 뒤에 배치) (기존 유지)
app.get('/:lang/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect(`/${req.params.lang}/`);
  });
});
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect(`/ko/`);
  });
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
app.get('/signup-success', (req, res) => {
  res.render('signup-success');
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

// =======================================================
// 3-2. Books 라우트 (최상단에 배치하여 충돌 방지)
// =======================================================

// ✅ Book 챕터 페이지
app.get('/:lang/books/:book/contents/:chapter', (req, res) => {
  const safeLang = getValidLang(req.params.lang);
  const { book, chapter } = req.params;
  res.locals.lang = safeLang;

  const viewPath = `content/${safeLang}/books/${book}/contents/${chapter}`;

  console.log("📌 Book View Path Check:", viewPath);

  res.render(viewPath, { lang: safeLang, locale: res.locals.locale }, (err, html) => {
    if (err) {
      console.error("❌ EJS Render Error:", err);
      return res.status(404).send("해당 챕터 또는 페이지를 찾을 수 없습니다.");
    }
    res.send(html);
  });
});

// -------------------------------------------------------
// 3-3. Post, Write, Edit, Search 라우트
// -------------------------------------------------------

// ✅ 글쓰기 라우트
app.get('/:lang/write', handleWriteRoute);

// ✅ 수정 라우트
app.get('/:lang/edit/:id', handleEditRoute);

// ✅ 상세 라우트
app.get('/:lang/post/:id', handlePostViewRoute);

// ✅ 검색 라우트
app.get('/:lang/search', handleSearchRoute);


// -------------------------------------------------------
// 3-4. Lang이 누락된 요청 처리 (Lang이 없는 경로를 강제 보정)
// -------------------------------------------------------

// 🚨 `/write`, `/edit/123`, `/post/123`, `/search?q=...` 요청 처리 (Lang 누락 방지)
app.get('/write', (req, res) => res.redirect(302, `/ko/write`));
app.get('/edit/:id', (req, res) => res.redirect(302, `/ko/edit/${req.params.id}`));
app.get('/post/:id', (req, res) => res.redirect(302, `/ko/post/${req.params.id}`));
app.get('/search', (req, res) => {
  const qs = req._parsedUrl && req._parsedUrl.search ? req._parsedUrl.search : '';
  res.redirect(302, `/ko/search${qs || ''}`);
});


// -------------------------------------------------------
// 3-5. Panel 라우트 (Lang 필수)
// -------------------------------------------------------

// ✅ 패널 라우팅 (와일드카드이지만 Lang을 필수로 잡음)
app.get('/:lang/:section/:topic', handlePanelRoute);

// 🚨 [제거됨] 기존의 Lang 없는 와일드카드 라우트: app.get('/:section/:topic', handlePanelRoute); 
// 이 라우트가 충돌의 근본 원인이므로 완전히 제거되었습니다.

// -------------------------------------------------------
// 3-6. Main Page 및 Lang 보정 라우트 (가장 일반적인 라우트)
// -------------------------------------------------------

// ✅ 루트 접근 시 /ko/ 로 이동 (SEO 최적화)
app.get('/', (req, res) => res.redirect(302, '/ko/'));

// ✅ 언어 코드만 있는 요청 (/ko, /en)은 /ko/ 로 슬래시 보정
app.get('/:lang', (req, res) => {
  if (supportedLangs.includes(req.params.lang)) {
    return res.redirect(302, `/${req.params.lang}/`);
  }
  return res.status(404).render("404");
});

// ✅ 메인 페이지 (슬래시 보정 후 도착)
app.get('/:lang/', handleMainPage);

// -------------------------------------------------------
// 3-7. 나머지 정적/와일드카드 라우트 (기존 유지)
// -------------------------------------------------------

// ✅ EJS에서 slug 변환 함수 쓰게 하기 (기존 유지)
app.locals.slug = function(label, lang) {
  lang = (lang || 'ko').toLowerCase();
  const hit = slugMap[lang]?.[label];
  if (hit) return hit;
  return String(label).toLowerCase().replace(/\s+/g, '-');
};

app.get('/_slugtest', (req, res) => { /* ... 기존 유지 ... */
  const { lang = 'ko', label = '' } = req.query;
  const out = app.locals.slug(label, lang);
  res.type('text').send(out);
});

// ✅ 언어 + 폴더 + 폴더 + 페이지 구조만 잡음 (기존 유지)
app.get('/:lang/:section/:subsection/:page', (req, res) => {
  const { lang, section, subsection, page } = req.params;
  const filePath = path.join(__dirname, 'content', lang, section, subsection, `${page}.html`);

  if (!fs.existsSync(filePath)) {
    const notFoundPath = path.join(__dirname, 'views', '404.html');
    if (fs.existsSync(notFoundPath)) {
      return res.sendFile(notFoundPath);
    }
    return res.status(404).send('404 Not Found');
  }

  // ✅ HTML 파일을 그대로 응답 (렌더링 X)
  res.sendFile(filePath);
});


// 업로드 위치 + 파일명 설정 (기존 유지)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, 'public', 'uploads'));
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, unique + ext);
  }
});
const upload = multer({ storage });

// public/uploads 정적 경로로 서빙 (기존 유지)
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// 업로드 라우트 추가 (기존 유지)
app.post('/upload/image', upload.single('image'), (req, res) => {
  if (!req.file) return res.json({ success: false });
  return res.json({
    success: true,
    url: `/uploads/${req.file.filename}`
  });
});

app.post('/upload/video', upload.single('video'), (req, res) => {
  if (!req.file) {
    return res.json({ success: false, error: 'No video file uploaded.' });
  }
  const videoUrl = '/uploads/' + req.file.filename; 
  return res.json({ success: true, url: videoUrl });
});

// =======================================================
// ✅ [수정] 4. 404 처리 (모든 라우트 실패 시)
// =======================================================
app.use((req, res) => {
  // lang을 미들웨어에서 보장했으므로 안전함
  const lang = res.locals.lang || 'ko';
  return res.status(404).render('404', { lang });
});


// DB 연결 확인 (기존 유지)
db.query('SELECT NOW()')
  .then(([rows]) => console.log('✅ DB 응답:', rows[0]))
  .catch(err => console.error('❌ 쿼리 에러:', err));

// 서버 실행 (기존 유지)
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중: http://localhost:${PORT}`);
});

module.exports = app;