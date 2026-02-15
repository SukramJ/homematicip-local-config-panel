import type { HomeAssistant } from "./types";

export interface DeviceInfo {
  address: string;
  interface_id: string;
  model: string;
  name: string;
  firmware: string;
  channels: ChannelInfo[];
}

export interface ChannelInfo {
  address: string;
  channel_type: string;
  paramset_keys: string[];
}

export interface FormSchema {
  channel_address: string;
  channel_type: string;
  sections: FormSection[];
  total_parameters: number;
  writable_parameters: number;
}

export interface FormSection {
  id: string;
  title: string;
  parameters: FormParameter[];
}

export interface FormParameter {
  id: string;
  label: string;
  type: string;
  widget: string;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  default?: unknown;
  current_value: unknown;
  writable: boolean;
  modified: boolean;
  options?: string[];
}

export interface PutResult {
  success: boolean;
  validated: boolean;
  validation_errors: Record<string, string>;
}

export async function listDevices(
  hass: HomeAssistant,
  entryId: string
): Promise<DeviceInfo[]> {
  const result = await hass.callWS<{ devices: DeviceInfo[] }>({
    type: "homematicip_local/config/list_devices",
    entry_id: entryId,
  });
  return result.devices;
}

export async function getFormSchema(
  hass: HomeAssistant,
  entryId: string,
  interfaceId: string,
  channelAddress: string,
  channelType = "",
  paramsetKey = "MASTER"
): Promise<FormSchema> {
  return hass.callWS<FormSchema>({
    type: "homematicip_local/config/get_form_schema",
    entry_id: entryId,
    interface_id: interfaceId,
    channel_address: channelAddress,
    channel_type: channelType,
    paramset_key: paramsetKey,
  });
}

export async function getParamset(
  hass: HomeAssistant,
  entryId: string,
  interfaceId: string,
  channelAddress: string,
  paramsetKey = "MASTER"
): Promise<Record<string, unknown>> {
  const result = await hass.callWS<{ values: Record<string, unknown> }>({
    type: "homematicip_local/config/get_paramset",
    entry_id: entryId,
    interface_id: interfaceId,
    channel_address: channelAddress,
    paramset_key: paramsetKey,
  });
  return result.values;
}

export async function putParamset(
  hass: HomeAssistant,
  entryId: string,
  interfaceId: string,
  channelAddress: string,
  values: Record<string, unknown>,
  paramsetKey = "MASTER",
  validate = true
): Promise<PutResult> {
  return hass.callWS<PutResult>({
    type: "homematicip_local/config/put_paramset",
    entry_id: entryId,
    interface_id: interfaceId,
    channel_address: channelAddress,
    paramset_key: paramsetKey,
    values,
    validate,
  });
}
