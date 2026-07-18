# Kochi Metro Side Quests

<p align="center">
  <img src="images/IMG_1315-2.png" alt="beautiful face" width="200">
</p>

## Google Maps setup

Create `.env.local` with:

```bash
GOOGLE_MAPS_KEY=your_google_maps_key
```

In Google Cloud Console, restrict that key by API and website referrer:

- Enable only Maps JavaScript API, Places API, and Routes API.
- For local development, allow `http://localhost:3000/*` and `http://localhost:3002/*`.
- Add the exact production domain before deploying.
- Never commit `.env.local` or paste the key into client-side code.
