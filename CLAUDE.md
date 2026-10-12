# Fieldprint

## Working with Seb
- Start every reply by calling him Seb.
- Plain English, short, natural. No em dashes, no corporate or AI-sounding words. No emojis.
- Seb is not a professional developer. Give exact commands when he needs to run something.
- If a request is unclear, ask first. Number questions, give options plus "Other".
- Before asking whether he wants a feature, explain exactly what it adds or changes.
- Use the fewest words that get the point across.

## What Fieldprint is
Safari guides sell prints of their own wildlife photos. A print-on-demand company prints and ships each order.
- Each guide gets their own storefront. No central marketplace.
- First buyers: guests the guide just spent a week with, plus Instagram followers.
- Buyers worldwide. Guides in southern and east Africa first.
- Storefront shows the guide's favourite photos in rotation, not organised by trip.
- Launch products: unframed and framed prints.

## Constraints
- Budget under 200 GBP total.
- First working version within about a month (started around 11 October 2026).
- Focus is UI and UX only. Seb tests it himself.

## Plan
- Stage A (now): clickable mockup, pretend services.
- Stage B (later): Stripe (payments), Supabase (database, logins, storage), Vercel (hosting), Prodigi or Gelato (printing).
- Do not set up real accounts, API keys or paid services unless Seb asks. Never put secrets in code or this file.

## Existing mockup
React + Vite, originally built in a claude.ai chat as `fieldprint-mockup.zip`. Source is NOT yet in this repo; only built HTML in `archive/`. Do not rebuild from scratch without asking Seb.
Run: `npm install`, `npm run dev`, opens at localhost:5173.

Planned main files: `src/data/` (guide, photos, sizes, crop maths, pricing; guide name is placeholder "Guide Name"), `src/pages/Storefront.jsx`, `src/pages/Dashboard.jsx`, `src/styles/styles.css`, `src/scene/scene.js`.

Guest side: hero favourite, mosaic gallery, photo page (size and frame, to-scale preview), stories, cart, test checkout with worldwide delivery, order tracker, single-use discount codes capped at guide profit.
Guide side: overview, favourites, photos and crops, upload quality checker, step-by-step onboarding, pricing with regional tabs, orders with faked status and problem-order setting, stories, Instagram tools, earnings (14-day hold, monthly payout), separate desktop and phone covers.

Photos: Seb's Namibia photos are used in the storefront (titles and places are rough guesses). The generic test guide shop uses fake illustrated photos stamped "SAMPLE". Keep these separate. Web copies are stripped of camera data, dates and locations. Keep it that way. Originals never go in git.

## Test-only shortcuts (MUST change for the real version)
These were added so testers can click straight through. Undo them before real customers use it.
- Sign-in page skips itself and logs in as the test guide (guide@example.com) or test customer (alex.morgan@example.com). Real version needs proper login (Supabase).
- Checkout, guide sign-up and contact form have no required fields. Empty boxes fall back to test values (Alex Morgan, alex.morgan@example.com, Test Guide, guide@example.com, Namibia, test-guide). Real version must require a real name and email, and validate them.
- Digital download button is pretend. Real version must deliver a private, expiring link to the 4000 px file.
- Payments, order updates and payouts are fake.
- All of the above were edited straight into the built file `docs/index.html` because the React source is missing. Redo them in the source once it is restored.

## Decisions
- Platform fee: 10% of the sale, minimum 4 GBP (was 6 GBP flat). Full pricing model still undecided.
- Digital downloads: optional per photo, guide sets the price, 4000 px wide file, personal use.
- Live test site: GitHub Pages from `docs/` at https://sebcaw.github.io/fieldprint/ (repo is public for now).
- Favourites rotation, not trip albums.
- Pick shapes first, then crop.
- Simple pricing view, breakdown hidden.
- Guides choose shapes to sell and set different profit per region.
- All prices and costs are made up and live in `src/data/`.
- No central marketplace.

## Undecided (raise with Seb, never decide alone)
- Who handles orders needing action: Seb, the guide, or both.
- How guides get paid. Stripe may not pay out to Kenya, Tanzania, South Africa, Namibia. Needs checking.
- VAT and who is the legal seller.
- Final pricing model.

## Not built yet
- "Sell your safari photos" pitch page for guides.
- Sign-up and setup flow for a new guide.
- Prices in the buyer's own currency.

## Seb still needs to
Check Stripe payouts for guide countries, order sample prints from Prodigi and Gelato for real costs, show the mockup to the guide he knows.
