# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

AbacusHub is a Next.js 14 productivity application for task and file management. It uses TypeScript, Prisma ORM with SQLite/PostgreSQL, NextAuth for authentication, and provides comprehensive workspace management features.

## Current Sprint (KW 27, 2025)

### Active Development
- [x] Session timeout handling implemented
- [x] Chunked file upload with resume capability
- [ ] Complete file upload error recovery system
- [ ] Configure static file serving via API
- [ ] Integrate upload with notification system
- [ ] Create comprehensive upload API documentation

### Technical Decisions
- **File Serving**: API-based with authentication (not public directory)
- **Max File Size**: 500MB limit
- **Storage**: Local filesystem first, S3-compatible architecture prepared
- **Virus Scanning**: Deferred to later phase

## Development Commands

```bash
# Install dependencies
npm install

# Development server (http://localhost:3000)
npm run dev

# Build for production
npm run build

# Start production server
npm run start

# Lint code
npm run lint

# Database commands
npx prisma generate       # Generate Prisma client
npx prisma db push       # Push schema changes
npx prisma migrate dev   # Create migration
npx prisma db seed      # Seed with demo data (john@doe.com / johndoe123)
npx prisma studio       # Open database GUI
```

## Architecture

### Directory Structure
- `app/` - Next.js App Router pages and API routes
  - `api/` - REST endpoints for all features
  - `dashboard/` - Protected pages (files, tasks, workspaces)
  - `login/` - Authentication page
- `components/` - React components
  - `ui/` - shadcn/ui components (40+ components)
  - `dashboard/` - Dashboard-specific components
  - `providers/` - Context providers
- `lib/` - Utilities, auth config, database client
- `hooks/` - Custom React hooks
- `prisma/` - Database schema and migrations
- `docs/` - Architecture and API documentation

### Key Technologies
- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Prisma ORM
- **Database**: SQLite (dev) / PostgreSQL (prod)
- **Auth**: NextAuth.js with database sessions
- **UI**: shadcn/ui (Radix UI based components)
- **File Upload**: Chunked uploads with resume capability

### API Structure
All API routes follow RESTful patterns:
- `/api/auth/*` - NextAuth endpoints
- `/api/workspaces` - Workspace CRUD operations
- `/api/tasks` - Task management
- `/api/files` - File upload/management
- `/api/upload` - Chunked file upload endpoint
- `/api/comments` - Comments on tasks/files
- `/api/events/*` - Real-time SSE endpoints
- `/api/settings/*` - User settings management

### Database Models
Main entities (see `prisma/schema.prisma`):
- `User` - Authentication and profiles
- `Workspace` - Multi-tenant workspaces
- `Task` - Tasks with status, priority, assignments
- `File` - Files with tagging system
- `Folder` - Hierarchical file organization

### Authentication
- Email/password and OAuth support
- Protected routes under `/dashboard/*`
- Role-based access: USER/ADMIN system roles
- Workspace roles: OWNER, ADMIN, MEMBER, VIEWER
- Session timeout handling with warnings

### File Upload System
- **Chunked uploads**: 1MB chunks by default
- **Resume capability**: Metadata tracking for partial uploads
- **Error recovery**: Automatic retry with exponential backoff
- **Storage abstraction**: Prepared for S3/MinIO migration
- **Security**: API-based serving with authentication

## Architecture Decisions Record (ADR)

- **ADR-001**: Chunked uploads with 1MB default chunk size
- **ADR-002**: Server-side session management with timeout
- **ADR-003**: Event-driven notifications via Server-Sent Events (SSE)
- **ADR-004**: API-based file serving for security
- **ADR-005**: S3-compatible storage abstraction layer

## Environment Setup

Create `.env.local` from the template:
```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="your-secret-here"
NEXTAUTH_URL="http://localhost:3000"

# File Upload Configuration
MAX_FILE_SIZE=524288000  # 500MB
MAX_CHUNK_SIZE=5242880   # 5MB
MIN_CHUNK_SIZE=1048576   # 1MB
```

## Common Tasks

### Adding a new API endpoint
1. Create route in `app/api/[resource]/route.ts`
2. Use `lib/auth.ts` for session validation
3. Use `lib/db.ts` for database access
4. Follow existing patterns for error handling

### Adding UI components
1. Use shadcn/ui components from `components/ui/`
2. Install new shadcn components: `npx shadcn-ui@latest add [component]`
3. Create feature components in `components/dashboard/`

### Working with the database
1. Update schema in `prisma/schema.prisma`
2. Run `npx prisma generate` to update client
3. Run `npx prisma db push` for development
4. Create migration for production: `npx prisma migrate dev`

### Implementing file uploads
1. Use `hooks/use-file-upload.ts` for client-side logic
2. Configure chunk size based on file size and network
3. Handle errors with retry logic
4. Update progress in real-time

### Form handling
- Use React Hook Form with Zod validation
- See existing patterns in dashboard components
- Client-side validation with `zod` schemas

## Code Patterns

### API Route Pattern
```typescript
// Check authentication
const session = await getServerSession(authOptions);
if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

// Validate request
const body = await request.json();
// Process with try/catch
// Return consistent error responses
```

### Component Pattern
- Use TypeScript interfaces for props
- Implement loading and error states
- Use shadcn/ui components for consistency
- Follow existing naming conventions

### State Management
- Use React hooks for local state
- SWR or Tanstack Query for server state
- Context API for global app state (theme, session)

### File Upload Pattern
```typescript
// Client-side
const { upload, progress, error } = useFileUpload({
  onComplete: (file) => console.log('Uploaded:', file),
  onError: (err) => console.error('Upload failed:', err)
});

// Server-side
if (action === "chunk") {
  // Handle chunk upload
} else if (action === "complete") {
  // Assemble chunks and save file
}
```

## Performance Targets
- Initial page load: < 3s
- File upload speed: > 10MB/s
- API response time: < 200ms (p95)
- Session check: < 50ms

## Technical Debt
- [ ] Complete migration from pages to app router
- [ ] Implement comprehensive error boundaries
- [ ] Add structured logging system
- [ ] Setup monitoring (Sentry/DataDog)
- [ ] Add comprehensive E2E tests
- [ ] Implement file preview generation

## Current Known Issues
- Browser console shows GCM registration errors (can be ignored)
- Large file uploads may timeout on slow connections
- PDF preview not yet implemented