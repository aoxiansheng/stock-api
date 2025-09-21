/**
 * Stream Response Utilities
 * Provides standardized response formats for WebSocket events
 */

import { STREAM_RECEIVER_ERROR_CODES } from '../constants/stream-receiver-error-codes.constants';

/**
 * Standard success response format
 */
export interface StreamSuccessResponse<T = any> {
  success: true;
  message: string;
  data?: T;
  timestamp: number;
}

/**
 * Standard error response format
 */
export interface StreamErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
}

/**
 * Creates a standardized success response
 */
export function createStreamSuccessResponse<T = any>(
  message: string,
  data?: T,
): StreamSuccessResponse<T> {
  return {
    success: true,
    message,
    data,
    timestamp: Date.now(),
  };
}

/**
 * Creates a standardized error response
 */
export function createStreamErrorResponse(
  code: string,
  message: string,
  details?: any,
): StreamErrorResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: Date.now(),
  };
}

/**
 * Stream-specific response helpers
 */
export const StreamResponses = {
  // Connection responses
  connected: (clientId: string) =>
    createStreamSuccessResponse("Connection established successfully", {
      clientId,
    }),

  // Subscription responses
  subscribeSuccess: (symbols: string[], wsCapabilityType: string) =>
    createStreamSuccessResponse("Subscription successful", {
      symbols,
      wsCapabilityType,
    }),

  subscribeError: (message: string, symbols?: string[]) =>
    createStreamErrorResponse(
      STREAM_RECEIVER_ERROR_CODES.SUBSCRIPTION_FAILED,
      message,
      { symbols },
    ),

  // Unsubscription responses
  unsubscribeSuccess: (symbols: string[]) =>
    createStreamSuccessResponse("Unsubscription successful", { symbols }),

  unsubscribeError: (message: string, symbols?: string[]) =>
    createStreamErrorResponse(
      STREAM_RECEIVER_ERROR_CODES.UNSUBSCRIBE_FAILED,
      message,
      { symbols },
    ),

  // Recovery responses
  recoveryStarted: (symbols: string[], estimatedDataPoints: string) =>
    createStreamSuccessResponse("Data recovery started, please wait for data transmission", {
      symbols,
      estimatedDataPoints,
    }),

  recoveryError: (type: string, message: string) =>
    createStreamErrorResponse(
      STREAM_RECEIVER_ERROR_CODES.RECOVERY_REQUEST_FAILED,
      message,
      { type },
    ),

  recoveryWindowExceeded: () =>
    createStreamErrorResponse(
      STREAM_RECEIVER_ERROR_CODES.RECOVERY_WINDOW_EXCEEDED,
      "Recovery time window too large, maximum 24 hours supported",
    ),

  // Validation errors
  validationError: (message: string, details?: any) =>
    createStreamErrorResponse(
      STREAM_RECEIVER_ERROR_CODES.DATA_VALIDATION_FAILED,
      message,
      details,
    ),

  // Generic status responses
  statusSuccess: <T>(data: T) =>
    createStreamSuccessResponse("Status retrieved successfully", data),

  statusError: (message: string) =>
    createStreamErrorResponse(
      STREAM_RECEIVER_ERROR_CODES.SUBSCRIPTION_NOT_FOUND,
      message,
    ),

  // Authentication error
  authenticationError: (reason: string) =>
    createStreamErrorResponse(
      STREAM_RECEIVER_ERROR_CODES.AUTHENTICATION_FAILED,
      "Authentication failed",
      { reason },
    ),
};