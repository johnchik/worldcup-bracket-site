# FIFA World Cup 2026 Set Sail Bracket

Static GitHub Pages site showing the World Cup 2026 knockout bracket from Round of 16 onward.

## Deploy

1. Push this folder to a GitHub repo.
2. Go to **Settings → Pages**.
3. Select **Deploy from branch**, branch `main`, folder `/root`.
4. Open the Pages URL.

## Manual data update

Automatic API updates are disabled. Update match scores manually in `data/worldcup.json`, then regenerate `data/worldcup-data.js` from the same JSON before deploying.

The disabled API-Football updater remains in `scripts/update-api-football.mjs` for reference, but it exits without making requests unless `ENABLE_API_FOOTBALL_UPDATE=true` is set.

## Edit Supporters

Edit the `supporters` object in `data/worldcup.json`:

```json
"supporters": {
  "Argentina": "Alice",
  "France": "Jack"
}
```

Teams not in the supporters map still show in the bracket, but the friend name displays as `—`.
