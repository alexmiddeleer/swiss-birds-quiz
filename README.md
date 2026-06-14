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
mise exec -- pnpm preview
```
