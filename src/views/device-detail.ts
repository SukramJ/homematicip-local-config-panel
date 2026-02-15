import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { sharedStyles } from "../styles";
import { listDevices, getParamset } from "../api";
import { localize } from "../localize";
import type { HomeAssistant, DeviceInfo, ChannelInfo } from "../types";

/** Maintenance VALUES parameters to display in the status summary. */
const MAINTENANCE_STATUS_PARAMS = [
  "RSSI_DEVICE",
  "RSSI_PEER",
  "DUTY_CYCLE",
  "LOW_BAT",
  "UNREACH",
  "SABOTAGE",
  "CONFIG_PENDING",
  "UPDATE_PENDING",
] as const;

@customElement("hm-device-detail")
export class HmDeviceDetail extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property() public entryId = "";
  @property() public interfaceId = "";
  @property() public deviceAddress = "";

  @state() private _device: DeviceInfo | null = null;
  @state() private _maintenanceValues: Record<string, unknown> = {};
  @state() private _loading = true;
  @state() private _error = "";

  updated(changedProps: Map<string, unknown>): void {
    if (
      (changedProps.has("entryId") || changedProps.has("deviceAddress")) &&
      this.entryId &&
      this.deviceAddress
    ) {
      this._fetchDevice();
    }
  }

  private async _fetchDevice(): Promise<void> {
    this._loading = true;
    this._error = "";
    try {
      const devices = await listDevices(this.hass, this.entryId);
      this._device =
        devices.find((d) => d.address === this.deviceAddress) ?? null;

      if (this._device) {
        const ch0 = this._device.channels.find((c) =>
          c.address.endsWith(":0")
        );
        if (ch0 && ch0.paramset_keys.includes("VALUES")) {
          this._maintenanceValues = await getParamset(
            this.hass,
            this.entryId,
            this.interfaceId,
            ch0.address,
            "VALUES"
          );
        }
      }
    } catch (err) {
      this._error = String(err);
    } finally {
      this._loading = false;
    }
  }

  private _l(key: string, params?: Record<string, string | number>): string {
    return localize(this.hass, key, params);
  }

  private _handleBack(): void {
    this.dispatchEvent(new CustomEvent("back", { bubbles: true, composed: true }));
  }

  private _handleChannelClick(channel: ChannelInfo): void {
    this.dispatchEvent(
      new CustomEvent("channel-selected", {
        detail: {
          channel: channel.address,
          interfaceId: this.interfaceId,
          channelType: channel.channel_type,
          paramsetKey: "MASTER",
        },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    if (this._loading) {
      return html`<div class="loading">${this._l("common.loading")}</div>`;
    }
    if (this._error) {
      return html`<div class="error">${this._error}</div>`;
    }
    if (!this._device) {
      return html`<div class="empty-state">${this._l("device_detail.not_found")}</div>`;
    }

    const device = this._device;
    const ch0 = device.channels.find((c) => c.address.endsWith(":0"));
    const otherChannels = device.channels.filter((c) => !c.address.endsWith(":0"));

    return html`
      <button class="back-button" @click=${this._handleBack}>
        \u25C2 ${this._l("common.back")}
      </button>

      <div class="device-header">
        <h2>${device.model} \u2014 ${device.name}</h2>
        <div class="device-info">
          ${this._l("device_detail.address")}: ${device.address} |
          ${this._l("device_detail.firmware")}: ${device.firmware}
        </div>
      </div>

      ${ch0 ? this._renderMaintenanceChannel(ch0) : nothing}
      ${otherChannels.map((ch) => this._renderChannel(ch))}
    `;
  }

  private _renderMaintenanceChannel(channel: ChannelInfo) {
    const hasStatus = Object.keys(this._maintenanceValues).length > 0;
    const hasMaster = channel.paramset_keys.includes("MASTER");

    return html`
      <div class="channel-card maintenance">
        <div class="channel-header">
          ${this._l("device_detail.channel")} 0: ${channel.channel_type}
        </div>
        ${hasStatus ? this._renderStatusSummary() : nothing}
        ${hasMaster
          ? html`
              <div class="channel-actions">
                <button
                  class="configure-button"
                  @click=${() => this._handleChannelClick(channel)}
                >
                  ${this._l("device_detail.configure_master")} \u25B8
                </button>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private _renderStatusSummary() {
    const vals = this._maintenanceValues;
    const items: { label: string; value: string; icon: string }[] = [];

    for (const param of MAINTENANCE_STATUS_PARAMS) {
      if (!(param in vals)) continue;
      const raw = vals[param];
      let display: string;
      let icon: string;

      switch (param) {
        case "RSSI_DEVICE":
          display = `${raw} dBm`;
          icon = "\uD83D\uDCF6";
          break;
        case "RSSI_PEER":
          display = `${raw} dBm`;
          icon = "\uD83D\uDCF6";
          break;
        case "DUTY_CYCLE":
          display = typeof raw === "number" ? `${raw.toFixed(1)}%` : String(raw);
          icon = "\u23F1";
          break;
        case "LOW_BAT":
          display = raw ? this._l("device_detail.yes") : this._l("device_detail.no");
          icon = raw ? "\uD83D\uDD0B" : "\uD83D\uDD0B";
          break;
        case "UNREACH":
          display = raw ? this._l("device_detail.unreachable") : this._l("device_detail.reachable");
          icon = raw ? "\u274C" : "\u2705";
          break;
        default:
          display = String(raw);
          icon = "\u2139\uFE0F";
      }

      items.push({ label: param.replace(/_/g, " "), value: display, icon });
    }

    if (items.length === 0) return nothing;

    return html`
      <div class="status-grid">
        ${items.map(
          (item) => html`
            <div class="status-item">
              <span class="status-icon">${item.icon}</span>
              <span>${item.label}: ${item.value}</span>
            </div>
          `
        )}
      </div>
    `;
  }

  private _renderChannel(channel: ChannelInfo) {
    const channelNo = channel.address.split(":").pop() ?? "";
    const hasMaster = channel.paramset_keys.includes("MASTER");

    return html`
      <div class="channel-card">
        <div class="channel-header">
          ${this._l("device_detail.channel")} ${channelNo}: ${channel.channel_type}
        </div>
        ${hasMaster
          ? html`
              <div class="channel-actions">
                <button
                  class="configure-button"
                  @click=${() => this._handleChannelClick(channel)}
                >
                  ${this._l("device_detail.configure_master")} \u25B8
                </button>
              </div>
            `
          : html`
              <div class="channel-no-config">
                ${this._l("device_detail.no_master_config")}
              </div>
            `}
      </div>
    `;
  }

  static styles = [
    sharedStyles,
    css`
      .device-header {
        margin-bottom: 16px;
      }

      .device-header h2 {
        margin: 8px 0 4px;
        font-size: 20px;
        font-weight: 400;
      }

      .channel-card {
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: 8px;
        margin-bottom: 12px;
        overflow: hidden;
      }

      .channel-card.maintenance {
        border-color: var(--primary-color, #03a9f4);
      }

      .channel-header {
        font-size: 14px;
        font-weight: 500;
        padding: 12px 16px;
        background: var(--secondary-background-color, #fafafa);
        border-bottom: 1px solid var(--divider-color, #e0e0e0);
      }

      .channel-actions {
        padding: 8px 16px;
      }

      .channel-no-config {
        padding: 8px 16px;
        color: var(--secondary-text-color);
        font-size: 13px;
      }

      .configure-button {
        background: none;
        border: 1px solid var(--primary-color, #03a9f4);
        color: var(--primary-color, #03a9f4);
        padding: 6px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-family: inherit;
      }

      .configure-button:hover {
        background: var(--primary-color, #03a9f4);
        color: #fff;
      }
    `,
  ];
}
