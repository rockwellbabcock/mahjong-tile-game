# Mahjong Tile Game

## Overview

This is a single-player Mahjong tile game built as a full-stack web application. The game logic runs primarily on the client side, with a minimal server backend for optional game state persistence. Players interact with a hand of Mahjong tiles through draw and discard phases. The app features smooth animations via Framer Motion and a green felt-themed UI design inspired by traditional Mahjong tables.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React + Vite)

- **Framework**: React with TypeScript, bundled by Vite
- **Routing**: `wouter` for lightweight client-side routing (single page at `/` for the game)
- **State Management**: Game state is managed entirely client-side via a custom React hook (`use-game-logic.ts`). TanStack React Query is available for server data fetching but the core game doesn't depend on it.
- **UI Components**: shadcn/ui component library (new-york style) built on Radix UI primitives with Tailwind CSS
- **Animations**: Framer Motion for tile movement and interactions
- **Styling**: Tailwind CSS with CSS variables for theming. The theme uses a green felt color palette. Custom fonts: DM Sans (body), Playfair Display (display), JetBrains Mono (mono).
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`, `@assets/` maps to `attached_assets/`

### Backend (Express 5)

- **Runtime**: Node.js with Express 5, written in TypeScript, run via `tsx`
- **API Design**: Minimal REST API. Route definitions are shared between client and server via `shared/routes.ts` using Zod schemas for input validation.
- **Current endpoints**: `POST /api/games` to save game state (optional feature)
- **Dev server**: Vite dev server is integrated as middleware during development with HMR support
- **Production**: Client is built to `dist/public`, server is bundled with esbuild to `dist/index.cjs`

### Shared Code (`shared/`)

- **Schema** (`shared/schema.ts`): Drizzle ORM table definitions and TypeScript types for game entities (Tile, Suit, GamePhase, etc.)
- **Routes** (`shared/routes.ts`): API route definitions with Zod validation schemas, shared between frontend and backend
- Types like `Tile`, `Suit`, `TileValue`, `GamePhase` are defined in the schema and imported by both client and server

### Database

- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Connection**: `pg` Pool using `DATABASE_URL` environment variable
- **Schema push**: `npm run db:push` (uses drizzle-kit push)
- **Tables**: Single `games` table storing serialized game state as JSONB
- **Migrations**: Output to `./migrations` directory

### Build System

- **Dev**: `npm run dev` — runs tsx with Vite middleware for HMR
- **Build**: `npm run build` — runs `script/build.ts` which builds client with Vite and server with esbuild
- **Production**: `npm start` — runs the bundled `dist/index.cjs`
- Server dependencies in an allowlist are bundled to reduce cold start times; others are kept external

### Game Architecture

- The Mahjong deck consists of: numbered suits (Bam, Crak, Dot: 1-9, 4 each), Winds (4 each), Dragons (4 each), 8 Flowers, 8 Jokers — standard American Mahjong set (152 tiles)
- Game phases: "draw" (auto-draws after 500ms), "discard" (player picks a tile to remove), "won" (winning hand detected)
- All game logic (deck generation, shuffling, drawing, discarding, sorting) lives in `client/src/hooks/use-game-logic.ts`
- The `Board` component renders the wall count, discard pile, player hand, action buttons, status bar, and hint panel
- Individual tiles are rendered by the `Tile` component with suit-based color coding
- **Pattern Engine** (`client/src/lib/patterns.ts`): Defines ~21 American MahJong winning patterns (consecutive runs, even/odd patterns, seven pairs, winds & dragons, three triples) across all 3 numbered suits. Supports "any Dragon" and "any Flower" flexible matching plus Joker wildcards.
- **Win Detection**: After each draw, `checkForWin()` verifies if hand (must be exactly 14 tiles) matches any pattern. If so, phase becomes "won" and `WinOverlay` component displays.
- **Hint System** (`client/src/components/HintPanel.tsx`): Shows closest patterns by tiles-away count, expandable detail list
- **Beginner UI**: Status bar with contextual messages, `GameTooltip` component wraps game terms (Wall, Hand, Discard, Mahjong) with hover explanations

## External Dependencies

- **PostgreSQL**: Required database, connected via `DATABASE_URL` environment variable
- **Google Fonts**: DM Sans, Playfair Display, JetBrains Mono, Architects Daughter, Fira Code, Geist Mono loaded via Google Fonts CDN
- **Radix UI**: Extensive set of headless UI primitives for accessible components
- **Framer Motion**: Animation library for tile interactions
- **Drizzle ORM + drizzle-kit**: Database ORM and migration tooling
- **Zod**: Schema validation used across client and server
- **Replit plugins**: `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner` (dev only)