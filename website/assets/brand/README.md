# Brand assets

Drop the real BioPod logo files here, then they will appear automatically in the header.

Expected files:
- `logo.svg` - full logo (pod-and-sprout mark + BioPod wordmark). Preferred.
- `logo-mark.svg` - the mark only (for the favicon and small spaces).
- `logo.png`, `logo-mark.png` - transparent PNG fallbacks at high resolution.

## How to wire it in
Each page header currently shows a typographic wordmark ("BioPod" + "Nature Simplified")
as a placeholder. To switch to the real logo, in the header of each page replace the
`<span class="brand-wordmark">…</span>` lockup with:

```html
<img src="assets/img/../brand/logo.svg" alt="BioPod - Nature Simplified" height="34" />
```

(or ask Claude to do the swap across all pages at once).

Until then, do **not** substitute a generic leaf icon - the typographic wordmark is the
intentional placeholder.

## Color tokens (sampled to match the logo)
Defined at the top of `assets/css/styles.css`. Adjust to the final logo file if needed:
green-900 `#243117`, green-700 `#3E5A29`, green-500 `#5C803C`, green-200 `#DCE6CF`,
soil-700 `#7A5230`, clay-600 `#B4633B`, cream-100 `#F4F1E7`, ink-900 `#1F2418`.
