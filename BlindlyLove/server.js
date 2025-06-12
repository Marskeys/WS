const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000; // 원하는 포트

// EJS 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // ejs 파일들이 있는 폴더 경로

// 정적 파일(css, js, 이미지 등) 경로 지정
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

// --- 여기부터 추가 및 수정 ---

// 모든 요청에 대해 현재 URL 경로를 res.locals.currentPath에 저장
// 이렇게 하면 모든 EJS 템플릿에서 currentPath 변수를 사용할 수 있습니다.
app.use((req, res, next) => {
  res.locals.currentPath = req.path;
  next(); // 다음 미들웨어 또는 라우터로 요청을 전달합니다.
});

// 회원가입 페이지 라우팅 (예시)
app.get('/signup', (req, res) => {
  res.render('signup', { error: null }); // signup.ejs 렌더링
});

// 로그인 페이지 라우팅 (예시)
app.get('/login', (req, res) => {
  res.render('login', { error: null }); // login.ejs 렌더링
});

// 메인 페이지 라우팅
app.get('/', (req, res) => {
  // res.locals.currentPath 덕분에 여기서 pageCss 외에 currentPath를 따로 넘길 필요가 없습니다.
  res.render('index', { pageCss: 'main' });
});

// --- 여기까지 추가 및 수정 ---

// 서버 실행
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});