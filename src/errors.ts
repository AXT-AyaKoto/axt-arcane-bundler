/** An expected failure: the CLI prints only the message and exits with code 1. */
export class UserError extends Error {
  override name = "UserError";
}
