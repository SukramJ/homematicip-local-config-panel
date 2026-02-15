# CLAUDE.md - AI Assistant Guide for Homematic Config Panel

## Project Overview

**Project Name:** Homematic Config Panel
**Type:** Home Assistant Custom Panel (Frontend)
**Version:** 1.0.0
**Primary Language:** TypeScript
**Framework:** Lit 3.x
**Bundler:** Rollup 4.x

This is the frontend repository for the device configuration panel of the [homematicip_local](https://github.com/SukramJ/homematicip_local) Home Assistant integration. It produces a single ES module JS bundle that is served as a custom sidebar panel.

---

## Repository Structure

```
homematicip-local-config-panel/
├── src/
│   ├── homematic-config.ts       # Entry point, view router, entry resolver
│   ├── api.ts                    # WS API client + data interfaces
│   ├── types.ts                  # HomeAssistant, PanelInfo, EntryInfo interfaces
│   ├── styles.ts                 # Shared CSS (HA theme vars, responsive breakpoints)
│   ├── localize.ts               # i18n: flatten, cache, placeholder substitution
│   ├── ha-helpers.ts             # showConfirmationDialog, showToast via HA events
│   ├── json.d.ts                 # TypeScript declaration for JSON module imports
│   ├── views/
│   │   ├── device-list.ts        # Device list with search + interface grouping
│   │   ├── device-detail.ts      # Device detail, maintenance status, channel list
│   │   └── channel-config.ts     # Channel paramset editor with save/discard/reset
│   └── components/
│       ├── config-form.ts        # Renders FormSchema sections
│       └── form-parameter.ts     # Renders individual parameter widgets
├── translations/
│   ├── en.json                   # English
│   └── de.json                   # German
├── dist/                         # Build output (git-ignored)
│   └── homematic-config.js       # Single minified ES module bundle (~52KB)
├── package.json                  # Dependencies and scripts
├── tsconfig.json                 # TypeScript configuration
├── rollup.config.mjs             # Rollup bundler configuration
├── .gitignore
├── README.md
├── changelog.md
└── CLAUDE.md                     # This file
```

---

## Key Technologies

| Technology | Version | Purpose |
|------------|---------|---------|
| Lit | ^3.1.0 | Web component framework (LitElement, html, css) |
| TypeScript | ^5.4.0 | Type-safe development with strict mode |
| Rollup | ^4.0.0 | ES module bundler |
| @rollup/plugin-typescript | ^11.0.0 | TypeScript compilation |
| @rollup/plugin-node-resolve | ^15.0.0 | Node module resolution |
| @rollup/plugin-json | ^6.1.0 | JSON imports (translations) |
| @rollup/plugin-terser | ^0.4.0 | Minification |

---

## Development Commands

```bash
# Install dependencies
npm install

# Production build (minified)
npm run build

# Watch mode (rebuilds on changes)
npm run watch

# Type check without emitting
npm run typecheck

# Deploy bundle to integration repo
cp dist/homematic-config.js ../homematicip_local/custom_components/homematicip_local/frontend/
```

---

## Architecture

### View Navigation

The panel uses a simple 3-view router in `homematic-config.ts`:

```
device-list  →  device-detail  →  channel-config
     ↑               ↑                  |
     └───────────────┴───── back ───────┘
```

Navigation state is managed via `@state()` properties on the root element. Views communicate upward via CustomEvents (`device-selected`, `channel-selected`, `entry-changed`, `back`).

### WebSocket API

All data flows through `hass.callWS<T>()`. The four commands are defined in `api.ts`:

| Function | WS Command | Returns |
|----------|-----------|---------|
| `listDevices()` | `homematicip_local/config/list_devices` | `DeviceInfo[]` |
| `getFormSchema()` | `homematicip_local/config/get_form_schema` | `FormSchema` |
| `getParamset()` | `homematicip_local/config/get_paramset` | `Record<string, unknown>` |
| `putParamset()` | `homematicip_local/config/put_paramset` | `PutResult` |

### Form Schema

The backend (via `aiohomematic-config` `FormSchemaGenerator`) produces a `FormSchema` with:

- **sections**: Groups of related parameters (e.g. "General", "Timing")
- **parameters**: Individual settings with `widget` type, `min`/`max`/`step`, `options`, `current_value`, `default`, `writable`

Widget types: `toggle`, `slider_with_input`, `number_input`, `dropdown`, `radio_group`, `text_input`, `button`, `read_only`

### Change Tracking

`channel-config.ts` uses a `Map<string, unknown>` (`_pendingChanges`) to track edits:
- Setting a value different from `current_value` adds it to the map
- Setting it back to `current_value` removes it from the map
- `_isDirty` checks `size > 0`
- On save, the map is converted to a plain object and sent via `putParamset()`

### Localization

`localize.ts` loads translations from JSON, flattens nested keys to dotted paths (e.g. `channel_config.save`), and caches the result per language. Placeholder substitution uses `{name}` syntax. Language is read from `hass.config.language`.

### HA Integration Helpers

`ha-helpers.ts` provides two functions that dispatch DOM events caught by the HA shell:

- **`showConfirmationDialog(element, params)`** - Dispatches `hass-dialog` event, returns `Promise<boolean>`
- **`showToast(element, params)`** - Dispatches `hass-notification` event

---

## Styling Conventions

- Use HA CSS custom properties for all colors and theming:
  - `--primary-text-color`, `--secondary-text-color`
  - `--primary-color`, `--error-color`
  - `--card-background-color`, `--secondary-background-color`
  - `--divider-color`
  - `--paper-font-body1_-_font-family`
- Responsive breakpoint at `600px` for mobile layout
- Shared styles in `styles.ts`, component-specific styles in each element's `static styles`

---

## Adding a New Translation Key

1. Add the key to both `translations/en.json` and `translations/de.json`
2. Use via `this._l("section.key")` or `localize(this.hass, "section.key", { param: value })`

---

## Adding a New Widget Type

1. Add the case to `form-parameter.ts` `_renderWidget()` switch statement
2. Add any widget-specific CSS in the same file's `static styles`
3. Ensure mobile responsiveness via `@media (max-width: 600px)` rules

---

## Adding a New View

1. Create `src/views/new-view.ts` with `@customElement("hm-new-view")`
2. Import in `homematic-config.ts`
3. Add to the `PanelView` type union
4. Add the case to the `render()` switch
5. Wire navigation events

---

## Common Patterns

### LitElement Component

```typescript
import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { sharedStyles } from "../styles";
import type { HomeAssistant } from "../types";

@customElement("hm-example")
export class HmExample extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _loading = false;

  private _l(key: string, params?: Record<string, string | number>): string {
    return localize(this.hass, key, params);
  }

  render() {
    return html`<div>${this._l("example.key")}</div>`;
  }

  static styles = [sharedStyles, css`/* component styles */`];
}
```

### Emitting Navigation Events

```typescript
this.dispatchEvent(
  new CustomEvent("event-name", {
    detail: { /* data */ },
    bubbles: true,
    composed: true,
  })
);
```

---

## TypeScript Configuration

- **Target:** ES2022
- **Module:** ES2022 with bundler resolution
- **Strict mode:** enabled (`strict`, `noImplicitAny`, `noImplicitReturns`)
- **Decorators:** `experimentalDecorators: true`, `useDefineForClassFields: false` (required for Lit)

---

## Build Details

Rollup produces a single `dist/homematic-config.js` file:
- Format: ES module
- Lit is bundled inline (no external dependencies at runtime)
- Minified with terser (no comments)
- No source maps in production
- JSON translation files are inlined via `@rollup/plugin-json`

---

## Tips for AI Assistants

### Do's

- Always use Lit decorators (`@customElement`, `@property`, `@state`)
- Always use HA CSS custom properties for theming
- Always add mobile responsive styles for new components
- Always update both `en.json` and `de.json` when adding translations
- Always rebuild and copy bundle after changes: `npm run build && cp dist/homematic-config.js ...`
- Use `showConfirmationDialog()` / `showToast()` from `ha-helpers.ts` for user interactions

### Don'ts

- Never use `window.confirm()` or `window.alert()` - use HA-native helpers
- Never hardcode colors - use CSS custom properties
- Never import from `homeassistant` packages (this is a standalone build)
- Never add external runtime dependencies beyond Lit (keep bundle small)
- Never commit `dist/` or `node_modules/`

---

**Last Updated:** 2026-02-12
**Version:** 1.0.0
