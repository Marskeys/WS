const express = require('express');
const fs = require('fs');
const router = express.Router();

const LOG_FILES = [
  '/var/log/nginx/bugloop_access.log',
  '/var/log/nginx/bugloop_access.log.1'
];

// ==========================
// 관리자 전용 미들웨어
// ==========================
function adminOnly(req, res, next) {
  if (!req.session.user || req.session.user.is_admin !== 1) {
    return res.status(403).send('Forbidden');
  }
  next();
}

// ==========================
// 관리자 페이지
// ==========================
router.get('/logs/googlebot', adminOnly, (req, res) => {
  res.render('admin/googlebot-log');
});

// ==========================
// Googlebot 로그 API
// ==========================
router.get('/api/googlebot-logs', adminOnly, (req, res) => {
  try {
    let lines = [];

    // 1️⃣ 오늘 + 어제 로그 파일 읽기
    for (const file of LOG_FILES) {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        lines.push(...content.split('\n'));
      }
    }

    // 2️⃣ Googlebot 필터링
    const logs = lines
      .filter(l =>
        /Googlebot/.test(l)
      )
      .slice(-300)   // 최근 300줄
      .reverse()     // 최신이 위로
      .map(l => {
        // Nginx access log 기본 패턴
        const m = l.match(
          /^(\S+)\s+(\S+)\s+-\s+-\s+\[(.*?)\]\s+"(?:GET|POST|HEAD)\s+(\S+)[^"]*"\s+(\d+)\s+\S+\s+"[^"]*"\s+"([^"]+)"/
        );

        if (!m) return null;

        const ip = m[2];
        const rawTime = m[3]; // 15/Dec/2025:02:31:12 +0000
        const path = m[4];
        const status = m[5];
        const ua = m[6];

        // ==========================
        // ⏰ 시간 → KST 변환 (안전)
        // ==========================
        // rawTime 예: 15/Dec/2025:02:31:12 +0000
        const timeMatch = rawTime.match(
          /(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})/
        );

        if (!timeMatch) return null;

        const [, dd, mon, yyyy, hh, mm, ss] = timeMatch;

        const monthMap = {
          Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
          Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
        };

        const utcDate = new Date(Date.UTC(
          Number(yyyy),
          monthMap[mon],
          Number(dd),
          Number(hh),
          Number(mm),
          Number(ss)
        ));

        // KST = UTC + 9
        utcDate.setHours(utcDate.getHours() + 9);

        const timeKST =
          utcDate.getFullYear() + '-' +
          String(utcDate.getMonth() + 1).padStart(2, '0') + '-' +
          String(utcDate.getDate()).padStart(2, '0') + ' ' +
          String(utcDate.getHours()).padStart(2, '0') + ':' +
          String(utcDate.getMinutes()).padStart(2, '0') + ':' +
          String(utcDate.getSeconds()).padStart(2, '0') +
          ' (KST)';

        // ==========================
        // Bot 타입 판별
        // ==========================
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

  } catch (err) {
    console.error('❌ Googlebot log API error:', err);
    res.status(500).json({ error: 'Failed to load logs' });
  }
});

module.exports = router;
