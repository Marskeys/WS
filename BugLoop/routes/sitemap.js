const express = require('express');
const router = express.Router();
const db = require('../config/db'); // 🔥 config 폴더에 있으므로 이게 정답!

// 🔹 sitemap.xml (메인 인덱스)
router.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://bugloop.dev/sitemap-pages.xml</loc></sitemap>
  <sitemap><loc>https://bugloop.dev/sitemap-posts-ko.xml</loc></sitemap>
  <sitemap><loc>https://bugloop.dev/sitemap-posts-en.xml</loc></sitemap>
  <sitemap><loc>https://bugloop.dev/sitemap-posts-fr.xml</loc></sitemap>
  <sitemap><loc>https://bugloop.dev/sitemap-posts-zh.xml</loc></sitemap>
  <sitemap><loc>https://bugloop.dev/sitemap-posts-ja.xml</loc></sitemap>
  <sitemap><loc>https://bugloop.dev/sitemap-posts-es.xml</loc></sitemap>
</sitemapindex>`);
});

// 🔹 각 언어별 게시글 Sitemap 생성 함수
async function generatePostSitemap(lang) {
  const [posts] = await db.query(`
    SELECT id, updated_at
    FROM posts
    WHERE is_private = 0
    ORDER BY updated_at DESC
  `);

  const xmlItems = posts.map(p => `
    <url>
      <loc>https://bugloop.dev/${lang}/post/${p.id}</loc>
      <lastmod>${p.updated_at.toISOString().slice(0, 10)}</lastmod>
      <changefreq>weekly</changefreq>
      <priority>0.8</priority>
    </url>
  `).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlItems}
</urlset>`;
}

// 🔹 언어별 sitemap 라우트 등록
const langs = ['ko', 'en', 'fr', 'zh', 'ja', 'es'];

langs.forEach(lang => {
  router.get(`/sitemap-posts-${lang}.xml`, async (req, res) => {
    try {
      const xml = await generatePostSitemap(lang);
      res.type('application/xml').send(xml);
    } catch (err) {
      console.error(err);
      res.status(500).send('Sitemap generation error');
    }
  });
});

module.exports = router;
