# Design Guidelines: Framework-Driven Slate Handicapper

## Design Approach

**Selected System:** Carbon Design System with Linear influences
**Justification:** Data-intensive decision support tool requiring clear information hierarchy, professional credibility, and efficient workflows. Carbon excels at enterprise data applications while Linear provides modern, clean data presentation patterns.

**Core Principles:**
1. **Transparency First** - Every data point must trace to its source
2. **Confidence Through Clarity** - Uncertainty is explicitly shown, not hidden
3. **Workflow Efficiency** - Minimize clicks for repeated tasks
4. **Audit-Ready Design** - Visual history and versioning prominence

---

## Typography

**Font Stack:** IBM Plex Sans (primary), IBM Plex Mono (data/code)

**Hierarchy:**
- Page Titles: 32px, Semi-bold
- Section Headers: 24px, Semi-bold  
- Card Titles: 18px, Medium
- Body Text: 16px, Regular
- Data Labels: 14px, Medium
- Citations/Meta: 13px, Regular
- Monospace Data: 14px, IBM Plex Mono (odds, scores, IDs)

---

## Layout System

**Spacing Primitives:** Tailwind units of 2, 4, 6, 8, 12, 16
- Tight spacing: 2-4 (within components)
- Standard spacing: 6-8 (between related elements)
- Section spacing: 12-16 (major divisions)

**Grid Structure:**
- App Shell: Fixed sidebar (280px) + fluid main content
- Content Max-Width: 1400px for data-dense views
- Card Grids: 2-3 columns on desktop, stack on mobile

---

## Component Library

### Core Navigation
**Sidebar Navigation (Fixed Left)**
- Framework selector at top with version indicator
- Main sections: Slates, Frameworks, History, Settings
- Active state: subtle left border accent + background tint
- Collapsed state option for more workspace

**Top Bar**
- Slate name + status badge (Draft/Enriching/Ready)
- Action buttons: Export, Run Framework, Settings
- User profile/plan indicator

### Slate Management
**Slate Grid (Landing View)**
- Card-based layout showing: name, sport, game count, status, last updated
- Quick actions: duplicate, archive, open
- Status indicators: color-coded badges with icons

**OCR Confirm Grid**
- Table layout with editable cells
- Team mapping: dropdown with fuzzy search showing canonical name
- Validation indicators: green checkmark (mapped), red warning (unmapped)
- Inline editing for spreads/totals
- Delete row action with undo capability

### Per-Game Workspace (Critical Component)

**Layout:** Three-panel design
1. **Left Panel (320px):** Game summary + current recommendation
2. **Center Panel (Fluid):** Evidence and "Why" sections  
3. **Right Panel (360px):** Data snapshots + user actions

**Recommendation Card (Left Panel)**
- Large, prominent display of: Pick, Line, Edge (+3.5 format)
- Confidence band: visual meter + percentage range
- Lock/Override controls
- Version indicator showing which framework was used

**Why Sections (Center Panel)**
- Accordion-style expandable blocks: QB, Defense, SOS, Motivation, Market
- Each block shows: computed feature value, contribution to score, key facts
- Citation links inline with claims
- Uncertainty flags prominently displayed with warning icon

**Evidence Panel (Center Panel)**
- Chronological list of sources with timestamp
- Each item: publisher badge, headline, snippet (expandable)
- Citation count indicator
- Filter by type: News, Stats, Injuries, Portal
- Click to open source in new tab

**Data Snapshots (Right Panel)**
- Tabbed interface: Odds, Stats, Injuries, Portal
- Timestamp + source for each snapshot
- Raw data viewable in collapsible sections
- Visual diff indicator if data changed since last run

**User Actions (Right Panel Bottom)**
- Override recommendation with reason text area
- Lock pick (prevents re-computation)
- Add notes
- Flag for review

### Framework Builder
**Weight Configurator**
- Slider controls (0-100) for each criterion
- Live preview showing relative weight distribution (pie chart)
- Reset to defaults option

**Rules Editor**
- List of active rules with enable/disable toggles
- Add rule: guided form with condition builder (dropdowns + value inputs)
- Rule preview: "If [condition] then [action]" human-readable format
- Sandbox test link per rule

**Version History**
- Timeline view showing all framework versions
- Compare versions: side-by-side diff of weights and rules
- Restore previous version option

### Forms & Inputs
**Standard Inputs**
- Single-line text: 16px height: 40px, border on all sides
- Dropdowns: Search-enabled for team mapping, icons for visual scanning
- Number inputs: Monospace font for odds/spreads
- Textareas: Auto-expand with character count

**Validation States**
- Success: green left border
- Error: red left border + error message below
- Warning: amber left border for data quality flags

### Data Display
**Stat Tables**
- Striped rows for scanability  
- Sortable columns with indicator
- Highlight delta/change values
- Monospace for numerical data

**Confidence Indicators**
- Visual meter: segmented bar (Low/Med/High)
- Percentage range display
- Tooltip explaining confidence factors

**Status Badges**
- Small, rounded rectangles with icon + text
- Draft, Enriching (animated pulse), Ready, Locked, Override

### Overlays & Modals
**Modal Pattern**
- Centered, max-width 600px for forms, 900px for data review
- Dark overlay backdrop
- Close on backdrop click + X button
- Sticky header with title + actions

**Export Modal**
- Preview of CSV data in table format
- Format selection: CSV, PDF options
- Include/exclude toggles: Notes, Evidence, Snapshots
- Download + Copy to Clipboard actions

---

## Accessibility Implementation
- ARIA labels on all interactive elements
- Keyboard navigation: Tab, Enter, Escape patterns
- Focus indicators: 2px outline on all focusable elements
- Screen reader announcements for status changes
- Sufficient contrast ratios for all text (WCAG AA minimum)

---

## Animation Strategy
**Minimal, Purposeful Motion:**
- Status changes: 200ms fade transition
- Panel expand/collapse: 250ms ease
- Loading states: subtle pulse on data fetching
- NO scroll animations, parallax, or decorative motion
- Focus on instant feedback for user actions

---

## Images
No hero images or marketing imagery. This is a pure data application where every pixel serves a functional purpose. The only images are:
- Uploaded slate screenshots (displayed in OCR confirm view)
- User avatars (32px circles)
- Provider logos (small badges for odds sources, stats APIs)