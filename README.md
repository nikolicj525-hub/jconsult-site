# jovanconsult.com

Website for **J Consult**, EU funding strategy and proposal writing.

This is a plain static site: HTML, one CSS file and one small JavaScript file. It has no build step, no framework and no database. Upload the files and the site works.

## What's in the folder

```
index.html            Home page
privacy.html          Privacy policy
404.html              "Page not found" page
favicon.svg           Browser tab icon (J mark)
robots.txt
.htaccess             Hostinger settings: caching, compression, 404, HTTPS
assets/css/style.css  All styling, including the mobile layout and animations
assets/js/main.js     Mobile menu, counters, scroll reveal, services tabs, grant check, guide popup
assets/img/           Optimised WebP images
assets/fonts/         Hanken Grotesk, self-hosted (nothing loads from Google)
```

## Put it online: GitHub → Hostinger

1. **Create the GitHub repository.** Create a new repo (for example `jconsult-site`), private or public, and upload everything in this folder to the root of the `main` branch. Include the hidden `.htaccess` file.
2. **Prepare Hostinger.** In hPanel, open **Websites → jovanconsult.com → File Manager → public_html** and delete everything in it. Hostinger's Git deploy needs an empty folder.
3. **Connect the repository.** In hPanel, go to **Advanced → GIT** and fill in:
   - Repository: `https://github.com/<your-account>/jconsult-site.git` (for a private repo, use the SSH address `git@github.com:<your-account>/jconsult-site.git`)
   - Branch: `main`
   - Directory: leave empty, so the files go straight into `public_html`
   - For a private repo, Hostinger shows an SSH key. Add it in GitHub under **Repo → Settings → Deploy keys**, with read access only.
4. **Deploy.** Click **Create**, then **Deploy**. The site is live.
5. **Auto-deploy (optional).** In the same GIT screen, turn on **Auto Deployment** and copy the webhook URL. Add it in GitHub under **Repo → Settings → Webhooks** with content type `application/json` and the "push" event. From then on, every push to `main` updates the site.
6. **SSL.** In hPanel, go to **Security → SSL** and install the free certificate. Then open `.htaccess`, remove the `#` from the three "Force HTTPS" lines, and push again.

> **Domain and email warning.** If jovanconsult.com is registered somewhere other than Hostinger, point it to Hostinger, but **copy your Google Workspace MX records first**. Otherwise jovan@jovanconsult.com stops receiving email.

## Connect the free-guide popup to Mailchimp

Until this is done, the popup shows a thank-you message but **does not send anything**.

1. In Mailchimp, go to **Audience → Signup forms → Embedded form** and copy the generated code.
2. In that code, find:
   - the form's `action="https://….list-manage.com/subscribe/post?u=…&id=…"` URL;
   - the hidden input whose name starts with `b_`, for example `b_1a2b3c_4d5e6f`.
3. In `index.html`, find `id="guide-form"` and fill in:
   ```html
   data-mailchimp-action="PASTE THE ACTION URL HERE"
   data-mailchimp-honeypot="PASTE THE b_… NAME HERE"
   ```
4. In Mailchimp, create a **welcome email automation** for new subscribers, attach or link the guide PDF, and turn it on.
5. Push to GitHub. Test the popup with your own email address.

## Making changes

- **Text:** edit `index.html` or `privacy.html` directly. Everything is plain HTML.
- **Hero numbers:** find `data-count` in `index.html`. Change both the `data-count` value and the visible text, for example `data-count="7"` and `€7M+`.
- **Grant check questions and scoring:** edit the `QUIZ` and `PROG` lists in `assets/js/main.js`.
- **Your photo:** save it as `assets/img/jovan.webp` (about 680×850 px). Then follow the comment above `class="portrait"` in `index.html`.
- **Colours:** edit the variables at the top of `assets/css/style.css` (`--navy`, `--gold` and so on).
- **After you change CSS or JS:** bump `?v=1` to `?v=2` in the `<link>` and `<script>` tags of both HTML pages, so returning visitors get the new version. Browsers cache these files for a year.
- **New images:** export them as WebP at twice the size they appear on screen.

## Performance notes

- Images total about 400 KB. The hero photo comes in three sizes, and phones download the small one.
- Images below the first screen load only when the visitor scrolls to them.
- Fonts are self-hosted, preloaded, and limited to the weights in use (400–700).
- Animations respect each visitor's "reduce motion" system setting.
- Check the score after launch at https://pagespeed.web.dev
