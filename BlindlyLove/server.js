const express = require('express');
const path = require('path');

const app = express();
const PORT = 3000; // 원하는 포트

// EJS 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // ejs 파일들이 있는 폴더 경로

// 정적 파일(css, js, 이미지 등) 경로 지정
app.use('/assets', express.static(path.join(__dirname, 'public/assets')));

// 메인 페이지 라우팅
app.get('/', (req, res) => {
  res.render('index', { pageCss: 'main' }); // index.ejs를 렌더링
});

// 서버 실행
app.listen(PORT, () => {
  console.log(`서버 실행 중: http://localhost:${PORT}`);
});
