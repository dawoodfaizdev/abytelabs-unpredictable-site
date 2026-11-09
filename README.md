# abytelabs-unpredictable-site

Website for **Unpredictable: Cozy Runner** by Abyte Labs, served by GitHub Pages. Plain HTML and CSS, no build step.

## Custom domain: unpredictable.abytelabs.com

All canonical URLs, the sitemap and the social cards use **https://unpredictable.abytelabs.com**. To switch the site over:

1. At your DNS provider for abytelabs.com, add a **CNAME** record: name `unpredictable`, value `dawoodfaizdev.github.io`.
2. In this repository on GitHub: *Settings > Pages > Custom domain*, enter `unpredictable.abytelabs.com` and save
   (GitHub adds a `CNAME` file to the repo; pull it). When the check passes, tick **Enforce HTTPS**.
3. The old `dawoodfaizdev.github.io/abytelabs-unpredictable-site/` links then redirect to the new domain automatically.
4. Update the privacy policy URL and website in the Play Console listing to https://unpredictable.abytelabs.com/privacy.html and https://unpredictable.abytelabs.com/.
5. Submit https://unpredictable.abytelabs.com/sitemap.xml in Google Search Console (the `abytelabs.com` Domain property covers it).

Until step 2 is done the pages still work on the github.io address; only the canonical links point ahead to the new domain.

## Images

The hero screenshot and the characters are served as small WebP copies (`assets/screenshot-1-flat-480.webp`, `-860.webp`,
`assets/img/char-*-200.webp` and `-340.webp`). If you replace `assets/screenshot-1-flat.png`, rebuild its copies with:

```
python3 -c "from PIL import Image; im=Image.open('assets/screenshot-1-flat.png').convert('RGB'); [im.resize((w, round(im.height*w/im.width))).save(f'assets/screenshot-1-flat-<function w at 0x7f83ed73f1a0>.webp', quality=82) for w in (480, 860)]"
```

## Files

- Pages: `index.html`, `privacy.html`, `terms.html`, `ads-and-data.html`, `support.html`, `delete-data.html`, `404.html` (noindex)
- SEO: `robots.txt`, `sitemap.xml` (with image entries), JSON-LD (VideoGame + MobileApplication on the home page, WebPage + BreadcrumbList elsewhere), Open Graph and Twitter cards (`assets/img/og.png`)
- Icons: `favicon.ico`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`, `site.webmanifest` (made from the game's own app icon)
- `app-ads.txt` (AdMob), `humans.txt`, `llms.txt`, `.well-known/security.txt` (renew `Expires` before 2027-11-06)
- `.nojekyll` tells GitHub Pages to serve files as they are (so `.well-known/` is published)
- Fonts are self-hosted in `assets/fonts` (Fredoka + Nunito, SIL Open Font License): no requests to Google Fonts
