# Changelog

## 1.0.1 (2026-02-16)

### Changed

- Updated `@rollup/plugin-node-resolve` from ^15.0.0 to ^16.0.0
- Updated `@rollup/plugin-typescript` from ^11.0.0 to ^12.0.0

## 1.0.0 (2026-02-12)

### Added

- Initial release of the Homematic device configuration panel
- **Device list view**: Browse configurable devices with search filter and interface grouping
- **Device detail view**: Maintenance status summary (RSSI, duty cycle, battery, reachability) and channel overview
- **Channel config view**: Auto-generated forms for editing MASTER paramset values with save, discard, and reset-to-defaults actions
- **Form widgets**: Toggle, slider with number input, number input, dropdown, radio group, text input, button, read-only display
- **HA-native dialogs**: Confirmation dialogs for save and unsaved changes via `hass-dialog` events
- **Toast notifications**: Success, validation failure, and error notifications via `hass-notification` events
- **Responsive layout**: Mobile-optimized CSS for screens under 600px (stacked parameters, full-width controls, stacked action buttons)
- **Localization**: English and German translations with dotted-key lookup and `{placeholder}` substitution
- **Multi-entry support**: CCU selector when multiple integration entries are configured
- **WebSocket API client**: Four commands for list_devices, get_form_schema, get_paramset, put_paramset
