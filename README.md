# Icebreaker Bingo

A private, shareable icebreaker game for parties, weddings, and team events. Hosts choose prompts and share a link; players claim squares by adding the names of people they meet.

## Product principles

- **No account or backend:** game configuration lives in the share URL and progress stays in the player's browser.
- **Useful in a crowded room:** large tap targets, concise prompts, and persistent progress work well on phones.
- **Inclusive by default:** keyboard support, screen-reader labels, reduced-motion support, and print styling are included.
- **Easy to own:** plain HTML, CSS, and JavaScript with no production dependencies.

## Run locally

Run `npm start`, then open `http://localhost:4173`. Run unit tests with `npm test`.

## Deploy

This is a static site. Deploy the repository root directly to GitHub Pages, Cloudflare Pages, Netlify, or Vercel; no build command is required.

## Privacy note

Prompts are encoded—not encrypted—inside the share URL. Do not put secrets or sensitive personal information in a game. Player-entered names stay in local browser storage and are never transmitted by the app.
