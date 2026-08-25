# Secure-FEPRH: Super Master Frontend Implementation Plan

> [!IMPORTANT]
> This plan covers **every page, component, animation, and transition** for the entire frontend. It is based on detailed analysis of all 18 mockup images and the existing backend API contracts. The frontend is an **independent project** that communicates with the backend solely via REST APIs and WebSockets.

---

## Visual Design System (Extracted from Mockups)

### Color Palette

| Token | Dark Mode | Light Mode | Usage |
|---|---|---|---|
| `bg-primary` | `#0f172a` (slate-900) | `#f8fafc` (gray-50) | Page background |
| `bg-surface` | `#1e293b` (slate-800) | `#ffffff` (white) | Cards, sidebar, header |
| `bg-surface-hover` | `#334155` (slate-700) | `#f1f5f9` (slate-100) | Hover states |
| `bg-input` | `rgba(30,41,59,0.5)` | `#ffffff` | Input fields |
| `accent-primary` | `#4f46e5` → `#3b82f6` | `#4f46e5` → `#3b82f6` | Indigo-to-blue gradient |
| `accent-danger` | `#ef4444` → `#f97316` | `#ef4444` → `#f97316` | Red-to-orange gradient |
| `accent-success` | `#22c55e` | `#16a34a` | Green badges, verifications |
| `accent-warning` | `#f59e0b` | `#d97706` | Yellow/amber badges |
| `text-primary` | `#ffffff` | `#111827` (gray-900) | Headings, body |
| `text-secondary` | `#9ca3af` (gray-400) | `#6b7280` (gray-500) | Subtitles, labels |
| `text-muted` | `#6b7280` (gray-500) | `#9ca3af` (gray-400) | Hints, notes |
| `border` | `rgba(51,65,85,0.5)` | `#e5e7eb` (gray-200) | Card borders, dividers |

### Typography (Inter Font)

| Element | Size | Weight | Line Height |
|---|---|---|---|
| Page Title | 24px / `text-2xl` | Bold (700) | 1.2 |
| Card Title | 18px / `text-lg` | Semibold (600) | 1.4 |
| Body Text | 14px / `text-sm` | Normal (400) | 1.5 |
| Subtitle | 14px / `text-sm` | Medium (500) | 1.5 |
| Badge Text | 12px / `text-xs` | Semibold (600) | 1 |
| Small/Note | 12px / `text-xs` | Normal (400) | 1.4 |
| Stat Number | 36px / `text-4xl` | Bold (700) | 1.1 |

### Component Tokens

| Element | Dark Mode | Light Mode |
|---|---|---|
| Card | `bg-slate-800`, `border-slate-700/50`, `rounded-2xl` | `bg-white`, `border-gray-200`, `rounded-2xl`, `shadow-sm` |
| Button Primary | `bg-gradient-to-r from-indigo-600 to-blue-500`, `rounded-xl` | Same |
| Button Danger | `bg-gradient-to-r from-red-500 to-orange-500`, `rounded-xl` | Same |
| Button Outline | `border-slate-600`, `text-gray-200`, `rounded-xl` | `border-gray-300`, `text-gray-700` |
| Input Field | `bg-slate-800/50`, `border-slate-600`, `rounded-xl`, `py-3 pl-10` | `bg-white`, `border-gray-300` |
| Sidebar | `w-64`, `bg-slate-800` | `w-64`, `bg-white`, `border-r border-gray-200` |
| Active Nav | `bg-indigo-600`, `text-white`, `rounded-xl` | Same |
| Badge (Status) | Various color pills: `rounded-full`, `px-3 py-1`, `text-xs font-semibold` | Same |

---

## Architecture Overview

```
frontend/src/
├── main.jsx                    # Entry point (ThemeProvider → AuthProvider → App)
├── App.jsx                     # Router definition
├── index.css                   # Global styles, Tailwind directives, custom animations
│
├── lib/
│   ├── api.js                  # Axios instance with JWT interceptors (EXISTS)
│   └── constants.js            # [NEW] Role enums, status colors, nav items
│
├── context/
│   ├── AuthContext.jsx          # JWT auth state (EXISTS)
│   └── ThemeContext.jsx         # Dark/Light/System toggle (EXISTS)
│
├── hooks/
│   ├── usePageTitle.js          # [NEW] Dynamic document title
│   └── useWebSocket.js         # [NEW] Kanban WebSocket hook
│
├── layouts/
│   └── DashboardLayout.jsx      # Sidebar + Header + Outlet (EXISTS, MODIFY)
│
├── components/
│   ├── ThemeToggle.jsx          # Sun/Moon toggle (EXISTS)
│   ├── ui/
│   │   ├── Badge.jsx            # [NEW] Reusable status/role badge
│   │   ├── Card.jsx             # [NEW] Glassmorphism & standard card
│   │   ├── DataTable.jsx        # [NEW] Sortable table with pagination
│   │   ├── DropdownSelect.jsx   # [NEW] Styled select/dropdown
│   │   ├── EmptyState.jsx       # [NEW] Empty data placeholder
│   │   ├── GaugeChart.jsx       # [NEW] Circular gauge for plagiarism %
│   │   ├── LoadingSpinner.jsx   # [NEW] Branded spinner
│   │   ├── Modal.jsx            # [NEW] Overlay modal
│   │   ├── SearchInput.jsx      # [NEW] Search with icon
│   │   ├── StatCard.jsx         # [NEW] Dashboard stat card
│   │   ├── Stepper.jsx          # [NEW] Multi-step registration stepper
│   │   └── TabNav.jsx           # [NEW] Tab navigation bar
│   ├── sidebar/
│   │   └── NavItem.jsx          # [NEW] Sidebar nav item with active state
│   └── charts/
│       ├── DonutChart.jsx       # [NEW] Projects by Status
│       └── BarChart.jsx         # [NEW] Projects by Domain
│
├── pages/
│   ├── Login.jsx                # (EXISTS, POLISH)
│   ├── Register.jsx             # [NEW] Multi-step registration
│   ├── DashboardHome.jsx        # (EXISTS, REWRITE)
│   ├── ProjectsList.jsx         # [NEW]
│   ├── ProjectDetail.jsx        # [NEW]
│   ├── KanbanBoard.jsx          # [NEW]
│   ├── SecureRepository.jsx     # [NEW]
│   ├── PlagiarismScanner.jsx    # [NEW]
│   ├── FaceAttendance.jsx       # [NEW] Student clock-in
│   ├── MeetingManagement.jsx    # [NEW] Supervisor meetings
│   ├── UserManagement.jsx       # [NEW] Admin user table
│   ├── UserProfile.jsx          # [NEW] Profile + settings
│   ├── NotFound.jsx             # [NEW] 404 page
│   └── SplashScreen.jsx         # [NEW] Loading splash
│
└── assets/                      # Static assets
```

---

## Animation Master Specification

> [!TIP]
> Every animation uses **Framer Motion** (already installed). All animations are designed to feel premium and intentional — never jarring. The principle: **enter smoothly, interact responsively, exit gracefully**.

### Global Animation Variants

```javascript
// Page transition — used on every route change
export const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } }
};

// Stagger children — used for card grids, table rows, nav items
export const staggerContainer = {
  animate: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } }
};

export const staggerItem = {
  initial: { opacity: 0, y: 15 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } }
};

// Scale on hover — used for cards, buttons
export const hoverScale = {
  whileHover: { scale: 1.02, transition: { duration: 0.2 } },
  whileTap: { scale: 0.98 }
};

// Slide-in from left — sidebar items
export const slideInLeft = {
  initial: { opacity: 0, x: -20 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3 } }
};
```

### Per-Page Animation Specification

| Page | Animation | Details |
|---|---|---|
| **Splash Screen** | Shield icon pulse + progress bar | `animate={{ scale: [1, 1.05, 1] }}` loop, indigo `box-shadow` glow pulse. Progress bar uses `motion.div` width transition from 0% → 100% over 2s. |
| **Login** | Card fade-up + blob float | Card: `initial={{ opacity: 0, y: 20 }}`. Decorative blurred circles: `animate={{ x: [0, 20, 0], y: [0, -15, 0] }}` with `duration: 8s`, `repeat: Infinity`. Button: `whileHover={{ translateY: -2 }}`. |
| **Registration** | Step slide transition + stepper progress | Each step content: `AnimatePresence mode="wait"` with slide direction based on step change (forward = slide left, backward = slide right). Stepper line: `motion.div` with animated `width` based on current step %. |
| **Dashboard** | Stat cards stagger + counter animate | 4 stat cards: `staggerChildren: 0.12`. Each number: `useMotionValue` + `useTransform` to count up from 0 to target value over 1.2s. Charts: fade-in with 0.4s delay after stat cards finish. |
| **Projects List** | Card grid stagger + filter slide | Cards: 6-item stagger with `staggerChildren: 0.06`. On filter change: `AnimatePresence` with `layout` prop for smooth reflow. Hover on cards: `scale: 1.02`, subtle `boxShadow` increase. |
| **Project Detail** | Tab content crossfade | Tab switch: `AnimatePresence mode="wait"`, outgoing tab fades down, incoming fades up. Team member rows stagger in. |
| **Kanban Board** | Drag-and-drop + card reorder | `@hello-pangea/dnd` handles drag. On drop: `layoutId` animation for smooth card repositioning. New tasks: slide-in from top. Column headers: subtle pulse when card count changes. |
| **Repository** | Upload zone pulse + file row stagger | Upload zone: `whileHover={{ borderColor: '#4f46e5', scale: 1.01 }}`. Successful upload: new row slides in from top with green flash. Delete: row slides out left with fade. |
| **Plagiarism Scanner** | Gauge sweep + table row stagger | Circular gauge: `motion.circle` with `pathLength` animation from 0 → target over 1.5s. "FLAGGED" rows: subtle red background pulse animation. Scan button: `animate={{ scale: [1, 1.03, 1] }}` pulse while scanning. |
| **Face Attendance** | Webcam frame glow + success reveal | Webcam border: pulsing indigo glow `boxShadow` animation. Success card: `initial={{ opacity: 0, scale: 0.9, y: 20 }}`, `animate={{ opacity: 1, scale: 1, y: 0 }}` with spring physics. |
| **Meeting Management** | Row expand/collapse + sub-table stagger | Expand: `AnimatePresence` with `initial={{ height: 0, opacity: 0 }}`, `animate={{ height: 'auto', opacity: 1 }}`. Sub-table rows: staggered fade-in. |
| **User Management** | Table row stagger + toggle switch | Rows stagger in on page load. Status toggle: `motion.div` with `layout` prop for smooth knob slide. Edit button: `whileHover={{ rotate: 15 }}`. |
| **Profile** | Profile card slide-down + settings grid stagger | Profile card: `initial={{ opacity: 0, y: -20 }}`. Settings cards: 2x2 grid with `staggerChildren: 0.1`. Appearance selector: `layoutId="active-theme"` for smooth highlight move. |
| **404 Page** | Number scale-in + shield float | "404" text: `initial={{ scale: 0.5, opacity: 0 }}`, `animate={{ scale: 1, opacity: 1 }}` with spring. Shield watermark: slow continuous float `animate={{ y: [0, -8, 0] }}`, `duration: 4s`. Button: hover translate-y. |

### Micro-Interactions (Applied Globally)

| Interaction | Animation | Applies To |
|---|---|---|
| Button hover | `translateY: -2px`, `boxShadow` increase | All primary/gradient buttons |
| Button press | `scale: 0.97` | All buttons |
| Card hover | `scale: 1.02`, border glow | Project cards, stat cards |
| Nav item hover | `background-color` fade over 200ms | Sidebar items |
| Input focus | Ring glow `ring-2 ring-indigo-500` with 200ms transition | All inputs |
| Badge appear | `initial={{ scale: 0 }}`, `animate={{ scale: 1 }}` spring | Status badges |
| Toast notification | Slide in from top-right, auto-dismiss after 4s | Success/error toasts |
| Theme toggle | Sun/Moon icon: `rotate: 180deg` + crossfade | ThemeToggle component |
| Loading states | Skeleton shimmer + pulse overlay | All data-fetching pages |
| Sidebar collapse (mobile) | `x: -256` → `x: 0` slide with backdrop fade | DashboardLayout |

---

## Implementation Phases

### Phase 1: Foundation & Design System (Estimated: ~2 hours)

#### [MODIFY] [index.css](file:///d:/Graduation%20Project/Secure-FEPRH-App/frontend/src/index.css)
- Add `@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap')`
- Define CSS custom properties for all color tokens
- Add `@keyframes blob` for floating decorative circles
- Add `@keyframes shimmer` for skeleton loading
- Add `@keyframes glow-pulse` for the shield icon glow
- Custom scrollbar styles (dark theme)
- `.glassmorphism` utility class

#### [MODIFY] [tailwind.config.js](file:///d:/Graduation%20Project/Secure-FEPRH-App/frontend/tailwind.config.js)
- Extend `fontFamily` with `Inter`
- Extend `animation` with `blob`, `shimmer`, `glow-pulse`
- Extend `backdropBlur` values
- Add keyframe definitions

#### [NEW] `src/lib/constants.js`
- Navigation items with icons, labels, paths, required roles
- Status color map (e.g., `{ proposed: 'bg-gray-500', approved: 'bg-blue-500', in_progress: 'bg-amber-500', completed: 'bg-green-500', archived: 'bg-purple-500' }`)
- Domain color map
- Role badge color map
- Animation variants (as shown above)

#### [NEW] `src/lib/animations.js`
- All shared Framer Motion variants exported

---

### Phase 2: Reusable UI Components (Estimated: ~3 hours)

All components in `src/components/ui/`:

| Component | Key Props | Description |
|---|---|---|
| `Badge.jsx` | `variant`, `children`, `dot` | Colored pill badge with optional status dot |
| `Card.jsx` | `glass`, `hover`, `className` | Standard or glassmorphism card with optional hover effect |
| `StatCard.jsx` | `title`, `value`, `icon`, `gradient`, `trend` | Dashboard metric card with gradient icon area and count-up animation |
| `DataTable.jsx` | `columns`, `data`, `pagination`, `onRowClick` | Sortable, paginated table with row stagger animation |
| `DropdownSelect.jsx` | `options`, `value`, `onChange`, `icon`, `placeholder` | Styled dropdown with search |
| `SearchInput.jsx` | `value`, `onChange`, `placeholder` | Dark-styled search input with magnifying glass icon |
| `GaugeChart.jsx` | `value`, `max`, `color`, `label` | SVG circular gauge with animated `pathLength` |
| `Modal.jsx` | `isOpen`, `onClose`, `title`, `children` | Overlay modal with backdrop blur and scale-in animation |
| `Stepper.jsx` | `steps`, `currentStep` | Horizontal multi-step indicator with animated line |
| `TabNav.jsx` | `tabs`, `activeTab`, `onTabChange` | Horizontal tab bar with underline animation (`layoutId`) |
| `LoadingSpinner.jsx` | `size`, `fullScreen` | Branded loading spinner (shield icon rotating) |
| `EmptyState.jsx` | `icon`, `title`, `description`, `action` | Empty data placeholder |

#### Charts (`src/components/charts/`)

| Component | Library | Description |
|---|---|---|
| `DonutChart.jsx` | CSS conic-gradient + motion | Animated donut with legend for project statuses |
| `BarChart.jsx` | CSS + motion | Animated horizontal bars for domains |

> [!NOTE]
> Using pure CSS + Framer Motion for charts instead of Chart.js to avoid an extra dependency. The mockups show simple charts that don't need a charting library.

---

### Phase 3: Layout Shell (Estimated: ~2 hours)

#### [MODIFY] [DashboardLayout.jsx](file:///d:/Graduation%20Project/Secure-FEPRH-App/frontend/src/layouts/DashboardLayout.jsx)
**Major rewrite** to match mockups:
- **Sidebar**: Full navigation items from `constants.js`, role-based visibility, user info block at bottom with avatar initials + email + role badge + Sign Out button. Active item: `bg-indigo-600 text-white rounded-xl`. Mobile: slide-in drawer with backdrop.
- **Header**: Dynamic page title (from route), notification bell icon, theme toggle, user avatar. Breadcrumb on project detail pages.
- **Content Area**: `AnimatePresence` wrapping `<Outlet>` for page transitions.
- **Mobile hamburger**: Slide-in sidebar overlay for screens < `md`.

#### [NEW] `src/components/sidebar/NavItem.jsx`
- Receives `icon`, `label`, `path`, `isActive`
- Hover: subtle background fade
- Active: indigo-600 bg with slight left border accent
- `motion.div` with `whileHover` and `whileTap`

---

### Phase 4: Auth Pages (Estimated: ~3 hours)

#### [MODIFY] [Login.jsx](file:///d:/Graduation%20Project/Secure-FEPRH-App/frontend/src/pages/Login.jsx)
- Polish to exactly match mockups (dark/light mode)
- Add animated decorative blurred circles with `animate-blob`
- Theme toggle button (top-right corner)
- Glassmorphism card with `backdrop-blur-xl`
- Error shake animation on failed login
- "Register" link at bottom

#### [NEW] `src/pages/Register.jsx`
- 3-step form: **Personal Info** → **Affiliation** → **Face Registration**
- `Stepper` component at top with animated progress line
- Step transitions via `AnimatePresence` with directional slides
- Step 2: Cascading dropdowns (University → Faculty → Department) + role radio cards
- Step 3: `react-webcam` integration for face capture with face outline guide overlay
- API calls: `POST /auth/register` (to be created or extended)

#### [NEW] `src/pages/SplashScreen.jsx`
- Full-screen dark background
- Shield icon with pulsing indigo glow (`box-shadow` animation)
- "Secure-FEPRH" title + "National Command Center" subtitle
- Animated progress bar (indigo gradient, 0% → 100% over 2s)
- Auto-redirect to Login after loading completes

---

### Phase 5: Dashboard & Analytics (Estimated: ~3 hours)

#### [REWRITE] `src/pages/DashboardHome.jsx`
- **Role badge**: "Ministry Admin — National View" pill at top
- **4 Stat Cards row**: Each with gradient icon container, count-up animation, staggered entrance
  - Total Active Projects (blue gradient)
  - Plagiarism Alerts (red/orange gradient)  
  - Avg. Attendance Rate (green gradient)
  - System Health (teal gradient)
- **2-column chart grid**:
  - Donut chart: Projects by Status (Proposed, Approved, In Progress, Completed, Archived)
  - Bar chart: Projects by Domain (AI/ML, Web Dev, IoT, Cybersecurity, Data Science)
- **Recent Activity table**: Latest 5 projects with status badges
- API: `GET /analytics/dashboard`

---

### Phase 6: Projects (Estimated: ~4 hours)

#### [NEW] `src/pages/ProjectsList.jsx`
- **Top bar**: SearchInput + 3 DropdownSelects (Status, Domain, Academic Year) + "+ New Project" button
- **3-column card grid** with stagger animation
- Each card: title, domain badge, status badge, supervisor line, academic year, team avatar circles, "View Details →" link
- Filter changes trigger `AnimatePresence` layout animation
- API: `GET /projects` (list with filters) — **Note: backend endpoint needs expansion**

#### [NEW] `src/pages/ProjectDetail.jsx`
- **Header section**: Title, status + domain badges, supervisor breadcrumb
- **Action buttons**: "Run Plagiarism Scan" (red gradient) + "Edit Project" (outline)
- **Tab navigation**: Overview | Files | Kanban | Plagiarism Report | Attendance
- Tab content wrapped in `AnimatePresence mode="wait"` for crossfade
- **Overview tab**: Abstract card, Team Members card (avatar + name + email + role badge), Timeline visual
- Other tabs route to their respective pages (Files → Repository, Kanban → KanbanBoard, etc.)
- API: `GET /projects/{id}`

---

### Phase 7: Kanban Board (Estimated: ~3 hours)

#### [NEW] `src/pages/KanbanBoard.jsx`
- **Top bar**: Project title, "● Live" WebSocket status indicator (green dot), "+ Add Task" button
- **3 columns**: To Do (gray), In Progress (amber), Done (green)
- Each column: color-coded header with dot + task count
- **Task cards**: Title, description snippet, assignee avatar + name, drag handle
- Done column cards: subtle green left border tint
- **Drag & Drop**: `@hello-pangea/dnd` (already installed)
- **WebSocket**: `useWebSocket` hook connecting to `ws://localhost:8000/kanban/ws/{projectId}`
- On task move: `POST /kanban/projects/{id}/tasks/move`, broadcast via WS
- New task modal with slide-in animation
- API: WebSocket + `POST /kanban/projects/{id}/tasks/move`

#### [NEW] `src/hooks/useWebSocket.js`
- Manages WebSocket lifecycle
- Reconnection logic with exponential backoff
- Returns `{ isConnected, lastMessage, sendMessage }`

---

### Phase 8: Secure Repository (Estimated: ~2 hours)

#### [NEW] `src/pages/SecureRepository.jsx`
- **Upload zone**: Dashed indigo border, cloud upload icon, drag & drop text, accepted/blocked file types
  - `onDragOver`: border glow animation
  - `onDrop` / file select: triggers upload
- **Files table**: File Name (🔒 lock icon prefix), Uploaded By, Upload Date, Size, Actions (Download blue, Delete red outline)
- Upload progress: animated progress bar overlay on file row
- Successful upload: row slides in from top with green flash
- Delete: confirmation modal → row slides out
- API: `POST /repository/projects/{id}/upload`, `GET /repository/files/{id}/download`

---

### Phase 9: Plagiarism Scanner (Estimated: ~3 hours)

#### [NEW] `src/pages/PlagiarismScanner.jsx`
- **Top section**: Project dropdown + "Run National Plagiarism Scan" button (red-to-orange gradient with radar icon)
- Scan status text: "Last scan: Jul 18, 2025 — Complete ✓"
- **Results section** (2-column):
  - Left: Large circular `GaugeChart` with animated sweep (23% green), "Overall Similarity Score", "SAFE — Below 65% threshold"
  - Right: Two stacked stat cards — "Code Similarity (AST)" 18% + "Text Similarity (NLP)" 31%
- **Comparison table**: "Cross-University Comparison Results"
  - Columns: Matched Project, University, Similarity %, Type, Status
  - Flagged rows (≥65%): red-tinted background with "FLAGGED" badge
  - Safe rows: green "Safe" badge
- Scan in progress: button pulses, gauge animates sweep from current to new value
- API: `POST /plagiarism/scan/{project_id}`

---

### Phase 10: Face Attendance (Estimated: ~3 hours)

#### [NEW] `src/pages/FaceAttendance.jsx` (Student View)
- **Meeting selector**: Dropdown with meeting name + date
- **Webcam area**: Large `react-webcam` with rounded corners, indigo glowing border pulse, face silhouette overlay guide
- **Capture button**: "Capture & Verify Identity" (indigo-to-green gradient, camera icon)
- **Success card**: Slides in with spring animation — green-tinted card, checkmark icon, "Identity Verified Successfully", timestamp
- **Failure**: Red-tinted card with error message, shake animation
- API: `POST /attendance/meetings/{id}/clock-in`

#### [NEW] `src/pages/MeetingManagement.jsx` (Supervisor View)
- **Top bar**: "Meeting Management" title + "+ Create Meeting" button
- **Meetings table**: Date, Project, Notes, Attendance (X/Y verified badge with color coding), Expand button
- **Expandable rows**: `AnimatePresence` with height animation revealing sub-table
  - Sub-table: Student Name, Verification (✓ Face Verified green / ✗ Not Verified red), Timestamp
- Create meeting: Modal with form
- Color coding: green (all verified), yellow (partial), red (low attendance)

---

### Phase 11: Admin Pages (Estimated: ~3 hours)

#### [NEW] `src/pages/UserManagement.jsx`
- **Top bar**: SearchInput + Role dropdown filter + "+ Add User" button
- **Users table**: Name, Email, Role (color-coded badge), Department, University, Status (green/gray dot), Actions (edit pencil + toggle switch)
- Role badge colors: ministry=indigo, university=blue, supervisor=green, student=gray
- **Pagination**: "Showing 1-6 of 234 users" with page buttons
- Toggle switch: `motion.div` with `layout` prop for smooth knob animation
- Edit user: Side panel or modal

#### [NEW] `src/pages/UserProfile.jsx`
- **Profile card**: Large avatar circle (initials on indigo gradient), name, email, role badge, university breadcrumb, "Edit Profile" button
- **2x2 Settings grid** (stagger animation):
  1. **Change Password**: 3 password inputs + "Update Password" button
  2. **Face Biometric**: Status indicator (enrolled/not), webcam preview, "Capture Face Encoding" button
  3. **Appearance**: 3 selectable cards (Dark/Light/System) with `layoutId` for active indicator animation
  4. **Notifications**: 3 toggle switches with labels + descriptions

---

### Phase 12: Error & Utility Pages (Estimated: ~1 hour)

#### [NEW] `src/pages/NotFound.jsx`
- Full-screen dark gradient background
- Large "404" text with indigo gradient, scale-in spring animation
- Shield watermark behind at low opacity, floating up/down
- "Page Not Found" heading + description
- "← Back to Dashboard" button with hover translateY
- Sparkle decorative element in corner (matching mockup)

---

### Phase 13: Routing & Guards (Estimated: ~1 hour)

#### [MODIFY] [App.jsx](file:///d:/Graduation%20Project/Secure-FEPRH-App/frontend/src/App.jsx)

```jsx
<Routes>
  <Route path="/login" element={<Login />} />
  <Route path="/register" element={<Register />} />
  
  <Route path="/" element={<DashboardLayout />}>
    <Route index element={<DashboardHome />} />
    <Route path="projects" element={<ProjectsList />} />
    <Route path="projects/:id" element={<ProjectDetail />} />
    <Route path="kanban/:projectId" element={<KanbanBoard />} />
    <Route path="repository/:projectId" element={<SecureRepository />} />
    <Route path="plagiarism" element={<PlagiarismScanner />} />
    <Route path="attendance" element={<FaceAttendance />} />
    <Route path="meetings" element={<MeetingManagement />} />
    <Route path="users" element={<UserManagement />} />
    <Route path="profile" element={<UserProfile />} />
  </Route>
  
  <Route path="*" element={<NotFound />} />
</Routes>
```

- Role-based route guards via wrapper component
- Students: No access to analytics, plagiarism trigger, user management
- Supervisors: Access everything except user management
- Admins: Full access

---

### Phase 14: Dependencies & Configuration (Estimated: ~30 min)

#### [MODIFY] `package.json` — Install missing deps

```bash
npm install react react-dom recharts
```

> [!NOTE]
> Most dependencies are already installed: `framer-motion`, `lucide-react`, `react-router-dom`, `@hello-pangea/dnd`, `axios`, `react-webcam`. We only need to add `react` and `react-dom` (peer deps) and optionally `recharts` if we want richer charts later.

#### Fix build config
- Remove TypeScript build step (`tsc &&` from build script) since we're using `.jsx`
- Clean up leftover `.ts` files (`main.ts`, `counter.ts`)
- Ensure `postcss.config.js` has `tailwindcss` and `autoprefixer` plugins

---

## New Dependencies Required

| Package | Version | Purpose |
|---|---|---|
| `react` | `^19.x` | Core (peer dependency) |
| `react-dom` | `^19.x` | DOM renderer (peer dependency) |
| *(All others already installed)* | | |

---

## Backend API Gaps

> [!WARNING]
> The following backend endpoints are referenced by the frontend but **do not yet exist** in the backend routers. These need to be created before the corresponding frontend pages will fully work.

| Missing Endpoint | Needed By | Purpose |
|---|---|---|
| `POST /auth/register` | Register.jsx | User registration with university/faculty/department |
| `GET /projects` | ProjectsList.jsx | List all projects with filters |
| `GET /projects/{id}` | ProjectDetail.jsx | Single project details |
| `POST /projects` | ProjectsList.jsx | Create new project |
| `GET /kanban/projects/{id}/board` | KanbanBoard.jsx | Fetch board with columns and tasks |
| `POST /kanban/projects/{id}/tasks` | KanbanBoard.jsx | Create new task |
| `GET /repository/projects/{id}/files` | SecureRepository.jsx | List files for a project |
| `DELETE /repository/files/{id}` | SecureRepository.jsx | Delete a file |
| `GET /plagiarism/results/{project_id}` | PlagiarismScanner.jsx | Fetch scan results |
| `GET /attendance/meetings` | MeetingManagement.jsx | List meetings |
| `POST /attendance/meetings` | MeetingManagement.jsx | Create meeting |
| `GET /users` | UserManagement.jsx | List users with filters |
| `PATCH /users/{id}` | UserManagement.jsx | Update user status/role |
| `GET /users/me` | UserProfile.jsx | Current user profile |
| `PATCH /users/me` | UserProfile.jsx | Update profile |
| `POST /users/me/face-encoding` | UserProfile.jsx | Upload face encoding |

> [!IMPORTANT]
> **Strategy**: The frontend will be built with mock data fallbacks. Each page will attempt the real API call and gracefully fall back to realistic sample data if the endpoint returns 404. This allows us to build the full UI independently and connect real data incrementally.

---

## Verification Plan

### Build Verification
```bash
cd d:/Graduation\ Project/Secure-FEPRH-App/frontend
npm run dev        # Must start without errors on localhost:5173
npm run build      # Must produce a clean production build
```

### Visual Verification (Manual)
- Each completed page compared side-by-side with its mockup image
- Dark mode and light mode toggle tested on every page
- All animations verified: page transitions, hover effects, stagger entrances, drag-and-drop
- Mobile responsive layout (sidebar collapse) tested at 768px breakpoint

### Functional Verification
- Login flow with real backend JWT
- Navigation between all pages
- Theme persistence across page reloads
- Role-based nav item visibility
- WebSocket connection indicator on Kanban

---

## Execution Order (Recommended)

| Order | Phase | Deliverable |
|---|---|---|
| 1 | Phase 1 | Design system, CSS, Tailwind config, animation variants |
| 2 | Phase 2 | All reusable UI components |
| 3 | Phase 3 | Layout shell (sidebar + header) |
| 4 | Phase 14 | Fix deps & build config |
| 5 | Phase 4 | Login polish + Register + Splash |
| 6 | Phase 13 | Full routing setup |
| 7 | Phase 5 | Dashboard with charts |
| 8 | Phase 6 | Projects list + detail |
| 9 | Phase 7 | Kanban board |
| 10 | Phase 8 | Secure repository |
| 11 | Phase 9 | Plagiarism scanner |
| 12 | Phase 10 | Face attendance + meetings |
| 13 | Phase 11 | User management + profile |
| 14 | Phase 12 | 404 page |

**Total estimated effort: ~30 hours of implementation**
