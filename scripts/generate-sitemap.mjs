import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE_URL = process.env.VITE_SITE_URL ?? "https://fieldservice.no";
const today = new Date().toISOString().split("T")[0];

const routes = [
  { path: "/",                    priority: "1.0", changefreq: "weekly" },
  { path: "/verdiskaping",        priority: "0.9", changefreq: "monthly" },
  { path: "/priser",              priority: "0.9", changefreq: "weekly" },
  { path: "/bransjer",            priority: "0.8", changefreq: "monthly" },
  { path: "/bransjer/varmepumpe", priority: "0.8", changefreq: "monthly" },
  { path: "/bransjer/vvs",        priority: "0.8", changefreq: "monthly" },
  { path: "/bransjer/elektro",    priority: "0.8", changefreq: "monthly" },
  { path: "/faq",                 priority: "0.7", changefreq: "monthly" },
  { path: "/om-oss",              priority: "0.6", changefreq: "monthly" },
  { path: "/kontakt",             priority: "0.7", changefreq: "monthly" },
  { path: "/register",            priority: "0.9", changefreq: "monthly" },
];

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (r) => `  <url>
    <loc>${BASE_URL}${r.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;

const outPath = join(__dirname, "../public/sitemap.xml");
writeFileSync(outPath, xml, "utf8");
console.log(`✓ sitemap.xml written → ${outPath}`);
