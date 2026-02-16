# Mahjong Tile Game

## Overview

This is a real-time 4-player multiplayer American Mahjong tile game. Players create or join game rooms via 6-character codes, and the game features turn-based play (East->South->West->North), synchronized game state via Socket.io, win detection with multiple valid patterns, beginner-friendly hints, and customizable tile display styles.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend (React + Vite)

- **Framework**: React with TypeScript, bundled by Vite
- **Routing**: `wouter` for lightweight client-side routing (single page at `/` for the game)
- **State Management**: Game state is server-authoritative, synchronized via Socket.io. Client uses `useMultiplayerGame` hook for real-time state management. TanStack React Query is available for additional data fetching.
- **UI Components**: shadcn/ui component library (new-york style) built on Radix UI primitives with Tailwind CSS
- **Animations**: Framer Motion for tile movement and interactions
- **Styling**: Tailwind CSS with CSS variables for theming. The theme uses a green felt color palette. Custom fonts: DM Sans (body), Playfair Display (display), JetBrains Mono (mono).
- **Path aliases**: `@/` maps to `client/src/`, `@shared/` maps to `shared/`, `@assets/` maps to `attached_assets/`

### Backend (Express 5 + Socket.io)

- **Runtime**: Node.js with Express 5, written in TypeScript, run via `tsx`
- **Socket.io**: Real-time multiplayer via `server/socket.ts` - handles room creation/joining, turn management, game state broadcasting
- **Game Engine**: `server/game-engine.ts` - server-authoritative game logic (deck, dealing, drawing, discarding, win detection)
- **API Design**: REST API via `shared/routes.ts` + Socket.io events defined in `shared/schema.ts`
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

- The Mahjong deck consists of: numbered suits (Bam, Crak, Dot: 1-9, 4 each), Winds (4 each), Dragons (4 each), 4 named Flowers (Plum, Orchid, Chrysanthemum, Bamboo), 4 Seasons (Spring, Summer, Fall, Winter), 8 Jokers — standard American Mahjong set (152 tiles)
- Game phases: "draw" (player clicks Draw button), "discard" (player picks a tile to remove), "won" (winning hand detected)
- Server-side game logic (deck generation, shuffling, drawing, discarding, sorting) lives in `server/game-engine.ts`
- The `MultiplayerBoard` component renders the wall count, other players' info, discard pile, player hand, action buttons, status bar, and hint panel
- The `Board` component (legacy single-player) is still available
- Individual tiles are rendered by the `Tile` component with suit-based color coding
- **Pattern Engine** (`client/src/lib/patterns.ts`): Defines ~21 American MahJong winning patterns (consecutive runs, even/odd patterns, seven pairs, winds & dragons, three triples) across all 3 numbered suits. Supports "any Dragon" and "any Flower" flexible matching plus Joker wildcards.
- **Win Detection**: After each draw, `checkForWin()` verifies if hand (must be exactly 14 tiles) matches any pattern. If so, phase becomes "won" and `WinOverlay` component displays.
- **Hint System** (`client/src/components/HintPanel.tsx`): Shows closest patterns by tiles-away count, expandable detail list
- **Beginner UI**: Status bar with contextual messages, `GameTooltip` component wraps game terms (Wall, Hand, Discard, Mahjong) with hover explanations
- **Reconnection System**: When a player disconnects mid-game, their seat is reserved for 60 seconds. A rejoin token (per-player, generated at game start) is stored in sessionStorage. On page refresh, the client auto-attempts rejoin using the token. Other players see a "Waiting for [name] to reconnect..." banner with countdown. After 60s timeout, a dialog offers "End Game" or "Keep Waiting" options. Server-authoritative: the `game:ended` event clears all client state.

## External Dependencies

- **PostgreSQL**: Required database, connected via `DATABASE_URL` environment variable
- **Google Fonts**: DM Sans, Playfair Display, JetBrains Mono, Architects Daughter, Fira Code, Geist Mono loaded via Google Fonts CDN
- **Radix UI**: Extensive set of headless UI primitives for accessible components
- **Framer Motion**: Animation library for tile interactions
- **Drizzle ORM + drizzle-kit**: Database ORM and migration tooling
- **Zod**: Schema validation used across client and server
- **Replit plugins**: `@replit/vite-plugin-runtime-error-modal`, `@replit/vite-plugin-cartographer`, `@replit/vite-plugin-dev-banner` (dev only)