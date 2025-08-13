// routes/learn.js
const fs = require('fs');

const SUPPORTED_LANGS = ['ko', 'en', 'fr', 'zh', 'ja'];

// 언어별 강의 로더 (en 폴백) — path 모듈 없이 안전 경로
function loadLectures(lang) {
  const lc = SUPPORTED_LANGS.includes(lang) ? lang : 'en';
  const base = process.cwd() + '/data/i18n/'; // 프로젝트 루트 기준
  try {
    return JSON.parse(fs.readFileSync(base + `lectures.${lc}.json`, 'utf8'));
  } catch (e) {
    if (lc !== 'en') {
      try { return JSON.parse(fs.readFileSync(base + 'lectures.en.json', 'utf8')); }
      catch (_) {}
    }
    return {};
  }
}

module.exports = function attachLearn(app) {
  // 모든 요청에 기본값(있어도 덮어쓰지 않음)
  app.use((req, res, next) => {
    const p = req.params || {};
    if (typeof res.locals.lang === 'undefined') {
      res.locals.lang = p.lang || p.safelang || 'ko';
    }
    if (typeof res.locals.lecture === 'undefined') res.locals.lecture = null;
    if (typeof res.locals.lectureKey === 'undefined') res.locals.lectureKey = null;
    next();
  });

  // 학습 페이지 (패널 표시: SSR)
  app.get('/:lang/learn/:key', (req, res) => {
    const { lang, key } = req.params;
    const L = loadLectures(lang);
    const lecture = L[key] || null; // 키 없으면 패널 숨김
    res.render('index', { lang, lecture, lectureKey: key });
  });

  // 홈(패널 숨김) — 서버에 이미 같은 라우트가 있으면 이 블록은 건너뛰어도 OK
  app.get('/:lang/', (req, res) => {
    const { lang } = req.params;
    res.render('index', { lang, lecture: null, lectureKey: null });
  });

  // 루트 진입 → 기본언어 — 서버에 이미 있다면 생략해도 됨
  app.get('/', (req, res) => res.redirect('/ko/'));
};
