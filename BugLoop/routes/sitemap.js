app.get('/sitemap.xml', (req, res) => {
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


const langs = ['ko', 'en', 'fr', 'zh', 'ja', 'es'];

langs.forEach(lang => {
  app.get(`/sitemap-posts-${lang}.xml`, async (req, res) => {
    try {
      const xml = await generatePostSitemap(lang);
      res.type('application/xml').send(xml);
    } catch (err) {
      console.error(err);
      res.status(500).send('Sitemap generation error');
    }
  });
});

