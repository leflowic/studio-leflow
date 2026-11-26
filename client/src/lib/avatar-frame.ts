// "Zlatni okvir za avatar" - a Studio Coins shop item. users.avatar_frame_until
// holds the expiry; while it's in the future the avatar gets an oak ring.

export function hasAvatarFrame(until: string | Date | null | undefined): boolean {
  return !!until && new Date(until) > new Date();
}

/** Ring classes for a framed avatar (needs a ring-offset color matching the surface behind it). */
export const AVATAR_FRAME_CLASS = "ring-2 ring-primary ring-offset-2 ring-offset-background";
