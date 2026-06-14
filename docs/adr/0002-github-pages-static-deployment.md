# GitHub Pages static deployment

We will deploy the app as a static Vite site to GitHub Pages from `main` using GitHub Actions, with Vite configured for the `/swiss-birds-quiz/` repo path. Processed bird images and their provenance JSON are committed under `public/birds/` so the build artifact contains the learning assets and does not depend on Wikimedia at runtime.
