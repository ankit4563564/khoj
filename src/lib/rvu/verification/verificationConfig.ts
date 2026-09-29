/**
 * KHOJ — Phase 7: Verification Configuration
 * Configurable thresholds and engineering parameters for blind ownership verification.
 * 
 * NOTE: These are initial engineering hypotheses and are NOT calibrated probabilities.
 * Thresholds must later be calibrated using real KHOJ pilot data.
 */

export const VERIFICATION_CONFIG = {
  /**
   * Current algorithm and scoring policy versions.
   */
  ALGORITHM_VERSION: 'v1',
  CONFIG_VERSION: 'v1',

  /**
   * Maximum allowed verification attempts before failure or routing to manual review.
   */
  MAX_ATTEMPTS: 3,

  /**
   * Duration in milliseconds before an uncompleted verification session expires (24 hours).
   */
  SESSION_EXPIRY_MS: 24 * 60 * 60 * 1000,

  /**
   * Minimum verification score required to transition into the VERIFIED state.
   */
  MIN_VERIFIED_SCORE: 0.70,

  /**
   * Minimum score required for human staff review; below this is an outright failure.
   */
  MANUAL_REVIEW_THRESHOLD: 0.40,

  /**
   * Safety ceiling: Generic-only answers without distinctive evidence can never exceed this score.
   */
  GENERIC_ONLY_MAX_SCORE: 0.45,

  /**
   * Hard conflict cap: Answers that directly contradict protected evidence cannot exceed this score.
   */
  HARD_CONFLICT_MAX_SCORE: 0.20,

  /**
   * Number of sequential challenges presented per verification session (1–2 default).
   */
  DEFAULT_CHALLENGE_COUNT: 1,

  /**
   * Rate limiting parameters for security protection.
   */
  RATE_LIMIT_MAX_REQUESTS: 5,
  RATE_LIMIT_WINDOW_SECONDS: 3600,
};
