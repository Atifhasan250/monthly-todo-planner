# Monthly Todo Planner - Mobile Design Guidelines

## Brand Identity
**Purpose**: Personal 30-day progress tracker combining daily habits and weekly task planning
**Aesthetic**: Brutally minimal hacker productivity - dark slate backgrounds with surgical emerald green accents for completed actions, violet highlights for habits
**Memorable Element**: The glowing emerald progress bar that visually rewards completion, creating a dopamine-driven productivity loop

## Navigation Architecture
**Type**: Tab Navigation (3 tabs)
- **Today** (daily habits + current week focus)
- **Plan** (floating action button - add tasks/habits)
- **History** (calendar view of past 30 days)

## Color Palette
- **Primary**: #10b981 (Emerald) - completion, success states
- **Secondary**: #8b5cf6 (Violet) - daily habits, highlights
- **Background**: #0f172a (Slate 900)
- **Surface**: #1e293b (Slate 800)
- **Border**: #334155 (Slate 700)
- **Text Primary**: #e2e8f0 (Slate 100)
- **Text Secondary**: #94a3b8 (Slate 400)
- **Danger**: #ef4444 (Red)

## Typography
**Font**: System Default (SF Pro/Roboto)
**Scale**:
- Hero: 32pt Bold (progress percentage)
- Title: 24pt Semibold (screen headers)
- Subtitle: 18pt Semibold (week names)
- Body: 16pt Regular (task descriptions)
- Caption: 14pt Regular (dates, metadata)
- Small: 12pt Medium (day labels, badges)

## Screen Specifications

### 1. Today Tab
**Purpose**: Daily habit tracking + current week tasks
**Layout**: 
- Transparent header with date (right) and settings icon (left)
- Scrollable content with top inset: headerHeight + 20px, bottom: tabBarHeight + 20px
- Floating elements: none

**Components**:
- Progress card (top): 30-day completion percentage with animated gradient bar, stats below (X/30 days complete)
- Daily Habits card: Violet border, checkboxes in 2-column grid, "Add Habit" button at bottom, 7-day mini calendar showing habit streaks
- Current Week card: Emerald border, task list with checkboxes, day badges (e.g., "D1-7"), "Add Task" button

### 2. Plan Tab (Modal)
**Purpose**: Create new tasks or habits
**Layout**:
- Native modal with "Cancel" (left header) and "Add" (right header)
- Scrollable form with top inset: 20px, bottom: 20px
- Submit button in header (disabled until valid input)

**Components**:
- Segmented control: "Task" | "Habit"
- Text input: Description (multiline for tasks)
- If Task: Week selector (1-4) and day range picker (D1-D30)
- If Habit: Toggle for daily reminder
- Preview card showing how item will appear

### 3. History Tab
**Purpose**: 30-day calendar visualization of completions
**Layout**:
- Header with current month name, filter chips (All/Tasks/Habits)
- ScrollView with top inset: headerHeight + 20px, bottom: tabBarHeight + 20px

**Components**:
- Calendar grid: 7 columns (Sun-Sat), 5 rows, cells show day number with completion indicator (emerald dot for tasks, violet for habits, both if mixed)
- Tapping cell shows bottom sheet with that day's completed items
- Legend at top: visual key for dot colors

### 4. Settings Screen (accessed from Today tab header)
**Purpose**: App preferences (no auth needed)
**Layout**:
- Standard header with "Settings" title, back button
- Scrollable grouped list, top inset: 20px, bottom: 20px

**Components**:
- Profile section: Avatar (preset checkmark icon), display name field
- Preferences: Theme (dark/darker), notification toggle, week start day
- Data: Export progress (JSON), Reset all data (with confirmation)

## Visual Design Details
- All checkboxes: 20x20px rounded squares, 2px border, emerald/violet fill when checked with white ✓
- Cards: 12px border radius, 1px border, 20px padding
- Progress bar: Full-width, 24px height, 9999px radius, gradient from emerald to lighter emerald, displays percentage text in white
- Touchable feedback: Reduce opacity to 0.7 on press
- Week/habit cards: Subtle elevation with shadowOffset (0,2), shadowOpacity 0.1, shadowRadius 4
- Day badges: Small rounded pills with slate background, white text
- Floating action button (Plan): 56x56px circle, emerald background, white + icon, shadow (0,4), 0.15 opacity, 6 radius

## Assets to Generate
1. **icon.png** - Emerald checkmark on slate background - Used: App icon
2. **splash-icon.png** - Glowing checkmark with progress ring - Used: Splash screen
3. **empty-tasks.png** - Minimalist clipboard with single checkmark - Used: Empty state in Today/Plan when no tasks exist
4. **empty-history.png** - Faded calendar grid outline - Used: History tab before any data
5. **avatar-preset.png** - Geometric checkmark avatar - Used: Default profile picture in Settings

## Empty States
- Today tab (no tasks): Show empty-tasks.png with text "Add your first task" + CTA button
- History tab (no data): Show empty-history.png with "Start tracking to see your progress"
- Week with no tasks: Subtle dashed border on card with "+ Add Task" centered