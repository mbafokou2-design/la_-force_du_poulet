export function getOrangeSmsDeliveryCallbackUrl(): string {
  return (
    process.env.ORANGE_SMS_DR_CALLBACK_URL ||
    process.env.ORANGE_SMS_CALLBACK_URL ||
    `${process.env.PUBLIC_BASE_URL || "http://localhost:4000"}/api/webhooks/orange/sms-dr`
  );
}

