/**
 * KHOJ — Phase 8: Recovery Configuration
 * Configurable parameters and approved safe campus handover points.
 */

export const RECOVERY_CONFIG = {
  WORKFLOW_VERSION: 'v1',

  /**
   * Predefined safe campus handover locations.
   * Prohibits private or off-campus meetups to safeguard students.
   */
  APPROVED_CAMPUS_LOCATIONS: [
    'Library Help Desk',
    'Security Desk (Main Gate)',
    'Student Services Centre',
    'Main Reception (Admin Block)',
    'Cafeteria Help Desk',
    'Campus Reception Desk',
  ] as const,

  DEFAULT_LOCATION: 'Library Help Desk',

  /**
   * Proposal expiration period (24 hours without response).
   */
  PROPOSAL_EXPIRY_MS: 24 * 60 * 60 * 1000,

  /**
   * Uncompleted handover expiration period (72 hours after scheduled date).
   */
  HANDOVER_EXPIRY_MS: 72 * 60 * 60 * 1000,

  /**
   * Finder action token validity period (72 hours).
   */
  ACTION_TOKEN_EXPIRY_MS: 72 * 60 * 60 * 1000,
};

export type ApprovedCampusLocation = typeof RECOVERY_CONFIG.APPROVED_CAMPUS_LOCATIONS[number];
