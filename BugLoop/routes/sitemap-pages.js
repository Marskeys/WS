app.get('/sitemap-pages.xml', (req, res) => {
  res.type('application/xml');

  const today = new Date().toISOString().slice(0, 10);
  const langs = ['ko', 'en', 'fr', 'zh', 'ja', 'es'];

  const staticXml = langs.map(lang => `
    <url>
      <loc>https://bugloop.dev/${lang}/</loc>
      <lastmod>${today}</lastmod>
      <changefreq>daily</changefreq>
      <priority>1.0</priority>
    </url>
    <url>
      <loc>https://bugloop.dev/${lang}/signup</loc>
      <lastmod>${today}</lastmod>
      <changefreq>yearly</changefreq>
      <priority>0.6</priority>
    </url>
  `).join('');

  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticXml}
</urlset>`);
});
