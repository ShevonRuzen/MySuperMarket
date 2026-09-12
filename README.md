# MySuperMarket 🛒

> **Multi-Branch Supermarket Management + Numeric-Pad POS System**  
> Built for high-speed retail operations with offline-first POS, mobile barcode scanning, and multi-branch management.

## 🚀 Key Highlights

- **Numeric-Pad & Barcode-First POS**: Operates like an authentic cash register with full keyboard shortcuts (no mouse needed).
- **Offline-First Resilience**: Transactions are cached locally via IndexedDB (Dexie.js) and automatically synchronized when connectivity returns.
- **Built-in Mobile Scanner PWA**: Turn any smartphone into a wireless barcode scanner by scanning a pairing QR code.
- **Multi-Branch Operations**: Centralized master catalog, branch-specific pricing, inter-branch inventory transfers, and real-time owner oversight.
- **PayHere Sandbox Integration**: In-store / online card payment processing with instant verification.
- **Hardware Bridge**: Desktop daemon for thermal ESC/POS receipt printing, cash drawer kickout, and digital weighing scales.

## 🛠️ Monorepo Architecture

- `apps/api`: NestJS 10 REST API + WebSocket server + Prisma ORM
- `apps/pos`: Fast React 18 + Zustand + Dexie.js POS counter application
- `apps/admin`: React 18 + TanStack Query dashboard for Branch Managers & Owners
- `apps/scanner`: Lightweight mobile PWA camera scanner powered by `@zxing/browser`
- `apps/bridge`: Node.js desktop bridge for ESC/POS thermal printers, scales & cash drawers
- `packages/types`: Shared TypeScript entity definitions and DTOs
- `packages/zod-schemas`: Shared validation schemas between client and server

## 🏁 Quick Start

### Prerequisites
- Node.js 20+ LTS
- pnpm (`npm install -g pnpm`)
- Docker Desktop (for PostgreSQL 15 & Redis 7)

### Installation & Launch

1. **Start database and cache containers:**
   ```bash
   docker compose up -d
   ```

2. **Install all dependencies:**
   ```bash
   pnpm install
   ```

3. **Run database migrations:**
   ```bash
   pnpm --filter api db:push
   ```

4. **Start all applications concurrently:**
   ```bash
   pnpm dev
   ```

- **API:** http://localhost:3000 (Swagger: http://localhost:3000/api)
- **Admin Dashboard:** http://localhost:5173
- **POS Terminal:** http://localhost:5174
- **Mobile Scanner:** http://localhost:5555
- **Hardware Bridge:** ws://localhost:17777
