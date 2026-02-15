import { LitElement, html, css, nothing } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { sharedStyles } from "../styles";
import { getFormSchema, putParamset } from "../api";
import { localize } from "../localize";
import { showConfirmationDialog, showToast } from "../ha-helpers";
import "../components/config-form";
import type { HomeAssistant, FormSchema } from "../types";

@customElement("hm-channel-config")
export class HmChannelConfig extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property() public entryId = "";
  @property() public interfaceId = "";
  @property() public channelAddress = "";
  @property() public channelType = "";
  @property() public paramsetKey = "MASTER";

  @state() private _schema: FormSchema | null = null;
  @state() private _pendingChanges: Map<string, unknown> = new Map();
  @state() private _loading = true;
  @state() private _saving = false;
  @state() private _error = "";
  @state() private _validationErrors: Record<string, string> = {};

  updated(changedProps: Map<string, unknown>): void {
    if (
      (changedProps.has("channelAddress") || changedProps.has("entryId")) &&
      this.entryId &&
      this.channelAddress
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
      this._schema = await getFormSchema(
        this.hass,
        this.entryId,
        this.interfaceId,
        this.channelAddress,
        this.channelType,
        this.paramsetKey
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

  private _handleResetDefaults(): void {
    if (!this._schema) return;
    this._pendingChanges = new Map();
    for (const section of this._schema.sections) {
      for (const param of section.parameters) {
        if (param.writable && param.default !== undefined && param.default !== param.current_value) {
          this._pendingChanges.set(param.id, param.default);
        }
      }
    }
    this._pendingChanges = new Map(this._pendingChanges);
  }

  private async _handleSave(): Promise<void> {
    if (!this._isDirty || this._saving) return;

    const changes = Object.fromEntries(this._pendingChanges);
    const changeCount = Object.keys(changes).length;

    const changeSummary = Object.entries(changes)
      .map(([key, value]) => {
        const param = this._findParameter(key);
        const label = param?.label ?? key;
        const oldValue = param?.current_value ?? "?";
        return `${label}: ${oldValue} \u2192 ${value}`;
      })
      .join("\n");

    const confirmed = await showConfirmationDialog(this, {
      title: this._l("channel_config.confirm_save_title"),
      text: `${this._l("channel_config.confirm_save_text", { count: changeCount })}\n\n${changeSummary}`,
      confirmText: this._l("common.save"),
      dismissText: this._l("common.cancel"),
    });
    if (!confirmed) return;

    this._saving = true;
    this._validationErrors = {};

    try {
      const result = await putParamset(
        this.hass,
        this.entryId,
        this.interfaceId,
        this.channelAddress,
        changes,
        this.paramsetKey
      );

      if (result.success) {
        this._pendingChanges = new Map();
        showToast(this, { message: this._l("channel_config.save_success") });
        await this._fetchSchema();
      } else if (Object.keys(result.validation_errors).length > 0) {
        this._validationErrors = result.validation_errors;
        showToast(this, { message: this._l("channel_config.validation_failed") });
      }
    } catch (err) {
      this._error = String(err);
      showToast(this, { message: this._l("channel_config.save_failed") });
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
        title: this._l("channel_config.unsaved_title"),
        text: this._l("channel_config.unsaved_warning"),
        confirmText: this._l("channel_config.discard"),
        dismissText: this._l("common.cancel"),
        destructive: true,
      });
      if (!confirmed) return;
    }
    this.dispatchEvent(new CustomEvent("back", { bubbles: true, composed: true }));
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
        <h2>${this.channelAddress}</h2>
        <div class="device-info">
          ${this._schema?.channel_type ?? ""} \u2014 ${this.paramsetKey}
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
          @click=${this._handleResetDefaults}
          ?disabled=${this._saving}
        >
          ${this._l("channel_config.reset_defaults")}
        </button>
        <button
          class="btn btn-secondary"
          @click=${this._handleDiscard}
          ?disabled=${!this._isDirty || this._saving}
        >
          ${this._l("channel_config.discard")}
        </button>
        <button
          class="btn btn-primary"
          @click=${this._handleSave}
          ?disabled=${!this._isDirty || this._saving}
        >
          ${this._saving
            ? this._l("channel_config.saving")
            : this._l("channel_config.save")}
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
    `,
  ];
}
