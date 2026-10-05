/** An error whose message is safe to show to the caller, with the HTTP status to use. */
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

export const unauthenticated = () => new HttpError(401, "Please sign in to continue.");
export const forbidden = (message = "You don't have permission to do that.") => new HttpError(403, message);
export const notFound = (message = "Not found.") => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);
export const tooMany = () => new HttpError(429, "Too many requests. Please try again shortly.");
