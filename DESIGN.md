# iAttend — Design System & UI Guidelines

> **Single source of truth** for visual design across the **Web Frontend** (React + Vite) and the **Mobile App** (React Native + Expo). Update this document whenever design tokens or component patterns change.

---

## Table of Contents

1. [Brand Identity](#1-brand-identity)
2. [Color Palette](#2-color-palette)
3. [Typography](#3-typography)
4. [Spacing](#4-spacing)
5. [Border Radius](#5-border-radius)
6. [Shadows & Elevation](#6-shadows--elevation)
7. [Theme System — Light & Dark](#7-theme-system--light--dark)
8. [Role-Based Color Identity](#8-role-based-color-identity)
9. [Component Patterns — Web](#9-component-patterns--web)
10. [Component Patterns — Mobile](#10-component-patterns--mobile)
11. [Layout & Navigation](#11-layout--navigation)
12. [Animation Guidelines](#12-animation-guidelines)
13. [Icons](#13-icons)
14. [Glassmorphism Style](#14-glassmorphism-style)
15. [Attendance Status Colors](#15-attendance-status-colors)
16. [Naming Conventions](#16-naming-conventions)
17. [Platform Parity Checklist](#17-platform-parity-checklist)

---

## 1. Brand Identity

| Property | Value |
|---|---|
| **App Name** | iAttend |
| **Tagline** | School Management System |
| **Primary Brand Color** | `#5b50e6` (Web light) / `#6366f1` (Web dark / Mobile) |
| **Logo Shape** | Circular gradient badge with a `GraduationCap` icon |
| **Logo Gradient** | `['#4338ca', '#6366f1', '#8b5cf6']` |
| **Brand Font** | `Outfit` (Web) · System default (Mobile) |
| **Icon Library** | `lucide-react` (Web) / `lucide-react-native` (Mobile) |

---

## 2. Color Palette

### 2a. Semantic / Brand Colors

| Token | Hex | Usage |
|---|---|---|
| `--brand-primary` | `#5b50e6` (light) / `#6366f1` (dark) | Primary CTAs, active nav items, focus rings |
| `--brand-secondary` | `#6366f1` | Gradients, secondary highlights |
| `--accent` | `#5b50e6` | Coordinator badge, accent text |
| `success` | `#10b981` | Attendance ≥ 90%, success states |
| `warning` | `#f59e0b` | Attendance 75–89%, warnings |
| `danger` | `#ef4444` | Below 75%, errors, delete actions |
| `info` | `#3b82f6` | Informational UI, student role |

### 2b. Web — CSS Custom Properties (`index.css`)

**Light Mode (`:root`)**

```css
--bg-primary:    #f4f7fe;
--bg-secondary:  #ffffff;
--bg-glass:      rgba(255, 255, 255, 0.85);
--bg-glass-hover:rgba(255, 255, 255, 0.95);
--text-primary:  #1e293b;
--text-secondary:#64748b;
--text-light:    #94a3b8;
--border-color:  rgba(226, 232, 240, 0.8);
```

**Dark Mode (`[data-theme='dark']`)**

```css
--bg-primary:    #121212;
--bg-secondary:  #1e1e1e;
--bg-glass:      rgba(30, 30, 30, 0.70);
--bg-glass-hover:rgba(30, 30, 30, 0.90);
--text-primary:  #f8fafc;
--text-secondary:#a0a0a0;
--text-light:    #707070;
--border-color:  rgba(255, 255, 255, 0.10);
```

### 2c. Mobile — JS Theme (`mobile/src/styles/theme.js`)

> The mobile app defaults to **dark mode only** (system-agnostic, static dark palette).

```js
// Backgrounds
bgPrimary:   '#0f0f13'   // screen background
bgSecondary: '#1a1a2e'   // secondary panels
bgCard:      '#1e1e2e'   // card surfaces
bgElevated:  '#252535'   // elevated elements, ring tracks
bgInput:     '#252535'   // text inputs

// Text
textPrimary:   '#f1f5f9'
textSecondary: '#94a3b8'
textMuted:     '#64748b'

// Borders
border:       '#2a2a3a'
borderLight:  '#334155'
```

### 2d. Gradient Definitions (Mobile)

```js
gradientPrimary: ['#4338ca', '#6366f1', '#8b5cf6']  // brand / admin
gradientAdmin:   ['#4338ca', '#6366f1']
gradientTeacher: ['#059669', '#10b981']
gradientStudent: ['#2563eb', '#3b82f6']
gradientParent:  ['#d97706', '#f59e0b']
gradientCard:    ['#1e1e2e', '#252535']              // neutral card
```

---

## 3. Typography

### 3a. Web

- **Font Family:** `'Outfit'`, fallback: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`
- **Base font size:** `1rem` (16px)
- **Line height:** `1.5`
- Loaded via Google Fonts CDN (`@import`)

| Use | Size | Weight | Notes |
|---|---|---|---|
| Page heading | `1.5rem` | `bold` | Dashboard section titles |
| Card heading | `1.25rem` | `bold` | Sidebar portal names |
| Sub-heading | `1.1rem` | `600` | Card section labels |
| Body | `1rem` | `400` | Default |
| Small label | `0.875rem` | `500` | Form labels, table headers |
| Caption | `0.75rem` | `400–500` | Badges, metadata |
| Micro | `0.6–0.65rem` | `700–800` | Insight chip headers, uppercase labels |

### 3b. Mobile

```js
typography = {
  xs:   { fontSize: 11, lineHeight: 16 },   // captions, micro labels
  sm:   { fontSize: 13, lineHeight: 18 },   // secondary text, subtitles
  base: { fontSize: 15, lineHeight: 22 },   // body / list items
  md:   { fontSize: 17, lineHeight: 24 },   // primary text, avatar initials
  lg:   { fontSize: 20, lineHeight: 28 },   // section titles
  xl:   { fontSize: 24, lineHeight: 32 },   // stat card values
  xxl:  { fontSize: 30, lineHeight: 38 },   // session count, large numbers
  bold:     { fontWeight: '700' },
  semibold: { fontWeight: '600' },
  medium:   { fontWeight: '500' },
}
```

**Special:** Role badge text uses `fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5`.

---

## 4. Spacing

Both platforms use an 8-pt grid.

### 4a. Web

| Value | Pixels | Usage |
|---|---|---|
| `0.5rem` | 8px | Small gaps, form group gap |
| `0.75rem` | 12px | Nav item padding |
| `1rem` | 16px | Standard padding |
| `1.25rem` | 20px | Form group margin |
| `1.5rem` | 24px | Card padding, dashboard gaps |
| `2rem` | 32px | Section padding, sidebar header |
| `3rem` | 48px | Login card padding |

### 4b. Mobile

```js
spacing = {
  xs:  4,   // tiny gap between badge elements
  sm:  8,   // avatar margin-right, icon button padding
  md:  16,  // standard padding (card, content, header)
  lg:  24,  // section separators
  xl:  32,  // login top padding, scroll end spacer
  xxl: 48,  // large top padding
}
```

---

## 5. Border Radius

### 5a. Web

```css
--radius-sm: 0.375rem   /* 6px  — small badges */
--radius-md: 0.5rem     /* 8px  — inputs, nav items, buttons */
--radius-lg: 1rem       /* 16px — cards, glass panels */
--radius-xl: 1.5rem     /* 24px — login card */
```

Additional in-code values: `10px` (action-btn), `12px` (icon-wrapper, error banner), `14px` (login inputs/button), `24px` (login card), `32px` (login container), `50%` (circular avatars).

### 5b. Mobile

```js
radius = {
  sm:   8,    // role badge
  md:   12,   // icon wrappers, quick action cards
  lg:   16,   // main cards, attendance card
  xl:   24,   // login card
  full: 9999, // pill badges, circular elements
}
```

---

## 6. Shadows & Elevation

### 6a. Web

```css
--shadow-sm:    0 1px 3px rgba(0, 0, 0, 0.05)
--shadow-md:    0 4px 6px -1px rgba(0, 0, 0, 0.05),
                0 2px 4px -1px rgba(0, 0, 0, 0.03)
--shadow-glass: 0 8px 32px 0 rgba(31, 38, 135, 0.05)   /* light */
                0 8px 32px 0 rgba(0, 0, 0, 0.50)        /* dark */
```

Special context shadows:
- `.btn-primary` hover: `0 6px 20px rgba(99, 102, 241, 0.4)`
- Login container: `0 30px 80px rgba(67, 56, 202, 0.12)`
- Brand glow ring (Dashboard): `0 0 18px rgba(99, 102, 241, 0.15)`

### 6b. Mobile

```js
shadows = {
  sm: { shadowColor: '#000', shadowOffset: {width:0, height:1},
        shadowOpacity: 0.3, shadowRadius: 3,  elevation: 3 },
  md: { shadowColor: '#000', shadowOffset: {width:0, height:4},
        shadowOpacity: 0.4, shadowRadius: 8,  elevation: 6 },
  lg: { shadowColor: '#6366f1', shadowOffset: {width:0, height:8},
        shadowOpacity: 0.3, shadowRadius: 16, elevation: 10 },
}
```

---

## 7. Theme System — Light & Dark

### Web

- Theme is stored in `localStorage` as `'theme'` key (`'light'` | `'dark'`).
- Applied by toggling the `data-theme` attribute on `<html>`.
- All design tokens are CSS custom properties that respond to `[data-theme='dark']`.
- `ThemeToggle` component ([ThemeToggle.jsx](file:///Users/vikranthvicky/Documents/iAttend/frontend/src/components/shared/ThemeToggle.jsx)) toggles the theme with a `Sun`/`Moon` icon and a spring animation.
- Background uses fixed radial gradients for depth — brand purple top-right, success green bottom-left.

### Mobile

- **Static dark theme only** — no runtime theme toggle.
- All screens import directly from [`mobile/src/styles/theme.js`](file:///Users/vikranthvicky/Documents/iAttend/mobile/src/styles/theme.js).
- StatusBar is always `style="light"`.
- If a light mode is introduced in future, extract `colors` into a dynamic hook that reads `Appearance.getColorScheme()`.

---

## 8. Role-Based Color Identity

Every user role has a dedicated accent color used for: avatar ring, nav tab highlight, role badge, gradient headers, stat card accents.

| Role | Color | Hex | Gradient |
|---|---|---|---|
| **Admin** | Indigo | `#6366f1` | `['#4338ca', '#6366f1']` |
| **Teacher** | Emerald | `#10b981` | `['#059669', '#10b981']` |
| **Student** | Blue | `#3b82f6` | `['#2563eb', '#3b82f6']` |
| **Parent** | Amber | `#f59e0b` | `['#d97706', '#f59e0b']` |

**Web portal label colors:**
- Admin sidebar: `var(--brand-primary)` — `#5b50e6`
- Teacher sidebar: `var(--brand-secondary)` — `#6366f1`
- Student/Parent sidebars: `var(--brand-primary)`

**Helpers (Mobile):**
```js
getRoleColor(role)    // returns the flat hex for a role
getRoleGradient(role) // returns the [start, end] gradient array
```

---

## 9. Component Patterns — Web

### Buttons

```css
/* Base */
.btn { padding: 0.75rem 1.5rem; border-radius: var(--radius-md);
       font-weight: 500; font-family: 'Outfit'... }

/* Variants */
.btn-primary   { background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary));
                 color: white; box-shadow: 0 4px 14px rgba(99,102,241,0.39); }
.btn-secondary { background: var(--bg-secondary); border: 1px solid var(--border-color); }
.btn-danger    { background: white; color: var(--danger); border: 1px solid var(--danger); }
               /* hover: inverts to filled danger */

/* Icon action button (tables) */
.action-btn { width: 34px; height: 34px; border-radius: 10px; }
```

**Hover behaviour:** Primary lifts `-2px`, secondary lifts `-1px`. All transitions at `0.2s ease`.

### Inputs

```css
.input-field {
  padding: 0.75rem 1rem;
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
}
.input-field:focus {
  border-color: var(--brand-secondary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2);
}
```

Login inputs: `padding: 1rem 3.5rem` (with icon offset), `border-radius: 14px`.

### Glass Panel (`.glass-panel`)

```css
background: var(--bg-glass);
backdrop-filter: blur(12px);
border: 1px solid rgba(255, 255, 255, 0.18);  /* dark: rgba(255,255,255,0.05) */
box-shadow: var(--shadow-glass);
border-radius: var(--radius-lg);
transition: all 0.3s ease;
```

Used for: sidebars, card panels, modal containers.

### Stat Cards

- Framer Motion animated with `initial={{ opacity:0, y:20 }}` → `animate={{ opacity:1, y:0 }}` with staggered `delay`.
- `whileHover={{ scale: 1.02 }}` for clickable cards.
- Icon housed in a `12px` radius wrapper with `color15` (15% alpha) background tint.

### Active Navigation Item (Sidebar)

```
background: linear-gradient(135deg, var(--brand-primary), var(--brand-secondary))
color: white
font-weight: 500
```

Inactive: `color: var(--text-secondary)`, transparent background.

### Tab Switcher (animated)

Active tab has a `<motion.div layoutId="...">` absolutely-positioned gradient underlay (Framer Motion `spring` transition). Pattern used in: UserManage, StudentDashboard schedule tabs, AdminDashboard attendance tabs.

### Error Banner (Web)

```css
background: #fff1f2;
color: #e11d48;
border-radius: 12px;
padding: 0.875rem 1rem;
```

---

## 10. Component Patterns — Mobile

### Header ([`components/Header.js`](file:///Users/vikranthvicky/Documents/iAttend/mobile/src/components/Header.js))

- **Background:** `colors.bgCard` with `borderBottomColor: colors.border`
- **Left:** Avatar ring (role-color border, 40×40 circular) + title/role badge
- **Right:** Optional search (admin/teacher only), notification bell with unread red dot, logout icon
- Avatar fallback: colored initial letter in `roleColor + '33'` background
- Unread dot: `colors.danger` badge, `minWidth: 16`, absolutely positioned `top:4, right:4`
- Polling interval: 30 seconds for unread notification count

### StatCard ([`components/StatCard.js`](file:///Users/vikranthvicky/Documents/iAttend/mobile/src/components/StatCard.js))

- Wraps content in `expo-linear-gradient` with gradient going top-left → bottom-right.
- Icon in a `40×40` `radius.md` wrapper with `color + '33'` background.
- `flex: 1, minWidth: 140` — always used in `flexDirection: 'row'` pairs/grids.
- Value: `typography.xl + typography.bold`, Label: `typography.sm + textSecondary`.
- Border: `rgba(255,255,255,0.08)` (subtle glass edge).

### Attendance Ring

Both web and mobile implement an SVG circular progress ring:
- Track circle: `colors.bgElevated` / `var(--border-color)`
- Progress circle: stroke color from status (`success`, `warning`, `danger`)
- Web: `radius=60, stroke=11` — larger, animated with Framer Motion
- Mobile: `r=52, stroke=9` — uses `react-native-svg`

### Cards (Mobile — common pattern)

```js
{
  backgroundColor: colors.bgCard,
  borderRadius: radius.lg,
  padding: spacing.md,
  borderWidth: 1,
  borderColor: colors.border,
}
```

Pressed / interactive cards use `TouchableOpacity` with `activeOpacity: 0.8`.

### Quick Action List (Mobile)

Row pattern:
```js
{ flexDirection:'row', alignItems:'center', gap: spacing.md,
  backgroundColor: colors.bgCard, borderRadius: radius.md,
  padding: spacing.md, borderWidth:1, borderColor: colors.border }
```
Icon wrapper: `44×44, borderRadius: radius.md, color + '22'` background.
Label: `typography.base + semibold + textPrimary, flex:1`.
Trailing: `ChevronRight(14, textMuted)`.

### Loading States

- `FullPageLoader` — full-screen centered `ActivityIndicator` + message text.
- `CardSkeleton` — placeholder for loading data tables.
- `LoadingSkeleton` — reusable shimmer/skeleton pattern.

### Bottom Tab Bar (Mobile)

```js
tabBarStyle = {
  backgroundColor: colors.bgCard,
  borderTopColor: colors.border,
  borderTopWidth: 1,
  paddingBottom: 6,
  paddingTop: 6,
  height: 62,
}
tabBarLabelStyle = { fontSize: 11, fontWeight: '600', marginTop: -2 }
```
Active tint: role color. Inactive tint: `colors.textMuted`.

### Modals (Mobile)

- Full `Modal` component wrapping a `ScrollView`.
- Header: gradient title bar using `expo-linear-gradient`.
- Close button: `X` icon top-right.
- Inputs: `colors.bgInput` background, `colors.border` border, `colors.textPrimary` text.

---

## 11. Layout & Navigation

### Web Layout

```
┌────────────────────────────────────────────────────┐
│  .app-container  { display:flex; height:100vh; }   │
│  ┌──────────┐  ┌──────────────────────────────┐    │
│  │ .sidebar │  │      .dashboard-main         │    │
│  │  260px   │  │  flex:1, overflow-y:auto      │    │
│  │  sticky  │  │  padding: 1.5rem 2rem         │    │
│  └──────────┘  └──────────────────────────────┘    │
└────────────────────────────────────────────────────┘
```

**Mobile sidebar (< 768px):** Sidebar becomes `position:fixed`, slides in from `left:-280px` via `.sidebar.open { left:0 }`. Overlay with `backdrop-filter: blur(4px)` appears. Hamburger (`Menu` icon) shown in header.

**Dashboard header:**
```css
.dashboard-header { padding:1rem 2rem; display:flex;
  justify-content:space-between; align-items:center; z-index:10; }
```

Mobile breakpoint: wraps to column, full-width actions row.

### Mobile Navigation ([`AppNavigator.js`](file:///Users/vikranthvicky/Documents/iAttend/mobile/src/navigation/AppNavigator.js))

- **Auth Flow:** `NavigationContainer → NativeStack → LoginScreen`
- **Post-login:** Role-based navigator selected by `user.role`:
  - Admin → `AdminNavigator` (bottom tabs + nested stacks)
  - Teacher → `TeacherNavigator` (bottom tabs + nested stacks)
  - Student → `StudentNavigator` (bottom tabs + nested stacks)
  - Parent → `ParentNavigator` (bottom tabs + nested stacks)
- All navigators use `headerShown: false` — custom `Header` component handles the top bar.

### Responsive Tables (Web)

```css
.table-responsive { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.table-responsive table { min-width: 600px; white-space: nowrap; }
```

Table row hover: `background: var(--bg-secondary)`.
Head border: `2px solid var(--border-color)`. Cell padding: `0.75rem`.

---

## 12. Animation Guidelines

### Web (Framer Motion)

| Element | Animation |
|---|---|
| Page content | `initial={{ opacity:0, y:10 }} → animate={{ opacity:1, y:0 }}` |
| Stat cards | Stagger `delay` (0.1s increments) |
| Tab indicator | `layoutId` shared layout, `spring { bounce:0.2, duration:0.6 }` |
| SVG ring | `strokeDashoffset` animated over `1.4s easeOut` |
| Percentage counter | `opacity:0, scale:0.6 → 1` with `delay:0.6` |
| ThemeToggle icon | `rotate: 0 ↔ 360deg`, spring, `duration:0.5` |
| Buttons hover | `scale: 1.05`, tap: `scale: 0.95` |

### Mobile

- Use `expo-haptics` for feedback on important tap actions.
- Prefer `useNativeDriver: true` for all Animated API calls.
- `RefreshControl` uses role color as `tintColor`.
- Rely on native stack transition defaults; avoid custom animated nav transitions.

---

## 13. Icons

| Platform | Library | Default Size |
|---|---|---|
| Web | `lucide-react` | `size={20}` nav, `size={24}` section heads |
| Mobile | `lucide-react-native` | `size={19}` header, `size={22}` stat cards |

Common sizes:
- Navigation links: `20`
- Header action buttons: `19` (mobile), `20` (web)
- Section headers / stat cards: `24` (web), `22` (mobile)
- Quick action icon wrapper: `22`
- Trailing chevron: `14` (mobile)

---

## 14. Glassmorphism Style

The web frontend uses glassmorphism for its main UI chrome.

**Requirements:**
1. `backdrop-filter: blur(12px)` (with `-webkit-` prefix)
2. Semi-transparent background (`rgba(255,255,255,0.85)` light / `rgba(30,30,30,0.7)` dark)
3. `border: 1px solid rgba(255,255,255,0.18)` — white glass edge (reduced to `0.05` in dark)
4. `box-shadow: var(--shadow-glass)` — soft purple-tinted outer glow

**Login page extra:** `::before` pseudo-element with layered `radial-gradient` for cloud-like depth. Illustration section uses `mix-blend-mode: darken`.

**Mobile equivalent:** Glass effect is simulated via `LinearGradient` on `StatCard` and `ChildCard`. Card borders use `rgba(255,255,255,0.08)`. No `backdrop-filter` support in React Native.

---

## 15. Attendance Status Colors

| Level | Condition | Color | Hex |
|---|---|---|---|
| **Excellent** | ≥ 90% | Green / `colors.success` | `#10b981` / `#16a34a` |
| **Good** | 75–89% | Amber / `colors.warning` | `#f59e0b` |
| **Warning** | < 75% | Red / `colors.danger` | `#ef4444` |

Web uses `#16a34a` (darker green) for glow effects; Mobile uses `#10b981` directly.

Web insight panel messages:
- **Excellent:** Buffer % before dropping below 90%.
- **Good:** Classes needed to reach 90%.
- **Warning:** Classes needed to reach 75%, coordinator alert.

---

## 16. Naming Conventions

### Web

| Category | Convention | Example |
|---|---|---|
| CSS variables | `--kebab-case` | `--brand-primary`, `--bg-glass` |
| Utility classes | `.kebab-case` | `.glass-panel`, `.btn-primary` |
| Component files | `PascalCase.jsx` | `AdminSidebar.jsx`, `ThemeToggle.jsx` |
| Page files | `PascalCase.jsx` | `DashboardOverview.jsx` |
| Page-scoped CSS | `PageName.css` | `Login.css` |

### Mobile

| Category | Convention | Example |
|---|---|---|
| StyleSheet keys | camelCase | `attendanceCard`, `ringLabel` |
| Component files | `PascalCase.js` | `Header.js`, `StatCard.js` |
| Screen files | `*Screen.js` | `StudentDashboardScreen.js` |
| Navigator files | `*Navigator.js` | `StudentNavigator.js` |
| Theme exports | camelCase | `colors`, `spacing`, `radius`, `typography`, `shadows` |

---

## 17. Platform Parity Checklist

When adding or changing any UI feature, verify both platforms:

| Feature | Web (`frontend/src`) | Mobile (`mobile/src`) |
|---|---|---|
| **Login screen** | [`pages/Login.jsx`](file:///Users/vikranthvicky/Documents/iAttend/frontend/src/pages/Login.jsx) | [`screens/auth/LoginScreen.js`](file:///Users/vikranthvicky/Documents/iAttend/mobile/src/screens/auth/LoginScreen.js) |
| **Color tokens** | [`src/index.css`](file:///Users/vikranthvicky/Documents/iAttend/frontend/src/index.css) | [`src/styles/theme.js`](file:///Users/vikranthvicky/Documents/iAttend/mobile/src/styles/theme.js) |
| **Stat cards** | Inline `StatCard` in dashboard pages | [`components/StatCard.js`](file:///Users/vikranthvicky/Documents/iAttend/mobile/src/components/StatCard.js) (shared) |
| **Attendance ring** | SVG in `StudentDashboard.jsx` (`radius=60`) | SVG in `StudentDashboardScreen.js` (`r=52`) |
| **App header** | `.dashboard-header` div per portal | [`components/Header.js`](file:///Users/vikranthvicky/Documents/iAttend/mobile/src/components/Header.js) (shared) |
| **Navigation** | React Router + role sidebars | Bottom Tab + Stack navigators |
| **Notifications** | `NotificationDropdown.jsx` | `NotificationCenterModal.js` |
| **AI Quiz Generator** | `AIQuizGeneratorModal.jsx` | `AIQuizGeneratorModal.js` |
| **Global Search** | `GlobalSearch.jsx` | `GlobalSearchModal.js` |
| **Theme toggle** | `ThemeToggle.jsx` (light ↔ dark) | Static dark only |
| **Loading states** | Inline spinner via Lucide `Activity` | `FullPageLoader`, `CardSkeleton` |
| **Error display** | `.error-message` styled div | `Alert.alert()` native dialog |
| **Role colors** | CSS variables + inline JS | `getRoleColor()`, `getRoleGradient()` in `theme.js` |

---

## Changelog

| Date | Change |
|---|---|
| 2026-09-04 | Initial document created from full codebase analysis |

---

> **Maintenance rule:** When changing any design token (color, spacing, radius, shadow), update **both** [`frontend/src/index.css`](file:///Users/vikranthvicky/Documents/iAttend/frontend/src/index.css) and [`mobile/src/styles/theme.js`](file:///Users/vikranthvicky/Documents/iAttend/mobile/src/styles/theme.js), then update the corresponding table in this document.
