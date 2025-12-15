const express = require('express');
const fs = require('fs');
const router = express.Router();

const LOG_FILES = [
  '/var/log/nginx/bugloop_access.log',
  '/var/log/nginx/bugloop_access.log.1'
];

function adminOnly(req, res, next) {
  if (!req.session.user || req.session.user.is_admin !== 1) {
    return res.status(403).send('Forbidden');
  }
  next();
}

router.get('/logs/googlebot', adminOnly, (req, res) => {
  res.render('admin/googlebot-log');
});

router.get('/api/googlebot-logs', adminOnly, (req, res) => {
  let lines = [];

  for (const file of LOG_FILES) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      lines.push(...content.split('\n'));
    }
  }

  const logs = lines
    .filter(l => /Googlebot\/|Googlebot-Image|Googlebot-Mobile/.test(l))
    .slice(-300)
    .reverse()
    .map(l => {
      // ✅ host + ip 둘 다 있는 포맷 대응
      // 예: bugloop.dev 211.214.102.3 - - [15/Dec/2025:10:17:19 +0000] "GET /favicon.ico HTTP/1.1" 204 0 "..." "UA"
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

      // ✅ 시간 KST 변환 (nginx 시간이 +0000 이니까 +9)
      // rawTime: 15/Dec/2025:10:17:19 +0000
      const mm = rawTime.match(/^(\d{2})\/(\w{3})\/(\d{4}):(\d{2}):(\d{2}):(\d{2})\s([+-]\d{4})$/);
      if (!mm) return null;

      const months = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
      const dd = parseInt(mm[1], 10);
      const mon = months[mm[2]];
      const yyyy = parseInt(mm[3], 10);
      const HH = parseInt(mm[4], 10);
      const MI = parseInt(mm[5], 10);
      const SS = parseInt(mm[6], 10);
      const tz = mm[7]; // +0000

      // tz가 +0000만 온다고 가정(네 로그 그대로). 그래도 안전하게 처리:
      const sign = tz[0] === '-' ? -1 : 1;
      const tzh = parseInt(tz.slice(1,3), 10);
      const tzm = parseInt(tz.slice(3,5), 10);
      const offsetMin = sign * (tzh * 60 + tzm);

      // 로그 시간을 UTC로 만들고 -> KST(+9)로 변환
      const utcMs = Date.UTC(yyyy, mon, dd, HH, MI, SS) - offsetMin * 60 * 1000;
      const kst = new Date(utcMs + 9 * 60 * 60 * 1000);

      const pad = n => String(n).padStart(2, '0');
      const timeKST =
        `${kst.getFullYear()}-${pad(kst.getMonth()+1)}-${pad(kst.getDate())} ` +
        `${pad(kst.getHours())}:${pad(kst.getMinutes())}:${pad(kst.getSeconds())} (KST)`;

      let bot = 'Googlebot';
      if (/Googlebot-Image/.test(ua)) bot = 'Googlebot Image';
      else if (/Mobile/.test(ua)) bot = 'Googlebot Mobile';

      return { time: timeKST, host, ip, path, status, bot };
    })
    .filter(Boolean);

  res.json({ logs });
});

module.exports = router;
