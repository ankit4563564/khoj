/**
 * KHOJ — Phase 9: Reward Configuration Constants
 */

export const REWARD_CONFIG = {
  THANK_YOU_AMOUNT_INR: 20,
  
  // Standard VPA format validation: username@bank / username@upi
  // Supports alphanumeric characters, dots, dashes, and underscores.
  UPI_REGEX: /^[a-zA-Z0-9.\-_]{2,64}@[a-zA-Z0-9]{2,64}$/,

  // Expiration periods
  WAITING_FOR_UPI_TIMEOUT_HOURS: 72,
  PAYMENT_PENDING_TIMEOUT_HOURS: 168, // 7 days

  DISCLAIMER_TEXT:
    "KHOJ does not process or hold this payment. You pay the finder directly using your UPI app.",
} as const;
