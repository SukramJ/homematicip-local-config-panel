import { LitElement, html, css, PropertyValues } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import "./views/device-list";
import "./views/device-detail";
import "./views/channel-config";
import type { HomeAssistant, PanelInfo, EntryInfo } from "./types";

type PanelView = "device-list" | "device-detail" | "channel-config";

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
    this._resolveEntryId();
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
    if (detail?.device) this._selectedDevice = detail.device;
    if (detail?.interfaceId) this._selectedInterfaceId = detail.interfaceId;
    if (detail?.channel) this._selectedChannel = detail.channel;
    if (detail?.channelType) this._selectedChannelType = detail.channelType;
    if (detail?.paramsetKey) this._selectedParamsetKey = detail.paramsetKey;
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
