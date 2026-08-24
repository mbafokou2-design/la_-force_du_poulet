import { getConfiguredPublicBaseUrl } from "../utils/public-url";

export function getOrangeSmsDeliveryCallbackUrl(): string {
  return (
    process.env.ORANGE_SMS_DR_CALLBACK_URL ||
    process.env.ORANGE_SMS_CALLBACK_URL ||
    `${getConfiguredPublicBaseUrl()}/api/webhooks/orange/sms-dr`
  );
}
