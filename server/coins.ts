// Studio Coins earning rules outside the Ploča dana itself. Amounts are the
// owner-approved starting values (2026-11-26); every payout goes through the
// coin_ledger unique (reason, ref_id) index, so an event can never pay twice.

export const TESTIMONIAL_COINS = 100;        // approved testimonial (site, never Google)
export const REFERRAL_COINS = 100;           // each side, once the invitee is active
export const REFERRAL_ACTIVE_DAYS = 3;       // invitee must play/spin on this many different days
export const REFERRAL_MONTHLY_CAP = 10;      // max paid referrals per inviter per month
export const REFERRAL_CLAIM_WINDOW_HOURS = 72; // a code can only be claimed by a fresh account
export const LEADERBOARD_COINS = [100, 50, 25]; // Pogodi Pesmu weekly places 1-3
export const SPIN_STREAK_DAYS = 7;           // every 7th day in a row on the Ploča...
export const SPIN_STREAK_COINS = 50;         // ...pays this bonus

/** Ledger ref for a weekly leaderboard payout: unique per week + place. */
export function leaderboardRef(weekStart: string, place: number): number {
  return Number(weekStart.replace(/-/g, "")) * 10 + place;
}

const CODE_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
export function makeReferralCode(): string {
  let out = "";
  for (let i = 0; i < 7; i++) out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return out;
}
