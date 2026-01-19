# Nova Companion

## Overview

Nova Companion is a personal AI companion application that allows users to create, evolve, and interact with customizable AI personas. The app supports multiple AI "versions" with different personalities, rules, and traits that can be cloned and evolved over time. Key features include persistent memory storage, customizable boundaries and rules, conversation management, and configurable AI provider integration (OpenAI, Anthropic, or custom endpoints).

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: React Query for server state, custom hooks for local state
- **Styling**: Tailwind CSS v4 with shadcn/ui component library (New York style)
- **Animations**: Framer Motion for UI transitions
- **Build Tool**: Vite with custom plugins for Replit integration

The frontend follows a page-based structure with shared components. The main app state is managed through the `useNovaState` hook which handles loading/syncing data with the backend.

### Backend Architecture

- **Framework**: Express.js with TypeScript
- **API Pattern**: RESTful JSON API under `/api/*` routes
- **Session Management**: Express-session with cookie-based authentication
- **Password Hashing**: bcrypt with 12 salt rounds
- **Build Output**: ESBuild bundles server to CommonJS for production

The backend serves both the API and static files in production. Development uses Vite's dev server with HMR proxied through Express.

### Data Storage

- **Database**: PostgreSQL with Drizzle ORM
- **Schema Location**: `shared/schema.ts` contains all table definitions
- **Migrations**: Drizzle Kit manages schema with `db:push` command

Core entities:

- `users` - Single admin account with password authentication
- `novaVersions` - AI persona configurations with system prompts, rules, and tone traits
- `conversations` - Chat sessions linked to specific Nova versions
- `messages` - Individual messages within conversations
- `memories` - Persistent knowledge that Nova can reference
- `userSettings` - API configuration and preferences

### Authentication

- Single-user admin model (first user creates account via setup flow)
- Session-based authentication with HTTP-only cookies
- Password requirements: minimum 6 characters
- Protected routes use `requireAuth` middleware

### AI Integration

- Configurable AI provider support (OpenAI, Anthropic, custom)
- API keys stored in user settings
- System prompts and rules shape AI behavior per version
- Streaming responses supported for chat

## External Dependencies

### Database

- **PostgreSQL**: Required, connection via `DATABASE_URL` environment variable
- **Drizzle ORM**: Type-safe database queries and schema management

### AI Providers

- **OpenAI API**: Default provider for chat completions
- **Anthropic API**: Alternative Claude model support
- **Custom Endpoints**: OpenAI-compatible API support

### Key NPM Packages

- `@tanstack/react-query`: Server state management
- `express-session`: Session handling
- `bcrypt`: Password hashing
- `drizzle-orm` / `drizzle-kit`: Database ORM and migrations
- `zod`: Runtime validation
- `framer-motion`: Animations
- `date-fns`: Date formatting
- `uuid`: ID generation

### Replit-Specific

- `@replit/vite-plugin-runtime-error-modal`: Error overlay in development
- `@replit/vite-plugin-cartographer`: Development tooling
- Custom meta images plugin for OpenGraph tags

## Testing

### Running Tests

Run all tests with:
```bash
npx vitest run
```

Run tests in watch mode (re-runs on file changes):
```bash
npx vitest
```

### Test Coverage

The test suite (`server/tests/p3-p4.test.ts`) includes 18 tests:

**P3 IDOR / Ownership Hardening (13 tests)**
- Versions: GET, PATCH, DELETE, and clone operations return 404 for non-owners
- Conversations: GET, PATCH, DELETE operations return 404 for non-owners
- Messages: POST to non-owned conversation returns 404
- Memories: PATCH, DELETE operations return 404 for non-owners
- Backups: DELETE operation returns 404 for non-owners
- Owner access: Verifies owners can access their own resources

**P4 Zod Validation (5 tests)**
- Chat completions endpoint validates messages payload
- Rejects missing messages, empty arrays, and malformed message objects
- Accepts valid message payloads with role and content

### Test Architecture

- **Framework**: Vitest with Supertest for HTTP assertions
- **Session Mocking**: Test middleware injects `req.session.userId` for user isolation
- **Test Data**: Seeded via storage layer (userA owns resources, userB attempts unauthorized access)
- **Assertion Pattern**: Non-owned resources return 404 (not 403) for security obscurity
