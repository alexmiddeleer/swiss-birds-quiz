# Swiss birds quiz

Swiss birds quiz is a simple, ad-hoc, offline-first progressive web app for memorizing common Swiss birds.

It is designed for quick practice anywhere, including places without network access. The project is public-friendly: contributions are welcome if you want to improve the bird set, learning flow, offline behavior, or app polish.

## Goals

- Help people recognize and memorize common Swiss birds.
- Work well as a progressive web app while offline.
- Stay small, practical, and easy to run locally.

## Requirements

- [mise](https://mise.jdx.dev/)
- [pnpm](https://pnpm.io/)

## Setup

```sh
mise install
mise exec -- pnpm install
```

## Scripts

```sh
mise exec -- pnpm dev
mise exec -- pnpm build
mise exec -- pnpm test
mise exec -- pnpm preview
```

## Deployment

This app deploys to GitHub Pages from `main` with GitHub Actions. The build uses Vite's `/swiss-birds-quiz/` base path for the repo Pages URL.

Processed bird images and provenance JSON live under `public/birds/` and should be committed so the app can ship them as static offline-ready assets.

## Import bird images

Bird images are imported from Wikimedia Commons with a human review step. The importer only accepts public domain images, stores processed WebP files under `public/birds/`, writes provenance JSON next to each image, and records species with no approved result in `data/missing-birds.json`.

Create a species list like `data/species.example.json`, then run:

```sh
cp .env.example .env
```

Set `WIKIMEDIA_EMAIL` in `.env` to a real email address for Wikimedia API contact, then run:

```sh
mise exec -- pnpm import:bird-images -- --species-file data/species.example.json
```

For each candidate, the importer opens the Wikimedia file page for source review, then opens the processed WebP for final quality review. Type `y` or `n` in the terminal after each review.
