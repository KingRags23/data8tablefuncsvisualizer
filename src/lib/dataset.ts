import { choice, mulberry32, randInt, shuffledIndices } from "./rng";
import { tableFromRows, type CellValue, type TableData } from "./table";

/** 90 unique first names: a mix of common English names and names from many backgrounds. */
const NAMES = [
  "Alex", "Amanda", "Amy", "Andrew", "Anna", "Ben", "Brian", "Caroline",
  "Chris", "Daniel", "David", "Emily", "Emma", "Eric", "Grace", "Hannah",
  "Jack", "Jacob", "James", "Jessica", "John", "Julia", "Katie", "Kevin",
  "Laura", "Luke", "Mark", "Mary", "Matt", "Megan", "Michael", "Nathan",
  "Nicole", "Olivia", "Peter", "Rachel", "Ryan", "Sam", "Sarah", "Sophie",
  "Stephanie", "Thomas", "Tom", "William", "Zoe",
  "Aisha", "Amir", "Ananya", "Andres", "Arjun", "Camila", "Carlos", "Chen",
  "Diego", "Elena", "Fatima", "Gabriel", "Hana", "Hiro", "Imani", "Isabel",
  "Jamal", "Jasmine", "Kai", "Karim", "Keiko", "Kenji", "Laila", "Luis",
  "Malik", "Maria", "Mateo", "Mei", "Miguel", "Nadia", "Nia", "Omar",
  "Priya", "Rafael", "Riya", "Rosa", "Sanjay", "Sofia", "Talia", "Thiago",
  "Uma", "Valentina", "Wei", "Xavier", "Yara",
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

/** Build 100 names from 90 unique names, with no name appearing more than twice. */
function assignNames(rng: () => number): string[] {
  if (NAMES.length !== 90) {
    throw new Error(`Expected 90 unique names, got ${NAMES.length}.`);
  }
  const order = shuffledIndices(rng, NAMES.length).map((i) => NAMES[i]);
  const names = [...order];
  // Duplicate 10 names so 100 rows use exactly 90 unique names (80 once + 10 twice).
  const duplicateCount = 10;
  for (let i = 0; i < duplicateCount; i++) {
    names.push(order[i]);
  }
  return shuffledIndices(rng, names.length).map((i) => names[i]);
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

  const assignedNames = assignNames(rng);
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
      Name: assignedNames[i],
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
