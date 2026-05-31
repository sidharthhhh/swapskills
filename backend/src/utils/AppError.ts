/**
 * Custom application error class.
 * - statusCode: HTTP status code to return
 * - clientMessage: Safe message to send to the client (no internal details)
 * - isOperational: Distinguishes expected errors from programming bugs
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly clientMessage: string;
  public readonly isOperational: boolean;

  constructor(
    statusCode: number,
    clientMessage: string,
    isOperational = true
  ) {
    super(clientMessage);
    this.statusCode = statusCode;
    this.clientMessage = clientMessage;
    this.isOperational = isOperational;

    // Maintain proper prototype chain
    Object.setPrototypeOf(this, AppError.prototype);

    // Capture stack trace excluding the constructor
    Error.captureStackTrace(this, this.constructor);
  }
}
