# m’aso web app

Next.js 16 (App Router) front end for m’aso. See the [root README](../README.md) to run the whole product.

```bash
cp .env.example .env.local   # NEXT_PUBLIC_AI_URL points at the AI service
npm install
npm run dev                  # http://localhost:3000
npm run test:e2e             # Playwright, against the real AI service
```

- `src/styles/` — design tokens and shared components ([../docs/DESIGN.md](../docs/DESIGN.md))
- `src/app/<screen>/` — one folder per screen, page styles in a CSS Module
- `src/lib/` — AI service client, room WebSocket, caption helpers, browser storage
- `public/pcm-worklet.js` — copies microphone audio off the audio thread
