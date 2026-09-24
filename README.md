# Icebreaker Bingo

A private, shareable icebreaker game for parties, weddings, and team events. Hosts pair guest names with prompts in a dedicated admin portal; players use a separate game link to match each prompt to the right person.

## Product principles

- **Separate portals:** `admin.html` is the host builder and `index.html` is the player-only game.
- **No account or backend:** game configuration lives in the player link and progress stays in the player's browser.
- **Useful in a crowded room:** large tap targets, concise prompts, and persistent progress work well on phones.
- **Inclusive by default:** keyboard support, screen-reader labels, reduced-motion support, and print styling are included.
- **Easy to own:** plain HTML, CSS, and JavaScript with no production dependencies.

## Run locally

Run `npm start`, then open `http://localhost:4173/admin.html` to create a game. The generated player link opens the separate player portal. Run unit tests with `npm test`.

## Deploy

This is a static site. Deploy the repository root directly to GitHub Pages, Cloudflare Pages, Netlify, or Vercel; no build command is required.

## Privacy note

Guest names and prompts are encoded—not encrypted—inside the player URL. Do not put secrets or sensitive personal information in a game. Player progress stays in local browser storage and is never transmitted by the app.
