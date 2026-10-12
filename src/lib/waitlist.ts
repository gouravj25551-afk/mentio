/** Keep the app in its prelaunch state until the launch switch is explicitly disabled. */
export const waitlistMode = process.env.WAITLIST_MODE !== "false";
