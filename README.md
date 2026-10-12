# Fieldprint

Safari guides sell prints of their own photos. A print-on-demand company prints and ships each order.

Status: Stage A, a clickable mockup with pretend services (fake payments, fake order updates, made-up prices).

## Run the current mockup

The source code is not in this repo yet, only built HTML copies in `archive/`. To view one:

    cd archive
    python -m http.server 5173

Then open http://localhost:5173/index.html

## Run the source (once restored)

    npm install
    npm run dev

Opens at http://localhost:5173.

## Folders

- `src/data` sample guide, photos, sizes, pricing
- `src/pages` Storefront (guests) and Dashboard (guides)
- `src/components` shared pieces
- `src/styles` colours and layout
- `src/scene` draws the SAMPLE placeholder photos
- `src/services` payments, orders, storage, auth, printing. Fake in Stage A, swapped for Stripe, Supabase, Prodigi in Stage B
- `public` static files
- `photos/originals` full-size originals, never committed
- `photos/web` stripped web copies (no camera data, dates or locations)
- `docs` decisions and open questions
- `archive` old built HTML files, kept as a backup

## Rules

- No secrets in code. Use `.env` (ignored by git).
- Keep web photos stripped of camera data, dates and locations.
