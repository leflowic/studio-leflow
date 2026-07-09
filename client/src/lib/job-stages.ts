// Keep in sync with JOB_STAGES in shared/schema.ts - the Serbian labels a
// job's `stage` column can render as, shared between the admin Radna tabla
// (JobsBoard.tsx) and the client-facing "gde mi je pesma" dashboard panel.
export const JOB_STAGES: { value: string; label: string }[] = [
  { value: "novi_upit", label: "Novi upit" },
  { value: "snimanje", label: "Snimanje" },
  { value: "mix", label: "Mix" },
  { value: "mastering", label: "Mastering" },
  { value: "revizija", label: "Na reviziji" },
  { value: "isporuceno", label: "Isporučeno" },
];
