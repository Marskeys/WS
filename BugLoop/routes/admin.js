const express = require('express');
const fs = require('fs');
const router = express.Router();

const LOG_PATH = '/var/log/nginx/bugloop_access.log';
const LOG_PATH_OLD = '/var/log/nginx/bugloop_access.log.1';

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
  const files = [LOG_PATH, LOG_PATH_OLD];
  let lines = [];

  for (const file of files) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      lines.push(...content.split('\n'));
    }
  }

  const logs = lines
    .filter(l => l.includes('Googlebot'))
    .slice(-300)                 // 최근 300줄
    .reverse()                   // 최신 위로
    .map(l => {
      // 기본 nginx access log 기준
      const m = l.match(
        /^(\S+) - - \[(.*?)\] ".*? (\S+) .*?" (\d+) .*?"(.*?)"$/
      );
      if (!m) return null;

      const ua = m[5];
      let bot = 'Googlebot';

      if (/Mobile/.test(ua)) bot = 'Googlebot Mobile';
      else if (/Image/.test(ua)) bot = 'Googlebot Image';

      return {
        ip: m[1],
        time: m[2],
        path: m[3],
        status: m[4],
        bot
      };
    })
    .filter(Boolean);

  res.json({ logs });
});

module.exports = router;
