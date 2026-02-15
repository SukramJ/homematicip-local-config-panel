# Homematic Config Panel

Frontend panel for the [Homematic(IP) Local](https://github.com/SukramJ/homematicip_local) Home Assistant integration. Provides a sidebar UI for editing Homematic device MASTER parameters directly from the Home Assistant interface.

## Features

- Browse all configurable devices grouped by RF interface
- View device status (RSSI, duty cycle, battery, reachability)
- Edit MASTER paramset values per channel with auto-generated forms
- Widget types: toggles, sliders, number inputs, dropdowns, radio groups, text inputs
- Validate changes before writing to the device
- Reset parameters to factory defaults
- Native HA confirmation dialogs and toast notifications
- Responsive layout for mobile and desktop
- Localization support (English, German)

## Architecture

```
src/
├── homematic-config.ts       # Main entry point (@customElement "homematic-config")
├── api.ts                    # WebSocket API client (listDevices, getFormSchema, putParamset, ...)
├── types.ts                  # TypeScript interfaces (HomeAssistant, DeviceInfo, FormSchema, ...)
├── styles.ts                 # Shared CSS with HA theme variables and responsive breakpoints
├── localize.ts               # i18n with dotted-key lookup and {placeholder} substitution
├── ha-helpers.ts             # HA-native showConfirmationDialog and showToast wrappers
├── views/
│   ├── device-list.ts        # Device list with entry selector, search, interface grouping
│   ├── device-detail.ts      # Device detail with maintenance status and channel list
│   └── channel-config.ts     # Channel config form with save/discard/reset actions
├── components/
│   ├── config-form.ts        # Form renderer (sections → parameters)
│   └── form-parameter.ts     # Individual parameter widget renderer
└── json.d.ts                 # TypeScript declaration for JSON imports
translations/
├── en.json                   # English translations
└── de.json                   # German translations
```

## View Navigation

```
device-list → device-detail → channel-config
     ↑              ↑               |
     └──────────────┴───── back ────┘
```

## WebSocket API

The panel communicates with the integration backend via four WebSocket commands:

| Command | Description |
|---------|-------------|
| `homematicip_local/config/list_devices` | List devices with configurable channels |
| `homematicip_local/config/get_form_schema` | Get auto-generated form schema for a channel |
| `homematicip_local/config/get_paramset` | Read current paramset values |
| `homematicip_local/config/put_paramset` | Validate and write paramset values |

## Development

### Prerequisites

- Node.js 18+
- npm

### Setup

```bash
npm install
```

### Build

```bash
# Production build (minified, single bundle)
npm run build

# Watch mode for development
npm run watch
```

### Type Check

```bash
npm run typecheck
```

### Deploy

After building, copy the bundle to the integration:

```bash
cp dist/homematic-config.js ../homematicip_local/custom_components/homematicip_local/frontend/
```

## Build Output

The build produces a single ES module bundle at `dist/homematic-config.js` (~52KB minified) that includes Lit and all panel code. This file is served by Home Assistant as a custom panel.

## Tech Stack

- **[Lit](https://lit.dev/)** 3.x - Web component framework
- **TypeScript** 5.x - Type-safe development
- **Rollup** 4.x - Module bundler
- **Terser** - Minification

## Related Projects

- [homematicip_local](https://github.com/SukramJ/homematicip_local) - Home Assistant integration (backend)
- [aiohomematic](https://github.com/SukramJ/aiohomematic) - Async Homematic communication library
- [aiohomematic-config](https://github.com/SukramJ/aiohomematic-config) - Form schema generator for paramset descriptions
