import { choice, mulberry32, randInt } from "./rng";
import { tableFromRows, type CellValue, type TableData } from "./table";

const NAMES = [
  "Aisha", "Alex", "Amelia", "Andre", "Anika", "Arjun", "Ava", "Ben",
  "Caleb", "Camila", "Chen", "Chloe", "Daniel", "Diego", "Elena", "Eli",
  "Emma", "Fatima", "Gabriel", "Grace", "Hana", "Hannah", "Ian", "Isabel",
  "Jada", "James", "Jordan", "Kai", "Karim", "Keiko", "Lena", "Leo",
  "Liam", "Maya", "Mei", "Miguel", "Mina", "Nadia", "Nina", "Noah",
  "Omar", "Priya", "Rafael", "Riya", "Sam", "Sofia", "Talia", "Theo",
  "Uma", "Victor", "Wei", "Yara", "Zara",
];

const YEARS = ["Freshman", "Sophomore", "Junior", "Senior"] as const;
const YEAR_WEIGHTS = [0.28, 0.26, 0.24, 0.22];

const MAJORS = [
  "Data Science",
  "Computer Science",
  "Economics",
  "Statistics",
  "Cognitive Science",
  "Undeclared",
] as const;
const MAJOR_WEIGHTS = [0.28, 0.22, 0.16, 0.12, 0.1, 0.12];

const RESIDENCES = [
  "Unit 1",
  "Unit 2",
  "Unit 3",
  "Foothill",
  "Clark Kerr",
  "Off Campus",
] as const;

const SUBJECTS = [
  "Probability",
  "Programming",
  "Inference",
  "Visualization",
  "Causality",
] as const;

function weightedChoice<T>(rng: () => number, items: readonly T[], weights: number[]): T {
  const r = rng();
  let acc = 0;
  for (let i = 0; i < items.length; i++) {
    acc += weights[i];
    if (r <= acc) return items[i];
  }
  return items[items.length - 1];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export const TABLE_NAME = "students";

export function createStudentsTable(): TableData {
  const rng = mulberry32(20260830);
  const labels = [
    "Name",
    "Year",
    "Major",
    "GPA",
    "Units",
    "Midterm",
    "Hours Studying",
    "Residence",
    "Favorite Subject",
    "Club Member",
  ];

  const rows: Record<string, CellValue>[] = [];
  for (let i = 0; i < 100; i++) {
    const year = weightedChoice(rng, YEARS, YEAR_WEIGHTS);
    const major = weightedChoice(rng, MAJORS, MAJOR_WEIGHTS);
    const gpaBase = 2.2 + rng() * 1.8;
    const gpa = round1(Math.min(4.0, gpaBase + (year === "Senior" ? 0.15 : 0)));
    const units = randInt(rng, 12, 20);
    const midterm = Math.min(99, Math.max(42, Math.round(55 + gpa * 8 + (rng() - 0.4) * 18)));
    const hours = Math.max(4, Math.round(8 + (4 - gpa) * 6 + rng() * 10));
    rows.push({
      Name: choice(rng, NAMES),
      Year: year,
      Major: major,
      GPA: gpa,
      Units: units,
      Midterm: midterm,
      "Hours Studying": hours,
      Residence: choice(rng, [...RESIDENCES]),
      "Favorite Subject": choice(rng, [...SUBJECTS]),
      "Club Member": rng() < 0.46 ? "Yes" : "No",
    });
  }

  return tableFromRows(labels, rows);
}

export const RELABEL_OPTIONS: Record<string, string[]> = {
  Name: ["Student", "First Name"],
  Year: ["Class Standing", "College Year"],
  Major: ["Declared Major", "Program"],
  GPA: ["Grade Point Average", "GPA (4.0)"],
  Units: ["Credits", "Units Enrolled"],
  Midterm: ["Midterm Score", "Exam 1"],
  "Hours Studying": ["Study Hours", "Hours / Week"],
  Residence: ["Housing", "Dorm"],
  "Favorite Subject": ["Topic", "Favorite Topic"],
  "Club Member": ["In Club", "Club"],
};

export const CATEGORICAL_COLUMNS = [
  "Name",
  "Year",
  "Major",
  "Residence",
  "Favorite Subject",
  "Club Member",
] as const;

export const NUMERIC_COLUMNS = ["GPA", "Units", "Midterm", "Hours Studying"] as const;

export function uniqueValues(table: TableData, label: string): CellValue[] {
  const seen = new Set<string>();
  const values: CellValue[] = [];
  for (const value of table.columns[label]) {
    const key = String(value);
    if (!seen.has(key)) {
      seen.add(key);
      values.push(value);
    }
  }
  return values;
}
