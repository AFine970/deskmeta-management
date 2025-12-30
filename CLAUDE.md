# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**智能换座位系统** - A desktop application for teachers to manage classroom seating arrangements with animation capabilities.

**Tech Stack:**
- Frontend: Vue 3 + TypeScript + Vuetify 3
- Desktop Framework: Tauri
- State Management: Pinia
- Router: Vue Router
- Animation: GSAP
- PDF Export: jsPDF + html2canvas
- Database: In-memory (localStorage-based) - planned migration to SQLite

## Common Development Commands

```bash
# Install dependencies
npm install

# Start development server with Tauri
npm run tauri:dev

# Build production version
npm run tauri:build

# Type checking only
npm run build

# Lint and fix code
npm run lint

# Preview Vite build (without Tauri)
npm run dev
npm run preview
```

## Architecture Overview

### Layered Architecture

```
src/
├── ui/views/              # Vue components (pages)
│   ├── StudentManagement.vue  # Student CRUD interface
│   ├── LayoutDesigner.vue     # Seat layout design
│   ├── SeatFill.vue           # Seat assignment
│   ├── AnimationView.vue      # Animation demo
│   └── Home.vue              # Dashboard
│
├── stores/                # Pinia state management
│   ├── student.ts           # Student store (async actions)
│   ├── layout.ts            # Layout store
│   └── fill.ts              # Seat filling store
│
├── core/                  # Business logic layer
│   ├── student-manager.ts   # Student CRUD + validation
│   ├── seat-manager.ts      # Seat arrangement logic
│   ├── fill-strategies.ts   # Random/manual/mixed filling
│   ├── constraint-engine.ts # Gender/seat constraints
│   └── animation-engine.ts  # GSAP animation orchestration
│
├── repository/            # Data access layer
│   ├── base-repository.ts   # Generic CRUD operations
│   ├── student.repository.ts # Student-specific queries
│   ├── layout.repository.ts
│   └── seating-record.repository.ts
│
├── database/              # Database layer
│   └── connection.ts        # In-memory DB (localStorage)
│
├── types/                 # TypeScript definitions
│   ├── student.ts           # Student interfaces
│   ├── layout.ts            # Layout types
│   ├── fill.ts              # Seat filling types
│   └── index.ts             # Type exports
│
├── utils/                 # Utility functions
│   ├── helpers.ts           # CSV parsing, file download
│   ├── exporters.ts         # PDF export utilities
│   └── validators.ts        # Data validation
│
└── router/                # Vue Router
    └── index.ts            # Route configuration
```

### Key Data Flow

1. **UI Component** → **Pinia Store** → **Core Manager** → **Repository** → **Database**
2. **Database** → **Repository** → **Core Manager** → **Pinia Store** → **UI Component** (reactive)

### Database Layer

The current implementation uses **localStorage** as an in-memory database:
- `seating-system-db` key in localStorage
- Tables: `students`, `layout_configs`, `seating_records`, `app_settings`
- All operations are synchronous after initialization
- Auto-saves on every write operation

### Student Management Flow

**Add Student:**
```
StudentManagement.vue:saveStudent()
  → studentStore.addStudent(data)
    → studentManager.addStudent(data)
      → studentRepository.isNameUnique() [validation]
      → studentRepository.insert(data)
        → database.insert() + save to localStorage
  → studentStore.students.push(student) [local state update]
```

**Delete Student:**
```
StudentManagement.vue:deleteStudent()
  → studentStore.deleteStudent(id)
    → studentManager.deleteStudent(id)
      → studentRepository.delete(id)
        → database.delete() + save to localStorage
  → studentStore.students = filter(s => s.id !== id) [local state update]
```

## Critical Files

### Student Management
- **View**: `src/ui/views/StudentManagement.vue` (246 lines)
- **Store**: `src/stores/student.ts` (144 lines)
- **Manager**: `src/core/student-manager.ts` (250 lines)
- **Repository**: `src/repository/student.repository.ts` (135 lines)
- **Types**: `src/types/student.ts` (72 lines)

### Database
- **Connection**: `src/database/connection.ts` (181 lines)
- **Base Repository**: `src/repository/base-repository.ts` (82 lines)

## Known Issues (from user report)

1. **List not refreshing after add/delete**: The store updates local state but `filteredStudents` computed property may not be reactive
2. **Duplicate names allowed**: Name uniqueness validation exists but may not be enforced properly

## Development Notes

### Adding New Features
1. Define types in `src/types/`
2. Implement business logic in `src/core/`
3. Create repository methods in `src/repository/`
4. Add store actions in `src/stores/`
5. Build UI in `src/ui/views/`

### Testing Approach
- Currently no test framework configured
- Manual testing via `npm run tauri:dev`
- Browser dev tools available at http://localhost:1420

### State Management Pattern
Pinia stores use **Composition API** style:
```typescript
export const useStore = defineStore('name', () => {
  const state = ref(...)
  const computed = computed(...)
  const action = async (...) => { ... }
  return { state, computed, action }
})
```

### Database Migration Path
Current: localStorage (in-memory)
Target: SQLite via Tauri's SQL plugin
- Add `@tauri-apps/api/sql` dependency
- Update `src/database/connection.ts`
- Migrate data on first run

## Project Structure Notes

- **No build tool config in root**: Uses Vite (configured in `package.json`)
- **Tauri config**: `src-tauri/tauri.conf.json`
- **Rust backend**: `src-tauri/` (currently minimal, mostly frontend-focused)
- **No test files**: Consider adding Vitest for unit tests
- **No CI/CD**: Manual builds only

## Important Dependencies

```json
{
  "vue": "^3.5.13",
  "pinia": "^2.2.8",
  "vuetify": "^3.7.6",
  "gsap": "^3.12.7",
  "tauri": "^1.6.3"
}
```

## Code Style

- **Language**: TypeScript strict mode
- **Format**: ESLint + Prettier (via `npm run lint`)
- **Imports**: Relative paths, no aliases configured
- **Naming**: camelCase for functions/variables, PascalCase for components/types
- **Async**: Always use `async/await` for database operations

## Quick Debug Commands

```bash
# Check current students in localStorage
# Open browser console at http://localhost:1420
JSON.parse(localStorage.getItem('seating-system-db'))?.students

# Clear all data
localStorage.removeItem('seating-system-db')
location.reload()
```
