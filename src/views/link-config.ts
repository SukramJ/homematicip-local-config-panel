import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { sharedStyles } from "../styles";
import { getLinkFormSchema, putLinkParamset } from "../api";
import { localize } from "../localize";
import { showConfirmationDialog, showToast } from "../ha-helpers";
import "../components/config-form";
import type { HomeAssistant, FormSchema } from "../types";

@customElement("hm-link-config")
export class HmLinkConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property() public entryId = "";
  @property() public interfaceId = "";
  @property() public senderAddress = "";
  @property() public receiverAddress = "";

  @state() private _schema: FormSchema | null = null;
  @state() private _pendingChanges: Map<string, unknown> = new Map();
  @state() private _loading = true;
  @state() private _saving = false;
  @state() private _error = "";
  @state() private _validationErrors: Record<string, string> = {};

  updated(changedProps: Map<string, unknown>): void {
    if (
      (changedProps.has("senderAddress") ||
        changedProps.has("receiverAddress") ||
        changedProps.has("entryId")) &&
      this.entryId &&
      this.senderAddress &&
      this.receiverAddress
    ) {
      this._fetchSchema();
    }
  }

  private async _fetchSchema(): Promise<void> {
    this._loading = true;
    this._error = "";
    this._pendingChanges = new Map();
    this._validationErrors = {};
    try {
      this._schema = await getLinkFormSchema(
        this.hass,
        this.entryId,
        this.interfaceId,
        this.senderAddress,
        this.receiverAddress
      );
    } catch (err) {
      this._error = String(err);
    } finally {
      this._loading = false;
    }
  }

  private _l(key: string, params?: Record<string, string | number>): string {
    return localize(this.hass, key, params);
  }

  private get _isDirty(): boolean {
    return this._pendingChanges.size > 0;
  }

  private _handleValueChanged(e: CustomEvent): void {
    const { parameterId, value, currentValue } = e.detail;

    if (value === currentValue) {
      this._pendingChanges.delete(parameterId);
    } else {
      this._pendingChanges.set(parameterId, value);
    }
    this._pendingChanges = new Map(this._pendingChanges);
  }

  private _handleDiscard(): void {
    this._pendingChanges = new Map();
    this._validationErrors = {};
  }

  private async _handleSave(): Promise<void> {
    if (!this._isDirty || this._saving) return;

    const changeCount = this._pendingChanges.size;
    const changeSummary = [...this._pendingChanges.entries()]
      .map(([key, value]) => {
        const param = this._findParameter(key);
        const label = param?.label ?? key;
        const oldValue = param?.current_value ?? "?";
        return `${label}: ${oldValue} \u2192 ${value}`;
      })
      .join("\n");

    const confirmed = await showConfirmationDialog(this, {
      title: this._l("link_config.confirm_save_title"),
      text: `${this._l("link_config.confirm_save_text", { count: changeCount })}\n\n${changeSummary}`,
      confirmText: this._l("common.save"),
      dismissText: this._l("common.cancel"),
    });
    if (!confirmed) return;

    this._saving = true;
    this._validationErrors = {};

    try {
      const result = await putLinkParamset(
        this.hass,
        this.entryId,
        this.interfaceId,
        this.senderAddress,
        this.receiverAddress,
        Object.fromEntries(this._pendingChanges)
      );
      if (result.success) {
        this._pendingChanges = new Map();
        showToast(this, { message: this._l("link_config.save_success") });
        await this._fetchSchema();
      }
    } catch (err) {
      this._error = String(err);
      showToast(this, { message: this._l("link_config.save_failed") });
    } finally {
      this._saving = false;
    }
  }

  private _findParameter(parameterId: string) {
    if (!this._schema) return undefined;
    for (const section of this._schema.sections) {
      const found = section.parameters.find((p) => p.id === parameterId);
      if (found) return found;
    }
    return undefined;
  }

  private async _handleBack(): Promise<void> {
    if (this._isDirty) {
      const confirmed = await showConfirmationDialog(this, {
        title: this._l("link_config.unsaved_title"),
        text: this._l("link_config.unsaved_warning"),
        confirmText: this._l("link_config.discard"),
        dismissText: this._l("common.cancel"),
        destructive: true,
      });
      if (!confirmed) return;
    }
    this.dispatchEvent(
      new CustomEvent("back", { bubbles: true, composed: true })
    );
  }

  render() {
    if (this._loading) {
      return html`<div class="loading">${this._l("common.loading")}</div>`;
    }
    if (this._error && !this._schema) {
      return html`<div class="error">${this._error}</div>`;
    }

    return html`
      <button class="back-button" @click=${this._handleBack}>
        \u25C2 ${this._l("common.back")}
      </button>

      <div class="config-header">
        <h2>${this._l("link_config.title")}</h2>
        <div class="link-info-bar">
          <div class="link-endpoint">
            <span class="link-label">${this._l("link_config.sender")}</span>
            <span class="link-address">${this.senderAddress}</span>
          </div>
          <span class="link-direction-arrow">\u2192</span>
          <div class="link-endpoint">
            <span class="link-label">${this._l("link_config.receiver")}</span>
            <span class="link-address">${this.receiverAddress}</span>
          </div>
        </div>
      </div>

      ${this._error ? html`<div class="error">${this._error}</div>` : nothing}

      ${this._schema
        ? html`
            <hm-config-form
              .hass=${this.hass}
              .schema=${this._schema}
              .pendingChanges=${this._pendingChanges}
              .validationErrors=${this._validationErrors}
              @value-changed=${this._handleValueChanged}
            ></hm-config-form>
          `
        : nothing}

      <div class="action-bar">
        <button
          class="btn btn-secondary"
          @click=${this._handleDiscard}
          ?disabled=${!this._isDirty || this._saving}
        >
          ${this._l("link_config.discard")}
        </button>
        <button
          class="btn btn-primary"
          @click=${this._handleSave}
          ?disabled=${!this._isDirty || this._saving}
        >
          ${this._saving ? this._l("channel_config.saving") : this._l("common.save")}
        </button>
      </div>
    `;
  }

  static styles = [
    sharedStyles,
    css`
      .config-header {
        margin-bottom: 16px;
      }

      .config-header h2 {
        margin: 8px 0 4px;
        font-size: 20px;
        font-weight: 400;
      }

      .link-info-bar {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 12px;
        background: var(--secondary-background-color, #fafafa);
        border-radius: 8px;
        margin-top: 8px;
      }

      .link-endpoint {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .link-label {
        font-size: 11px;
        text-transform: uppercase;
        color: var(--secondary-text-color);
        font-weight: 500;
      }

      .link-address {
        font-family: monospace;
        font-size: 14px;
      }

      .link-direction-arrow {
        font-size: 20px;
        color: var(--primary-color, #03a9f4);
        flex-shrink: 0;
      }

      .btn {
        padding: 8px 20px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-family: inherit;
        border: 1px solid transparent;
      }

      .btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .btn-primary {
        background: var(--primary-color, #03a9f4);
        color: #fff;
        border-color: var(--primary-color, #03a9f4);
      }

      .btn-primary:hover:not(:disabled) {
        opacity: 0.9;
      }

      .btn-secondary {
        background: transparent;
        color: var(--primary-text-color);
        border-color: var(--divider-color, #e0e0e0);
      }

      .btn-secondary:hover:not(:disabled) {
        background: var(--secondary-background-color, #f5f5f5);
      }

      @media (max-width: 600px) {
        .link-info-bar {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }

        .link-direction-arrow {
          align-self: center;
        }
      }
    `,
  ];
}
