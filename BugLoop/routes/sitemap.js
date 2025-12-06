const express = require('express');
const router = express.Router();
const db = require('../config/db');

// 🔥 책 JSON 불러오기
const locales = require('../locales/all.json');

// 지원 언어
const langs = ['ko', 'en', 'fr', 'zh', 'ja', 'es'];

/* --------------------------------------------------
   🔹 sitemap.xml (메인 인덱스)
-------------------------------------------------- */
router.get('/sitemap.xml', (req, res) => {
  res.type('application/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://bugloop.dev/sitemap-pages.xml</loc></sitemap>

  <!-- Posts -->
  <sitemap><loc>https://bugloop.dev/sitemap-posts-ko.xml</loc></sitemap>
  <sitemap><loc>https://bugloop.dev/sitemap-posts-en.xml</loc></sitemap>
  <sitemap><loc>https://bugloop.dev/sitemap-posts-fr.xml</loc></sitemap>
  <sitemap><loc>https://bugloop.dev/sitemap-posts-zh.xml</loc></sitemap>
  <sitemap><loc>https://bugloop.dev/sitemap-posts-ja.xml</loc></sitemap>
  <sitemap><loc>https://bugloop.dev/sitemap-posts-es.xml</loc></sitemap>

  <!-- Books -->
  <sitemap><loc>https://bugloop.dev/sitemap-books-ko.xml</loc></sitemap>
  <sitemap><loc>https://bugloop.dev/sitemap-books-en.xml</loc></sitemap>
  <sitemap><loc>https://bugloop.dev/sitemap-books-fr.xml</loc></sitemap>
  <sitemap><loc>https://bugloop.dev/sitemap-books-zh.xml</loc></sitemap>
  <sitemap><loc>https://bugloop.dev/sitemap-books-ja.xml</loc></sitemap>
  <sitemap><loc>https://bugloop.dev/sitemap-books-es.xml</loc></sitemap>
</sitemapindex>`);
});

/* --------------------------------------------------
   🔹 게시글 Sitemap 생성 함수
-------------------------------------------------- */
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

/* --------------------------------------------------
   🔹 책 Sitemap 생성 함수 (JSON 기반)
-------------------------------------------------- */
function generateBookSitemap(lang) {
  const books = locales[lang]?.books || {};
  const today = new Date().toISOString().slice(0, 10);

  let xml = '';

  Object.entries(books).forEach(([bookKey, book]) => {
    book.toc.forEach(section => {
      section.chapters.forEach(ch => {
        if (!ch.url || ch.url.trim() === '') return;

        const fullUrl = `https://bugloop.dev/${lang}/books/${bookKey}/contents/${ch.url}`;

        xml += `
  <url>
    <loc>${fullUrl}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      });
    });
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xml}
</urlset>`;
}

/* --------------------------------------------------
   🔹 게시글 Sitemap 라우트
-------------------------------------------------- */
langs.forEach(lang => {
  router.get(`/sitemap-posts-${lang}.xml`, async (req, res) => {
    try {
      const xml = await generatePostSitemap(lang);
      res.type('application/xml').send(xml);
    } catch (err) {
      console.error(err);
      res.status(500).send('Post sitemap generation error');
    }
  });
});

/* --------------------------------------------------
   🔹 책 Sitemap 라우트
-------------------------------------------------- */
langs.forEach(lang => {
  router.get(`/sitemap-books-${lang}.xml`, (req, res) => {
    try {
      const xml = generateBookSitemap(lang);
      res.type('application/xml').send(xml);
    } catch (err) {
      console.error(err);
      res.status(500).send('Book sitemap generation error');
    }
  });
});

module.exports = router;
