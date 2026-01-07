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
