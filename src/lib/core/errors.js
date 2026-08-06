export class AppError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message, 403);
  }
}

export class NotFoundError extends AppError {
  constructor(message = "Not found.") {
    super(message, 404);
  }
}

export class ValidationError extends AppError {
  constructor(message = "Invalid request.", fieldErrors = {}) {
    super(message, 400);
    this.fieldErrors = fieldErrors;
  }
}