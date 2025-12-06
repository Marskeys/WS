// routes/sitemap-books.js
const express = require('express');
const router = express.Router();
const locales = require('../locales/all.json');

const langs = ['ko', 'en', 'fr', 'zh', 'ja', 'es'];

// 언어별 sitemap 생성 함수
function generateBookSitemap(lang) {
  const books = locales[lang]?.books || {};
  const today = new Date().toISOString().slice(0, 10);

  let xmlItems = '';

  // 각 책(bookKey)
  Object.entries(books).forEach(([bookKey, book]) => {
    // sections
    book.toc.forEach(section => {
      // chapters
      section.chapters.forEach(ch => {
        if (!ch.url || ch.url.trim() === '') return; // url이 비어있으면 제외

        const fullUrl = `https://bugloop.dev/${lang}/books/${bookKey}/contents/${ch.url}`;

        xmlItems += `
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
${xmlItems}
</urlset>`;
}

// 언어별 라우터 제공
langs.forEach(lang => {
  router.get(`/sitemap-books-${lang}.xml`, (req, res) => {
    try {
      const xml = generateBookSitemap(lang);
      res.type('application/xml').send(xml);
    } catch (e) {
      console.error(e);
      res.status(500).send("Book sitemap generation error");
    }
  });
});

module.exports = router;
