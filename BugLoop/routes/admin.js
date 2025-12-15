const express = require('express');
const fs = require('fs');
const router = express.Router();

const LOG_FILES = [
  '/var/log/nginx/bugloop_access.log',
  '/var/log/nginx/bugloop_access.log.1'
];

// 관리자 전용 미들웨어
function adminOnly(req, res, next) {
  if (!req.session.user || req.session.user.is_admin !== 1) {
    return res.status(403).send('Forbidden');
  }
  next();
}

// 관리자 페이지
router.get('/logs/googlebot', adminOnly, (req, res) => {
  res.render('admin/googlebot-log');
});

// Googlebot 로그 API
router.get('/api/googlebot-logs', adminOnly, (req, res) => {
  let lines = [];

  // 1️⃣ 오늘 파일 + 어제 파일 읽기
  for (const file of LOG_FILES) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      lines.push(...content.split('\n'));
    }
  }

  // 2️⃣ 진짜 Googlebot UA만 필터
  const logs = lines
    .filter(l =>
      /Googlebot\/|Googlebot-Image|Googlebot-Mobile/.test(l)
    )
    .slice(-300)     // 최근 300줄만
    .reverse()       // 최신이 위로
.map(l => {
  const m = l.match(
    /^(\S+)\s+(\S+)\s+-\s+-\s+\[(.*?)\]\s+"(?:GET|POST|HEAD)\s+(\S+)[^"]*"\s+(\d+)\s+\S+\s+"[^"]*"\s+"([^"]+)"/
  );

  if (!m) return null;

  const ip = m[2];
  const rawTime = m[3]; // 15/Dec/2025:02:31:12 +0000
  const path = m[4];
  const status = m[5];
  const ua = m[6];

  // ✅ 시간 파싱 → KST 변환
  const date = new Date(
    rawTime.replace(
      /^(\d{2})\/(\w{3})\/(\d{4}):/,
      '$3-$2-$1T'
    ).replace(' ', '')
  );

  // UTC → KST (+9시간)
  date.setHours(date.getHours() + 9);

  const timeKST = date.toISOString()
    .replace('T', ' ')
    .replace('Z', ' (KST)')
    .slice(0, 22);

  let bot = 'Googlebot';
  if (/Googlebot-Image/.test(ua)) bot = 'Googlebot Image';
  else if (/Mobile/.test(ua)) bot = 'Googlebot Mobile';

  return {
    time: timeKST,
    ip,
    path,
    status,
    bot
  };
})

    .filter(Boolean);

  res.json({ logs });
});

module.exports = router;
