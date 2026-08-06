export class AppError extends Error { constructor(message, status = 500) { super(message); this.status = status; } }
export class ForbiddenError extends AppError { constructor(m = "Forbidden") { super(m, 403); } }
export class NotFoundError extends AppError { constructor(m = "Not found.") { super(m, 404); } }
export class ValidationError extends AppError { constructor(m = "Invalid request.", fieldErrors = {}) { super(m, 400); this.fieldErrors = fieldErrors; } }