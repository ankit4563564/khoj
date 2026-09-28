export type Item = {
  id: string;
  name: string;
  category: string;
  brand: string;
  detail: string;
  status: "SAFE" | "LOST" | "RETURNED";
  photos: string[];
  art?: number;
  location?: string;
  lostAt?: string;
};
export type CaseStatus =
  "POTENTIAL_MATCH" | "MANUAL_REVIEW" | "HANDOVER" | "RETURNED" | "UNCLAIMED";
export type RecoveryCase = {
  id: string;
  itemId?: string;
  category: string;
  location: string;
  photo?: string;
  status: CaseStatus;
  score?: number;
  source: "ai_match" | "manual_claim" | "found_report";
  ownerConfirmed: boolean;
  finderConfirmed: boolean;
  reward: "NOT_OFFERED" | "SKIPPED" | "PENDING" | "PAID";
  phone?: string;
  upi?: string;
  createdAt: string;
};
export type Attempt = {
  id: string;
  caseId: string;
  itemId: string;
  answer: string;
  result: "pending" | "matched" | "rejected";
  createdAt: string;
};
export type Store = {
  version: 1;
  items: Item[];
  cases: RecoveryCase[];
  attempts: Attempt[];
};
export const seed: Store = {
  version: 1,
  items: [
    {
      id: "earbuds",
      name: "AirPods Pro",
      category: "Audio",
      brand: "Apple",
      detail: "Small scratch near the left hinge.",
      status: "LOST",
      photos: [],
      art: 0,
      location: "Library",
    },
    {
      id: "bottle",
      name: "Everyday bottle",
      category: "Drinkware",
      brand: "Hydro Flask",
      detail: "Initial A underneath the base.",
      status: "SAFE",
      photos: [],
      art: 1,
    },
    {
      id: "bag",
      name: "Campus backpack",
      category: "Bag",
      brand: "The North Face",
      detail: "Blue thread on the inside pocket.",
      status: "SAFE",
      photos: [],
      art: 2,
    },
  ],
  cases: [
    {
      id: "KJ-1042",
      itemId: "earbuds",
      category: "Audio",
      location: "Library help desk",
      status: "POTENTIAL_MATCH",
      score: 92,
      source: "ai_match",
      ownerConfirmed: false,
      finderConfirmed: false,
      reward: "NOT_OFFERED",
      createdAt: "2026-09-27T10:00:00Z",
    },
    {
      id: "KJ-1043",
      category: "Drinkware",
      location: "Academic block",
      status: "UNCLAIMED",
      source: "found_report",
      ownerConfirmed: false,
      finderConfirmed: false,
      reward: "NOT_OFFERED",
      createdAt: "2026-09-27T12:00:00Z",
    },
  ],
  attempts: [],
};
export function confirmReturn(
  c: RecoveryCase,
  role: "owner" | "finder",
): RecoveryCase {
  if (c.status !== "HANDOVER") return c;
  const next = {
    ...c,
    [role === "owner" ? "ownerConfirmed" : "finderConfirmed"]: true,
  };
  return {
    ...next,
    status:
      next.ownerConfirmed && next.finderConfirmed ? "RETURNED" : "HANDOVER",
  };
}
export function canOfferReward(c: RecoveryCase) {
  return c.status === "RETURNED" && c.ownerConfirmed && c.finderConfirmed;
}
export function routeCandidates(scores: number[]) {
  return scores.filter((s) => s >= 85).length >= 2
    ? "AMBIGUOUS"
    : scores.some((s) => s >= 85)
      ? "POTENTIAL_MATCH"
      : "UNCLAIMED";
}
export const categories = [
  "Audio",
  "Drinkware",
  "Bag",
  "Electronics",
  "Keys",
  "Watch",
  "Other",
];
export const locations = [
  "Library",
  "Academic block",
  "Cafeteria",
  "Sports centre",
  "Hostel",
  "Main gate",
  "Other campus location",
];
export function id(prefix: string) {
  return `${prefix}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
}
