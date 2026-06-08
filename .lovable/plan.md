## Anthology — a private journaling app

A quiet, writerly notes app to replace personal Notion use. Manual folder tree on the left, blank-canvas editor on the right, with markdown shortcuts and a small "+" modal to add pages and folders.

## Scope

**In:**
- Sign-up / sign-in (email + password) so notes are private to the user account
- Sidebar tree with arbitrarily nested folders and pages (fully manual — no auto date structure)
- Blank-page editor with title + body
- Markdown shortcuts: `# / ## / ###` headings, `-` and `1.` lists, `[ ]` checkboxes, `---` horizontal divider
- "+" modal to create a new page or folder (optionally inside the currently selected folder)
- Light / dark theme toggle (Modernist Ledger palette — paper / ink / muted sage accent, Instrument Serif + Inter)
- Auto-save as you type
- Rename / delete folders and pages, drag-and-drop into other folders

**Out (per request):**
- No collaboration, comments, sharing, AI assistants, tags, search filters, analytics
- No auto-generated year/month/week/day folders
- No mobile-specific layout beyond a responsive sidebar collapse

## Visual direction

Exact tokens from "The Modernist Ledger" prototype, ported verbatim:
- Light: `--paper #F9F8F6`, `--ink #1A1A1A`, `--border #E5E2DD`, `--accent #6B705C`
- Dark: derived from the same palette (deep ink background, paper-tone foreground, accent kept)
- Fonts: Instrument Serif (display, italic for titles/H2), Inter (body/UI), loaded via `<link>` in `__root.tsx`
- Sidebar with serif italic "Anthology" wordmark, breadcrumb top bar, centered max-w-2xl article column with serif italic title and generous vertical rhythm
- Floating "+" affordance bottom-right of the editor opens a small popover menu (New Page / New Folder)

## Storage

Lovable Cloud, one user → one private library. Notes never visible to anyone else.

Tables (all RLS-enabled, scoped to `auth.uid()`):
- `folders` — `id, user_id, parent_id (nullable, FK folders), name, position, created_at, updated_at`
- `pages` — `id, user_id, folder_id (nullable, FK folders), title, body (text), position, created_at, updated_at`

Both tables get the standard grants pattern (`authenticated` CRUD, `service_role` all).

## Route structure

```text
src/routes/
  __root.tsx               head: fonts + meta, theme provider
  index.tsx                public landing → redirects to /auth or /app
  auth.tsx                 sign-in / sign-up (email + password)
  _authenticated/
    route.tsx              integration-managed gate (already present)
    app.tsx                layout: sidebar + outlet
    app.index.tsx          empty-state ("Select or create a page")
    app.page.$pageId.tsx   editor for a single page
```

## Components

- `AppSidebar` — recursive folder/page tree, expand/collapse, active highlight, footer with user email + sign-out
- `TreeNode` — recursive renderer for a folder or page row
- `NewItemMenu` — floating "+" popover (New Page / New Folder), prompts for name + parent folder
- `PageEditor` — title input + markdown-aware textarea/contenteditable
- `MarkdownRenderer` — renders body live (split-pane style isn't needed; we render in place: lines beginning with `#`, `-`, `1.`, `[ ]`, or exactly `---` are transformed inline on render, while raw text remains editable). Implementation: a single contentEditable surface using a lightweight transform pipeline — no heavy editor library — keeping the "just text" feel.
- `ThemeToggle` — toggles `.dark` on `<html>`, persisted in `localStorage`

## Server functions (createServerFn + requireSupabaseAuth)

- `listLibrary()` → all folders + pages for the user (single round-trip)
- `createFolder({ name, parentId })`
- `renameFolder({ id, name })`, `deleteFolder({ id })`
- `moveFolder({ id, parentId })`
- `createPage({ title, folderId })`
- `getPage({ id })`
- `updatePage({ id, title?, body? })` (debounced from client for auto-save)
- `deletePage({ id })`, `movePage({ id, folderId })`

All called via `useServerFn` + TanStack Query; mutations invalidate `['library']` and the affected `['page', id]`.

## Markdown behavior (matching user's spec)

Per-line transforms applied on render and on Enter:
- `# ` → H1, `## ` → H2, `### ` → H3
- `- ` → bullet item
- `1. ` (any digit) → ordered item
- `[ ] ` → unchecked checkbox, `[x] ` → checked
- A line containing exactly `---` → renders as `<hr>` divider

Inline bold/italic intentionally not included (user did not pick them).

## Technical notes

- Tailwind v4 tokens defined in `src/styles.css` under `@theme` and `:root` / `.dark`
- Fonts loaded via `<link>` in `__root.tsx` head; never `@import` URLs in CSS
- Auto-save: debounce 600ms in `PageEditor`, optimistic update of cached page
- Sign-out hygiene: cancel queries → clear cache → `supabase.auth.signOut()` → `navigate('/auth', replace)`
- No edge functions; no admin client in client-reachable code

## Build order

1. Enable Lovable Cloud, configure email/password auth
2. Migration: `folders`, `pages` with RLS + grants
3. Theme tokens in `src/styles.css`, fonts in `__root.tsx`
4. `/auth` route (email + password)
5. `_authenticated/app` shell with `AppSidebar`
6. Server functions + TanStack Query hooks
7. `PageEditor` with markdown transforms + auto-save
8. New Page / New Folder modal, rename, delete
9. Theme toggle + empty state polish
