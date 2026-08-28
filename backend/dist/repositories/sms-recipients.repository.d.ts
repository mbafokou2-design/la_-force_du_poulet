export declare function parseConfiguredPhoneNumbers(value: string | undefined | null): string[];
export declare function getDefaultSmsRecipients(): string[];
export declare function ensureSmsRecipientsConfig(): Promise<void>;
export declare function getSmsRecipients(): Promise<string[]>;
export declare function setSmsRecipients(input: string[]): Promise<string[]>;
export declare function addSmsRecipient(phone: string): Promise<string[]>;
export declare function removeSmsRecipient(phone: string): Promise<string[]>;
//# sourceMappingURL=sms-recipients.repository.d.ts.map