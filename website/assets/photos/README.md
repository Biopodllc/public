# Canonical photo slots

Every image on the site references one of the files below. To replace a photo,
**overwrite the file with the same name** and matching dimensions. Do not hardcode
any other image paths anywhere in the site.

Until a real photo is added, each slot shows a styled placeholder frame with the
caption "Placeholder, final product photography to come". The `<img>` removes
itself if the file is missing, so there are never broken-image icons. When you add
the file, it appears automatically and covers the placeholder.

| File | Used on | Subject | Aspect | Suggested size (2x) |
|------|---------|---------|--------|---------------------|
| `hero-hand-placing.jpg` | Home hero | A hand placing a pod into a potted houseplant, brand text facing camera | 1:1 | 1200 × 1200 |
| `step-1-drop.jpg` | Home steps | Pod resting at the soil base, close | 3:2 | 1200 × 800 |
| `step-2-water.jpg` | Home steps | Water hitting the pod, shell wetting | 3:2 | 1200 × 800 |
| `step-3-grow.jpg` | Home steps | Healthy plant, optional BioPod marker | 3:2 | 1200 × 800 |
| `product-hero-seamless.jpg` | Home, Inside the Pod | Pod alone on a clean seamless background | 1:1 | 1200 × 1200 |
| `inside-pod-editorial.jpg` | The Science | Pouch opened, nutrient compartments visible | 16:9 | 1600 × 900 |
| `lifestyle-indoor.jpg` | For Indoor Plants | Styled indoor plant scene | 4:5 | 1200 × 1500 |

## Photography standard (enforced)
Production images must be **photographs of the real BioPod prototype** (the pouch
whose label reads "BioPod, Nature Simplified, Living Plant Nutrients"). Do not ship
AI-rendered product imagery on any public page: AI renders corrupt the brand text,
fake the QR code, and read as inauthentic.

## When a real photo arrives
1. Overwrite the matching file here, keeping the same filename.
2. Confirm the dimensions match the slot's aspect ratio.
3. Update the `alt` text on that `<img>` to describe the real shot.
4. Remove the placeholder `<figcaption>` and the HTML comment in that figure.
5. Mark the slot **final** in `COMPLIANCE_REVIEW.md`.

## DIY shot list (phone + window light, one afternoon)
Light beside a large window with a sheer curtain (or shoot on an overcast midday),
no flash. Bounce fill with white foam board opposite the window. Two backgrounds:
white/cream seamless for product-only shots, and a natural surface (stone, wood,
linen) for editorial shots. Phone in highest-quality/RAW, steady on a tripod, tap
to focus and pull exposure down slightly so highlights are not blown.

1. **product-hero-seamless** - pod centered on white seamless, lens level, side light. Ten frames.
2. **hero-hand-placing** - a hand holding the pod above a potted plant (pothos/prayer plant), brand text readable.
3. **step-1-drop** - pod set on the soil at the plant base, close, shallow focus.
4. **step-2-water** - pod on moist soil in a shallow dish, pour a thin stream, burst mode as the shell wets. A clean wetted-pod close-up is acceptable.
5. **step-3-grow** - a healthy, well-lit plant, with a printed BioPod marker if available.
6. **inside-pod-editorial** - open one pod, arrange the contents in their compartments on stone or wood with the empty pouch beside it, side light for texture.
7. **lifestyle-indoor** - a calm, uncluttered corner with one or two houseplants in good light.

Edit naturally in Snapseed / Lightroom mobile / Photopea: correct exposure and white
balance, crop to the aspect ratio, light contrast and sharpening. No fake QR codes,
labels, or AI elements.
