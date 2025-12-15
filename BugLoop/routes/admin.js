const express = require('express');
const fs = require('fs');
const router = express.Router();

const LOG_FILES = [
  '/var/log/nginx/bugloop_access.log',    // 오늘
  '/var/log/nginx/bugloop_access.log.1'   // 어제
];

// 관리자 전용
function adminOnly(req, res, next) {
  if (!req.session.user || req.session.user.is_admin !== 1) {
    return res.status(403).send('Forbidden');
  }
  next();
}

// 로그 페이지
router.get('/logs/googlebot', adminOnly, (req, res) => {
  res.render('admin/googlebot-log');
});

// Googlebot 로그 API
router.get('/api/googlebot-logs', adminOnly, (req, res) => {
  let lines = [];

  // 1️⃣ 오늘 + 어제 로그 읽기
  for (const file of LOG_FILES) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      lines.push(...content.split('\n'));
    }
  }

  const logs = lines
    // 2️⃣ Googlebot UA만
    .filter(l => /Googlebot\/|Googlebot-Image|Googlebot-Mobile/.test(l))

    // 3️⃣ 파싱
    .map(l => {
      // 예:
      // bugloop.dev 211.214.102.3 - - [15/Dec/2025:10:17:19 +0000]
      // "GET /favicon.ico HTTP/1.1" 204 0 "..." "UA"
      const m = l.match(
        /^(\S+)\s+(\S+)\s+-\s+-\s+\[(.*?)\]\s+"(?:GET|POST|HEAD)\s+(\S+)[^"]*"\s+(\d+)\s+\S+\s+"[^"]*"\s+"([^"]+)"/
      );
      if (!m) return null;

      const host = m[1];
      const ip = m[2];
      const rawTime = m[3]; // 15/Dec/2025:10:17:19 +0000
      const path = m[4];
      const status = m[5];
      const ua = m[6];

      // --- 시간 파싱 ---
      const mm = rawTime.match(
        /^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s([+-]\d{4})$/
      );
      if (!mm) return null;

      const months = {
        Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5,
        Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11
      };

      const dd = +mm[1];
      const mon = months[mm[2]];
      const yyyy = +mm[3];
      const HH = +mm[4];
      const MI = +mm[5];
      const SS = +mm[6];
      const tz = mm[7]; // +0000

      const sign = tz[0] === '-' ? -1 : 1;
      const tzh = +tz.slice(1,3);
      const tzm = +tz.slice(3,5);
      const offsetMin = sign * (tzh * 60 + tzm);

      // UTC ms
      const utcMs =
        Date.UTC(yyyy, mon, dd, HH, MI, SS) - offsetMin * 60 * 1000;

      // KST (+9)
      const kstMs = utcMs + 9 * 60 * 60 * 1000;
      const kst = new Date(kstMs);

      const pad = n => String(n).padStart(2, '0');
      const timeKST =
        `${kst.getFullYear()}-${pad(kst.getMonth()+1)}-${pad(kst.getDate())} ` +
        `${pad(kst.getHours())}:${pad(kst.getMinutes())}:${pad(kst.getSeconds())} (KST)`;

      let bot = 'Googlebot';
      if (/Googlebot-Image/.test(ua)) bot = 'Googlebot Image';
      else if (/Mobile/.test(ua)) bot = 'Googlebot Mobile';

      return {
        ts: kstMs,        // ⭐ 정렬용 타임스탬프
        time: timeKST,
        host,
        ip,
        path,
        status,
        bot
      };
    })
    .filter(Boolean)

    // 4️⃣ ⭐ 시간 기준 최신순 정렬 (핵심)
    .sort((a, b) => b.ts - a.ts)

    // 5️⃣ 최신 300개만
    .slice(0, 300);

  res.json({ logs });
});

module.exports = router;
