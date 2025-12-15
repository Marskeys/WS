const express = require('express');
const router = express.Router();

// 관리자 체크 미들웨어
function adminOnly(req, res, next) {
  if (!req.session?.user || Number(req.session.user.is_admin) !== 1) {
    return res.status(403).send('Forbidden');
  }
  next();
}

// Googlebot 로그 페이지
router.get('/logs/googlebot', adminOnly, (req, res) => {
  res.render('admin/googlebot-log', {
    user: req.session.user,
    lang: req.lang || 'ko',
    title: 'Googlebot Logs'
  });
});

module.exports = router;
