# Bio-Pod — Marketing Website

A modern, static marketing + investor-teaser site for Bio-Pod. No build step, no
dependencies — plain HTML, one CSS file, and a small JS file. It runs anywhere
that serves static files, including GitHub Pages.

## Pages
| File | Purpose |
|------|---------|
| `index.html` | Home — hero, problem/solution, how it works, benefits, comparison, mission, awards, FAQ teaser, waitlist |
| `how-it-works.html` | The 3-step flow, the science of the dissolving shell, where to use it |
| `sustainability.html` | The environmental case, with cited third-party data and a sources list |
| `about.html` | Founder story, values, team, recognition |
| `investors.html` | Public investor teaser: market, the gap, why-now, the ask (no private figures) |
| `faq.html` | Full customer FAQ |
| `contact.html` | Waitlist (`#waitlist`), general contact (`#general`), investor inquiry (`#investor`) |
| `404.html` | Friendly not-found page |

## Assets
- `assets/css/styles.css` — the full design system (earthy & organic theme tokens, components)
- `assets/js/main.js` — nav toggle, sticky header, FAQ accordion, scroll reveals, form handling
- `assets/img/favicon.svg` — the leaf-pod logo mark

## Preview locally
From this `website/` folder:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

## Things to confirm before launch
These are intentionally left as safe placeholders — update them when ready:

1. **Contact email** — currently `hello@bio-pod.com` (in `contact.html`). Set your real address.
2. **Social links** — Instagram / LinkedIn icons point to `#`. Add real profile URLs (search `aria-label="Bio-Pod on`).
3. **Forms have no backend yet.** They show a friendly success message but don't send anywhere. Wire them to a form service (e.g. Formspree, Buttondown, Mailchimp) — set each `<form>`'s `action`/`method` and remove the `data-demo` attribute, or keep `data-demo` for the on-page confirmation.
4. **Photography** — product and founder visuals are clean SVG illustrations for now; swap in real photos when available (founder portrait blocks in `about.html`, product visuals in `index.html` / `how-it-works.html`).
5. **Legal pages** — add a Privacy Policy and Terms before collecting emails publicly.
6. **Wording** — confirm the recognition wording and team bios read the way you want.

## Theme
Earthy & organic: warm cream paper (`--bg`), deep soil-brown ink, moss/leaf greens,
and a terracotta clay accent. Headings use *Fraunces*; body uses *Inter* (Google Fonts).
All colors are CSS variables at the top of `styles.css` — change them in one place to retheme.
