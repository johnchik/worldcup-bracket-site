# FIFA World Cup 2026 Set Sail Bracket

Static GitHub Pages site showing the World Cup 2026 knockout bracket from Round of 16 onward.

## Deploy

1. Push this folder to a GitHub repo.
2. Go to **Settings → Pages**.
3. Select **Deploy from branch**, branch `main`, folder `/root`.
4. Open the Pages URL.

## Real data update

This repo includes `.github/workflows/update-worldcup.yml`.

Recommended provider: API-Football / API-Sports. Their World Cup guide uses `league=1` and `season=2026`.

1. Create an API-Football key.
2. Add it to GitHub: **Settings → Secrets and variables → Actions → New repository secret**.
3. Name it `API_FOOTBALL_KEY`.
4. The workflow checks every 10 minutes, but it only calls API-Football when a match is in the update window.

To protect the free-tier API-Football limit of 100 requests per day, scheduled runs skip the API request unless at least one unfinished match is:

- live, or
- between 30 minutes before kickoff and 5 hours after kickoff.

Manual **Run workflow** executions in GitHub Actions set `FORCE_UPDATE=true`, so they still call the API outside that window when you need to refresh fixtures or schedule changes.

The frontend reads only `data/worldcup.json`, so your API key is never exposed in GitHub Pages.

## Edit Supporters

Edit the `supporters` object in `data/worldcup.json`:

```json
"supporters": {
  "Argentina": "Alice",
  "France": "Jack"
}
```

Teams not in the supporters map still show in the bracket, but the friend name displays as `—`.
