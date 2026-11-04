export class AppError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

export const notFound = (what = 'Resource') => new AppError(404, `${what} not found`);
export const conflict = (message, details) => new AppError(409, message, details);
