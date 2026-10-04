# m’aso design system

The landing page is the brand standard. This system was extracted from it and is shared by every screen.

| File | Role |
|---|---|
| `web/src/styles/tokens.css` | Colour, type, shape, depth, layout and motion tokens, plus base, skip-link and focus styles |
| `web/src/styles/app.css` | Shared components for every flow screen |
| `web/src/app/<screen>/*.module.css` | Layout for one screen only (CSS Modules, scoped) |
| Inter via `next/font` (400–900) | The only typeface, self-hosted |

The root layout imports `tokens.css`, then `app.css`. Global CSS is never removed when navigating, so anything specific to one screen goes in that screen's CSS Module, using `:global(.class)` to reach shared components. Screen CSS never redefines a colour, radius or shadow: use a token.

## Fit

Every screen fits one laptop screen (1280×720 and up) without scrolling. Spacing (`--vgap`, `--vpad`), titles and the nav height scale with viewport height. The room and summary lock to the viewport; their lists scroll internally with a fade (`.has-more`) when there is more below. Phones scroll normally, because squeezing captions would make them unreadable.

## Tokens

**Colour.** There are three brand accents and one ink colour. Each accent has a fixed job.

| Token | Value | Use |
|---|---|---|
| `--yellow` | #e9f000 | Primary actions, caption highlights, the "start" path |
| `--blue` | #4169ff | The "join" path, secondary accents, focus rings on inputs |
| `--blue-action` | #3d63fa | Filled blue buttons only. White text on it passes AA (4.8:1); white on `--blue` is 4.48:1 and fails. |
| `--coral` | #ff5d47 | Keyboard focus outline, key-detail dots, destructive hints |
| `--mint` / `--mint-soft` / `--mint-ink` | | Live and connected status. Use `-soft` on dark backgrounds and `-ink` on light ones. |
| `--ink`, `--ink-2`, `--ink-3` | #080b0d → #202a3b | Text, and the dark-panel gradient |
| `--bg` / `--surface` / `--surface-soft` | #f4f4f2 / #fff / #fafaf7 | Page, card, and inset backgrounds |
| `--muted` | #62656b | Secondary text (5.6:1 on white) |
| `-tint` variants | | Icon-tile backgrounds and room-code tickets |

**Type.** Inter only. Headings use weight 900 and tight tracking that suits Inter: display `-0.05em`, title `-0.045em`, card titles `-0.03em`. Spacing tighter than about -0.05em makes Inter's letters touch. Labels are 12px, weight 900, uppercase, spaced `0.14em`.

**Shape.** `--r-sm` 14 (inputs), `--r-md` 18 (tiles, room code), `--r-lg` 26 (cards), `--r-xl` 32 (dark panels and the showcase), `--r-pill` (buttons and chips).

**Depth.** Cards use one soft shadow (`--shadow-card`). Buttons use a "pressed" edge (`--press-yellow`, `--press-blue`), which is a solid bottom edge plus a soft glow and is the signature of index's main CTA. Dark panels use `--shadow-panel`.

**Motion.** `--ease-out` is `cubic-bezier(.2,.8,.2,1)`. Entrances use `.rise`, staggered with `style={delay(0.08)}` from `src/lib/ui.ts`. Every animation turns off under `prefers-reduced-motion`.

## Components

React components live in `web/src/components/`: `AppNav`, `Icon` and `Arrow`, `Shapes`, `RoomCode`, `NoRoom` and `EditableList` (correct, remove and undo, with focus management). The classes below come from `app.css`.

| Component | From index | Notes |
|---|---|---|
| `.appnav`, `.appbrand`, `.back`, `.navmeta` | `.nav`, `.brand` | Same inset as index (`--gutter`), same 28px bottom radius, same 40px logo |
| `.eyebrow`, `.title`, `.lead`, `.cardtitle`, `.body`, `.footnote` | hero type | Flow pages use `.title`; index's hero uses `--fs-display` |
| `.btn.primary` / `.secondary` / `.ghost`, modifiers `.sm` `.block` | `.maincta` | Minimum height 48px. Arrows go in `<span class="arrow">→</span>`. One primary button per screen. |
| `.card`, plus `.accent` (`.is-blue`, `.is-coral`, `.lift`, `.static`) | `.feature` | `.lift` makes the accent bar grow on hover. Use it on choice cards. Use `.static` on side panels. |
| `.tile` (`.is-blue`, `.is-coral`, `.sm`) | `.icon` | Holds one `<Icon>` |
| `.panel-dark` | `#room.room-section` | Ink gradient with the yellow and blue orbit rings |
| `.live` (`.on-light`, `.pulse`, `.idle`), `.chip`, `.statusnote` | `.live` | Only add `.pulse` to state that is actually live |
| `.itemlist` / `.item`, `.dot` | `.highlight` rows | |
| `.field`, `.roomcode` | | `aria-invalid="true"` turns the field coral |
| `.summary` / `.summaryrow` | | |
| `.shapes` with `.s-coral` `.s-blue` `.s-yellow` `.s-ring` | hero `.shape` set | Decoration for page heads. Hidden below 720px. |
| `.iconbtn`, `.rowtools`, `.rowedit`, `.linkbtn` | | Edit and remove controls for AI output, rendered by `<EditableList>` |
| `.tag` (`.light`, `.is-ai`, `.is-edited`) | | Says where content came from (“Live · faster-whisper”, “Gemma”) or that a person changed it (“Edited”) |
| `.segmented`, `.switch`, `.setting` | | Settings controls. The segmented control is a radio group; the switch uses `role="switch"`. |

**Icons.** `<Icon name="…">` renders inline SVGs drawn on a 24px grid with a 2.2 round stroke in `currentColor`. They match the logo's rounded strokes. Don't use emoji or unicode glyphs as icons.

## Flow conventions

- Everything shown is real: room codes come from the AI service, presence is live, captions come from faster-whisper and summaries from Gemma. Nothing is simulated or sample data.
- AI output is always labelled with its source and is always editable and removable before anything is saved.
- Browser state lives in `localStorage` through `src/lib/store.ts` (guarded, and read with `useSyncExternalStore` so server and browser renders agree). Keys: `maso_room`, `maso_name`, `maso_prefs`, and the session's `maso_transcript`, `maso_details`, `maso_reply`, `maso_summary`, which `resetSession()` clears.
- Every screen has `<main id="main">`, so the skip link has a target.
- The room keeps its header small so captions stay the largest thing on screen.
