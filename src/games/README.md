# Games directory

Each mini game lives in its own folder to keep PRs isolated.

Recommended structure for a new game:

```
src/games/<game-id>/
  game.ts
  README.md
  index.tsx
  styles.css
  assets/
```

Add your game metadata in `game.ts`. The hub auto-loads it via
`import.meta.glob`.

`index.tsx` should export a default React component. It is loaded automatically
when users enter `/games/<game-id>` from the hub.

Metadata tips:

- `status` must be `open`, `prototype`, or `planned`.
- For hub text, you can use localized strings: `{ en: '...', ko: '...' }`.
- `thumbnail` can be a square image URL or asset path for the hub card (1:1).
  - Recommended size: 256x256 or larger (min 128x128).
- `heroImage` can be a wide image URL or asset path shown under the card header (16:9).
  - Recommended size: 1280x720 or larger (min 960x540).
