# 1k2p mini games contribution guide

## Project overview

1k2p (one kill 2 players) is a mini game hub built with React, Vite, and the
Cloudscape Design System. The main hub UI lives in `src/App.tsx` and uses
Cloudscape components such as AppLayout, TopNavigation, ContentLayout, Cards,
and Container.

The goal for contributors is simple: build new mini games without changing the
core site design. Keep your PR focused on your game folder so the hub can
auto-load it.

## Collaboration rules (for AI-assisted development)

These rules keep the Cloudscape look intact and prevent cross-team conflicts.

1. Do not change global UI layout or styling
   - Avoid edits to `src/App.tsx`, `src/main.tsx`, and `src/index.css`.
   - Do not add global CSS resets or site-wide styles.
   - Use Cloudscape components and design tokens instead of custom CSS themes.

2. Only touch your game folder
   - Put your work under `src/games/<game-id>/`.
   - For static assets (images, audio, etc.), use `public/games/<game-id>/`.
   - Do not modify other games or shared UI unless requested.
   - CI will fail if files outside your game folder are changed.

3. Register your game in the hub
   - Add a `game.ts` file in your game folder.
   - Export a default object that matches `GameMeta`.
   - Keep `id` stable and URL-safe (kebab-case).
   - Keep `status` to one of: `open`, `prototype`, `planned`.
   - Add `thumbnail` to show a square image on the hub cards (optional, 1:1).
     - Recommended size: 256x256 or larger (min 128x128).
   - Add `heroImage` to show a wide image under the card header (optional, 16:9).
     - Recommended size: 1280x720 or larger (min 960x540).
   - Export a default React component from `index.tsx` for the game route.
   - For hub text, prefer localized strings (`{ en, ko }`).

4. Keep PRs reviewable
   - One game per PR.
   - No unrelated refactors or dependency changes.
   - Include a short demo clip or screenshot in the PR description.

## Cloudscape and React guardrails (hub only)

Cloudscape rules apply to the hub pages (the main site UI). They do not apply
inside individual mini games. You are free to build any visual style or tech
inside your own game folder.

- Hub UI must continue to use Cloudscape components and styles.
- Do not change the hub layout or global styling files.
- React: prefer function components and follow hooks rules.

## AI instruction template

Paste this when asking an AI to work on a mini game:

```
Follow `CONTRIBUTING.md` and `src/games/README.md`.
Work only inside `src/games/<game-id>/` and `public/games/<game-id>/`.
Add `game.ts` metadata for the hub auto-listing.
Do not edit global UI files or the hub layout.
Cloudscape rules are for the hub only; inside the game you can use any style.
If adding test dependencies, modify package.json and explain in PR.
```

## Directory structure

Each game has its own folder under `src/games/` for code and `public/games/` for static assets:

```
src/games/<game-id>/
  game.ts
  README.md
  index.tsx
  styles.css
  assets/           # Small assets bundled with code

public/games/<game-id>/
  images/           # Large images, sprites
  audio/            # Sound effects, music
  data/             # JSON, CSV, or other data files
```

`src/games/registry.ts` auto-loads each game's `game.ts`. The hub routes
`/games/<game-id>` directly to your `index.tsx` component.

### When to use `src/games/<game-id>/assets/` vs `public/games/<game-id>/`

- **`src/games/<game-id>/assets/`**: Small assets that should be bundled (< 100KB)
  - Icons, small images
  - Will be processed by Vite and get cache-busting hashes
  - Import with: `import myImage from './assets/image.png'`

- **`public/games/<game-id>/`**: Large static files served as-is
  - Large images, spritesheets
  - Audio files, videos
  - Data files (JSON, CSV)
  - Access with: `/games/<game-id>/images/sprite.png`

## Game integration expectations

- Your game UI should be self-contained.
- If you need styles, scope them to your game folder only.
- You can use any UI stack or style inside your game folder.

## Test infrastructure changes

If your game requires testing dependencies (vitest, jest, etc.), you may modify:
- `package.json` / `package-lock.json` - Add dev dependencies only
- `vite.config.ts` / `vitest.config.ts` - Add test configuration

These changes will be flagged for maintainer review but are allowed if justified.
Include a clear explanation in your PR description.

## PR checklist

- [ ] Game code lives in `src/games/<game-id>/`
- [ ] Static assets (if any) in `public/games/<game-id>/`
- [ ] `game.ts` metadata added
- [ ] No edits to global layout files (unless explicitly approved)
- [ ] If test infrastructure changed, explanation provided
- [ ] Demo media included in PR description

## Maintainer override

If a core maintainer needs to edit shared files, set `BYPASS_GAME_SCOPE=true`
in the CI job or run the check locally with that env var.
