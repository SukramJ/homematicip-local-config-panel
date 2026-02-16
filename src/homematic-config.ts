import { LitElement, html, css } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "./views/device-list";
import "./views/device-detail";
import "./views/channel-config";
import "./views/change-history";
import type { HomeAssistant, PanelInfo, EntryInfo } from "./types";

type PanelView = "device-list" | "device-detail" | "channel-config" | "change-history";

@customElement("homematic-config")
export class HomematicConfigPanel extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public panel!: PanelInfo;
  @property({ type: Boolean, reflect: true }) public narrow = false;

  @state() private _view: PanelView = "device-list";
  @state() private _entryId = "";
  @state() private _entries: EntryInfo[] = [];
  @state() private _selectedDevice = "";
  @state() private _selectedInterfaceId = "";
  @state() private _selectedChannel = "";
  @state() private _selectedChannelType = "";
  @state() private _selectedParamsetKey = "MASTER";

  connectedCallback(): void {
    super.connectedCallback();
    this._resolveEntryId().then(() => this._parseUrlHash());
    window.addEventListener("popstate", this._onPopState);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener("popstate", this._onPopState);
  }

  private _onPopState = (): void => {
    this._parseUrlHash();
  };

  private _parseUrlHash(): void {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);

    const view = params.get("view") as PanelView | null;
    const entryId = params.get("entry") || this._entryId;
    const device = params.get("device") || "";
    const interfaceId = params.get("interface") || "";
    const channel = params.get("channel") || "";
    const channelType = params.get("channel_type") || "";
    const paramsetKey = params.get("paramset") || "MASTER";

    if (entryId) this._entryId = entryId;
    if (view) {
      this._navigateTo(view, {
        device,
        interfaceId,
        channel,
        channelType,
        paramsetKey,
      });
    }
  }

  private _updateUrlHash(): void {
    const params = new URLSearchParams();
    params.set("view", this._view);
    if (this._entryId) params.set("entry", this._entryId);

    if (this._view !== "device-list") {
      if (this._selectedDevice) params.set("device", this._selectedDevice);
      if (this._selectedInterfaceId) params.set("interface", this._selectedInterfaceId);
    }
    if (this._view === "channel-config") {
      if (this._selectedChannel) params.set("channel", this._selectedChannel);
      if (this._selectedChannelType) params.set("channel_type", this._selectedChannelType);
      if (this._selectedParamsetKey !== "MASTER") {
        params.set("paramset", this._selectedParamsetKey);
      }
    }

    const hash = params.toString();
    window.history.replaceState(null, "", `#${hash}`);
  }

  private async _resolveEntryId(): Promise<void> {
    const entries = await this.hass.callWS<
      { entry_id: string; domain: string; state: string; title: string }[]
    >({
      type: "config_entries/get",
      domain: "homematicip_local",
    });
    this._entries = entries
      .filter((e) => e.state === "loaded")
      .map((e) => ({ entry_id: e.entry_id, title: e.title }));

    if (this._entries.length === 1) {
      this._entryId = this._entries[0].entry_id;
    }
  }

  private _navigateTo(
    view: PanelView,
    detail?: {
      device?: string;
      interfaceId?: string;
      channel?: string;
      channelType?: string;
      paramsetKey?: string;
    }
  ): void {
    this._view = view;
    if (detail?.device !== undefined) this._selectedDevice = detail.device;
    if (detail?.interfaceId !== undefined) this._selectedInterfaceId = detail.interfaceId;
    if (detail?.channel !== undefined) this._selectedChannel = detail.channel;
    if (detail?.channelType !== undefined) this._selectedChannelType = detail.channelType;
    if (detail?.paramsetKey !== undefined) this._selectedParamsetKey = detail.paramsetKey;
    this._updateUrlHash();
  }

  render() {
    switch (this._view) {
      case "device-list":
        return html`
          <hm-device-list
            .hass=${this.hass}
            .entryId=${this._entryId}
            .entries=${this._entries}
            @entry-changed=${(e: CustomEvent) => {
              this._entryId = e.detail.entryId;
              this._updateUrlHash();
            }}
            @device-selected=${(e: CustomEvent) =>
              this._navigateTo("device-detail", e.detail)}
          ></hm-device-list>
        `;
      case "device-detail":
        return html`
          <hm-device-detail
            .hass=${this.hass}
            .entryId=${this._entryId}
            .interfaceId=${this._selectedInterfaceId}
            .deviceAddress=${this._selectedDevice}
            @channel-selected=${(e: CustomEvent) =>
              this._navigateTo("channel-config", e.detail)}
            @show-history=${(e: CustomEvent) =>
              this._navigateTo("change-history", e.detail)}
            @back=${() => this._navigateTo("device-list")}
          ></hm-device-detail>
        `;
      case "channel-config":
        return html`
          <hm-channel-config
            .hass=${this.hass}
            .entryId=${this._entryId}
            .interfaceId=${this._selectedInterfaceId}
            .channelAddress=${this._selectedChannel}
            .channelType=${this._selectedChannelType}
            .paramsetKey=${this._selectedParamsetKey}
            @back=${() =>
              this._navigateTo("device-detail", {
                device: this._selectedDevice,
                interfaceId: this._selectedInterfaceId,
              })}
          ></hm-channel-config>
        `;
      case "change-history":
        return html`
          <hm-change-history
            .hass=${this.hass}
            .entryId=${this._entryId}
            .filterDevice=${this._selectedDevice}
            @back=${() =>
              this._navigateTo(
                this._selectedDevice ? "device-detail" : "device-list",
                this._selectedDevice
                  ? { device: this._selectedDevice, interfaceId: this._selectedInterfaceId }
                  : undefined
              )}
          ></hm-change-history>
        `;
    }
  }

  static styles = css`
    :host {
      display: block;
      padding: 16px;
      max-width: 1200px;
      margin: 0 auto;
      font-family: var(--paper-font-body1_-_font-family, "Roboto", sans-serif);
      color: var(--primary-text-color);
      background-color: var(--primary-background-color);
    }

    @media (max-width: 600px) {
      :host {
        padding: 8px;
      }
    }
  `;
}
