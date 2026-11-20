# Start here

Instructions for the coding agent (Claude Code or similar) that has just been handed this folder. Follow them in order. The person you are working with should not have to read this file.

Facet is a design system for data and dashboard heavy products: tokens, CSS components, a Tailwind v4 bridge, written rules and specimen pages. It has no runtime dependencies. This folder is the whole system.

## 1. Install it

1. Put this folder in the project and commit it as is.
   - Monorepo with workspaces: `packages/facet/` (the package is named `facet-kit`).
   - Single app: `design/facet/` at the repository root.
2. Confirm it runs: `node scripts/build.mjs` (Node 18 or newer, no install step). It must finish with a brand summary and leave no diff.
3. Add the rules in `AGENT-RULES.md` to the project's agent instructions (`AGENTS.md` or `CLAUDE.md`), with the paths changed to where you put the folder. From then on every session that builds interface in this project reads `DESIGN.md` first.

## 2. Set the brand

Facet ships neutral. Ten choices fit it to a project. Run this once, right after installing, unless the person says to keep the defaults.

Say one sentence about what is coming ("Ten quick choices set the look; everything about meaning and density stays as designed"), then use whichever path your surface supports. Prefer the page.

### Path A, the page

`onboarding/index.html` is one self-contained file with every question and a live preview.

1. Show it to the person: open it in their browser if you run on their machine, otherwise send it as a file or publish it as a page with whatever your surface offers for HTML.
2. They choose, press **Copy for Claude** and paste the result into the chat (or attach the downloaded `brand-packet.json`).
3. Save what they pasted (the JSON object only) to a temporary file and run `node scripts/brand.mjs apply <file>`. The packet may carry the logo; the command installs it.

### Path B, in chat

Use this when you cannot show the page. Ask the questions in `onboarding/questions.md`, in that order and with those options, using your question tool if you have one. Then run one command, for example:

```bash
node scripts/brand.mjs set name="Northwind" accent=#2f6fed modes=both controls=round surfaces=soft depth=subtle stroke=fine neutrals=cool type=geist
```

For the logo, ask them to attach an SVG, then run `node scripts/brand.mjs logo <path>`.

### After either path

- Relay the summary the command prints. If it says the brand color is kept for identity only, tell the person plainly: their color is too close to a status color (or to gray), so focus rings, checked controls and highlights stay blue, and their color still carries selection, marketing surfaces and illustrations.
- If the command refuses the config, fix the input and run it again. Never edit generated CSS to get around a refusal.
- Commit `brand/` and the regenerated files together.

### What you may not do

The brand layer is small on purpose. Do not add options, fonts, hues or one-off overrides to satisfy a request it does not cover. If the person asks for something outside it (a display typeface, a different success color, tighter rows), say that it is fixed, say why (`brand/README.md` has the reasons), and offer the closest supported choice. A change to the system itself is a deliberate edit to `tokens/` or the hand-written CSS, made with the person's explicit sign-off and recorded in `CHANGELOG.md`.

## 3. Wire it into the app

**Next.js with Tailwind v4**, in the global stylesheet (use a relative path if the folder is not a workspace package):

```css
@import "tailwindcss";
@import "facet-kit/css/tailwind.css";
@import "facet-kit/css/base.css";
@import "facet-kit/css/typography.css";
@import "facet-kit/css/components.css";
```

Add the layers the screens need: `data.css`, `charts.css`, `lists.css`, `forms.css`, `shell.css`, `settings.css`, `surfaces.css`, `flows.css`. Using shadcn/ui: also import `css/shadcn.css` and follow the note at its top.

**Plain HTML or a single-file page:** link `css/facet.css`, which imports everything.

**Fonts** follow the `type` choice. `node scripts/brand.mjs show` prints what to load.
- Geist: in Next.js use the `geist` package and put `GeistSans.variable` and `GeistMono.variable` on `<html>`. Elsewhere `css/fonts.css` loads the copies in `fonts/`.
- Inter or IBM Plex: load the sans and its mono with `next/font/google` (or self-hosted `@font-face`) and expose them as `--font-sans` and `--font-mono`.
- System UI: nothing to load.

**Theme:** `modes` decides whether the product follows the operating system. Force a theme on `<html>` or any subtree with `data-theme="light"` or `data-theme="dark"`.

**Logo:** `brand/logo.svg` is the cleaned file. Use it as an image with the product name as its alt text. A one-color logo also gets `brand/logo.mono.svg`, drawn in `currentColor`: inline that one where the logo should follow the theme. Size it with `.fc-logo` (`components/app-shell.md`).

**Color guard:** add `node <path>/scripts/lint-color.mjs <app dirs>` to the project's checks. It fails on raw colors and hue steps, which keeps product code on semantic tokens.

## 4. Build with it

Read `DESIGN.md` before designing any screen, then the matching file in `components/` or `patterns/`. Open `preview/index.html` (design), `preview/screens.html` (full screens) and `preview/content.html` (writing) to see every part rendered in the current brand. The examples use a fictional product called Acme; replace its nouns with the project's own.
