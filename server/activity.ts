import { sql } from "drizzle-orm";
import { db } from "./db";

// Earned rank. Points come from real activity, weighted so they can't be
// farmed by spamming: posts and comments count per *active day*, not per item,
// and likes only count from other users.
//
//   correct "Pogodi Pesmu" guess    10
//   day with at least one post       3
//   day with at least one comment    1
//   like received from someone else  1
//   approved giveaway project       15
//   vote received on a project       1
//
// Ranks only ever go UP automatically (user -> vip -> legend). Staff-set ranks
// and the "admin" rank are never lowered or touched by this.

export const RANK_THRESHOLDS = { vip: 150, legend: 600 } as const;

export const POINT_RULES = [
  { label: "Tačan odgovor u igri Pogodi Pesmu", points: 10 },
  { label: "Dan kad si objavio nešto u zajednici", points: 3 },
  { label: "Dan kad si komentarisao", points: 1 },
  { label: "Lajk na tvoju objavu", points: 1 },
  { label: "Odobren projekat na giveaway-u", points: 15 },
  { label: "Glas za tvoj projekat", points: 1 },
];

const POINTS_SQL = sql`
  SELECT u.id AS user_id, u.rank AS rank,
    COALESCE(g.correct, 0) * 10
    + COALESCE(p.days, 0) * 3
    + COALESCE(c.days, 0) * 1
    + COALESCE(l.likes, 0) * 1
    + COALESCE(pr.approved, 0) * 15
    + COALESCE(pr.votes, 0) * 1 AS points
  FROM users u
  LEFT JOIN (SELECT user_id, COUNT(*) FILTER (WHERE correct) AS correct FROM daily_guesses GROUP BY user_id) g ON g.user_id = u.id
  LEFT JOIN (SELECT user_id, COUNT(DISTINCT created_at::date) AS days FROM posts GROUP BY user_id) p ON p.user_id = u.id
  LEFT JOIN (SELECT user_id, COUNT(DISTINCT created_at::date) AS days FROM post_comments GROUP BY user_id) c ON c.user_id = u.id
  LEFT JOIN (
    SELECT po.user_id, COUNT(*) AS likes FROM post_likes pl JOIN posts po ON po.id = pl.post_id
    WHERE pl.user_id <> po.user_id GROUP BY po.user_id
  ) l ON l.user_id = u.id
  LEFT JOIN (
    SELECT user_id, COUNT(*) FILTER (WHERE approved) AS approved, COALESCE(SUM(votes_count) FILTER (WHERE approved), 0) AS votes
    FROM projects GROUP BY user_id
  ) pr ON pr.user_id = u.id
`;

export async function getActivityPoints(userId: number): Promise<number> {
  const result: any = await db.execute(sql`SELECT points FROM (${POINTS_SQL}) t WHERE user_id = ${userId}`);
  const row = (result.rows ?? result)[0];
  return row ? Number(row.points) : 0;
}

export function rankForPoints(points: number): "user" | "vip" | "legend" {
  if (points >= RANK_THRESHOLDS.legend) return "legend";
  if (points >= RANK_THRESHOLDS.vip) return "vip";
  return "user";
}

const ORDER: Record<string, number> = { user: 0, vip: 1, legend: 2, admin: 3 };

// Returns users whose earned rank is above their stored rank (upgrade candidates).
export async function findRankUpgrades(): Promise<Array<{ userId: number; from: string; to: "vip" | "legend"; points: number }>> {
  const result: any = await db.execute(POINTS_SQL);
  const rows: any[] = result.rows ?? result;
  const out: Array<{ userId: number; from: string; to: "vip" | "legend"; points: number }> = [];
  for (const r of rows) {
    const points = Number(r.points);
    const earned = rankForPoints(points);
    const current = String(r.rank);
    if (earned !== "user" && (ORDER[earned] ?? 0) > (ORDER[current] ?? 0)) {
      out.push({ userId: Number(r.user_id), from: current, to: earned, points });
    }
  }
  return out;
}
