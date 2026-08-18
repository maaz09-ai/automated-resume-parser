// Heuristic resume information extraction (name, contact, skills, education, experience).

export type EducationEntry = {
  institution: string;
  degree: string | null;
  year: string | null;
};

export type ExperienceEntry = {
  title: string;
  company: string | null;
  period: string | null;
};

export type ParsedResume = {
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  links: string[];
  skills: string[];
  education: EducationEntry[];
  experience: ExperienceEntry[];
  years_experience: number | null;
};

export const SKILL_DICTIONARY: string[] = [
  "Python","Java","JavaScript","TypeScript","C++","C#","Go","Rust","Ruby","PHP","Swift","Kotlin","Scala","R","MATLAB","Perl","Bash","Shell",
  "React","Next.js","Angular","Vue","Svelte","Redux","Tailwind CSS","HTML","CSS","SASS","Bootstrap","jQuery",
  "Node.js","Express","Django","Flask","FastAPI","Spring Boot","Laravel","Rails",".NET","GraphQL","REST API","gRPC",
  "PostgreSQL","MySQL","SQLite","MongoDB","Redis","Cassandra","DynamoDB","Elasticsearch","Oracle","SQL Server","Snowflake","BigQuery",
  "AWS","Azure","GCP","Docker","Kubernetes","Terraform","Ansible","Jenkins","GitHub Actions","GitLab CI","CI/CD","Linux","Nginx",
  "Machine Learning","Deep Learning","NLP","Computer Vision","spaCy","NLTK","TensorFlow","PyTorch","Keras","scikit-learn","Pandas","NumPy","OpenCV","LLM","Hugging Face",
  "Spark","Hadoop","Kafka","Airflow","dbt","ETL","Tableau","Power BI","Excel","Looker",
  "Git","Jira","Agile","Scrum","Kanban","Figma","Unit Testing","Selenium","Cypress","Jest","Playwright",
  "Communication","Leadership","Teamwork","Problem Solving","Project Management","Stakeholder Management",
];

const DEGREE_PATTERNS =
  /(ph\.?d|doctorate|m\.?tech|b\.?tech|b\.?e\b|m\.?e\b|b\.?sc|m\.?sc|bs\b|ms\b|b\.?a\b|m\.?a\b|mba|bca|mca|bachelor[s']?|master[s']?|associate|diploma|high school|secondary)/i;

const SECTION_ALIASES: Record<string, string[]> = {
  skills: ["skills", "technical skills", "core competencies", "technologies", "tech stack", "areas of expertise"],
  education: ["education", "academic background", "academics", "qualifications", "educational qualification"],
  experience: ["experience", "work experience", "professional experience", "employment history", "work history", "career history"],
  projects: ["projects", "personal projects", "key projects"],
  summary: ["summary", "profile", "objective", "about me", "professional summary"],
  certifications: ["certifications", "certificates", "licenses", "awards", "achievements"],
};

function normalize(text: string): string[] {
  return text
    .replace(/\r/g, "")
    .split("\n")
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 0);
}

function sectionKeyFor(line: string): string | null {
  const cleaned = line.toLowerCase().replace(/[^a-z ]/g, "").trim();
  if (!cleaned || cleaned.split(" ").length > 4) return null;
  for (const [key, aliases] of Object.entries(SECTION_ALIASES)) {
    if (aliases.includes(cleaned)) return key;
  }
  return null;
}

function splitSections(lines: string[]): Record<string, string[]> {
  const sections: Record<string, string[]> = { header: [] };
  let current = "header";
  for (const line of lines) {
    const key = sectionKeyFor(line);
    if (key) {
      current = key;
      sections[current] = sections[current] ?? [];
      continue;
    }
    const bucket = sections[current] ?? [];
    bucket.push(line);
    sections[current] = bucket;
  }
  return sections;
}

function findEmail(text: string): string | null {
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return m ? m[0] : null;
}

function findPhone(text: string): string | null {
  const matches = text.match(/\+?\d[\d\s().-]{7,18}\d/g) ?? [];
  for (const raw of matches) {
    const digits = raw.replace(/\D/g, "");
    if (digits.length >= 9 && digits.length <= 15) return raw.trim();
  }
  return null;
}

function findLinks(text: string): string[] {
  const matches = text.match(/((https?:\/\/)|(www\.))[^\s,;)]+|(linkedin\.com|github\.com)\/[^\s,;)]+/gi) ?? [];
  return Array.from(new Set(matches.map((l) => l.replace(/[.,)]+$/, ""))));
}

function findName(headerLines: string[], email: string | null): string | null {
  for (const line of headerLines.slice(0, 6)) {
    const candidate = line.replace(/[^A-Za-z .'-]/g, " ").replace(/\s+/g, " ").trim();
    const words = candidate.split(" ").filter(Boolean);
    if (words.length < 2 || words.length > 4) continue;
    if (/resume|curriculum|vitae|profile|engineer|developer|manager|analyst/i.test(candidate)) continue;
    const looksLikeName = words.every((w) => /^[A-Z][a-zA-Z.'-]*$/.test(w) || w === w.toUpperCase());
    if (looksLikeName) {
      return words
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ");
    }
  }
  if (email) {
    const local = (email.split("@")[0] ?? "").replace(/\d+/g, "");
    const parts = local.split(/[._-]+/).filter((p) => p.length > 1);
    if (parts.length >= 2) {
      return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(" ");
    }
  }
  return null;
}

function findLocation(headerLines: string[]): string | null {
  for (const line of headerLines.slice(0, 8)) {
    const m = line.match(/([A-Z][a-zA-Z.\- ]{2,25},\s?[A-Z][a-zA-Z.\- ]{2,25})/);
    if (m && m[1] && !m[0].includes("@")) return m[1].trim();
  }
  return null;
}

function findSkills(fullText: string, skillSection: string[]): string[] {
  const found = new Set<string>();
  const haystack = fullText.toLowerCase();
  for (const skill of SKILL_DICTIONARY) {
    const s = skill.toLowerCase();
    const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(^|[^a-z0-9+#.])${escaped}([^a-z0-9+#]|$)`, "i");
    if (re.test(haystack)) found.add(skill);
  }
  // Also honour explicit comma/bullet lists inside the skills section.
  for (const line of skillSection) {
    for (const raw of line.split(/[,;•|·]/)) {
      const token = raw.replace(/^[-–*\s]+/, "").trim();
      if (token.length >= 2 && token.length <= 28 && /[a-zA-Z]/.test(token) && token.split(" ").length <= 3) {
        const known = SKILL_DICTIONARY.find((s) => s.toLowerCase() === token.toLowerCase());
        found.add(known ?? token.replace(/\.$/, ""));
      }
    }
  }
  return Array.from(found).sort((a, b) => a.localeCompare(b));
}

function findEducation(lines: string[]): EducationEntry[] {
  const entries: EducationEntry[] = [];
  lines.forEach((line, i) => {
    const hasDegree = DEGREE_PATTERNS.test(line);
    const hasSchool = /(university|college|institute|school|academy|polytechnic|iit|nit)/i.test(line);
    if (!hasDegree && !hasSchool) return;
    const context = [line, lines[i + 1] ?? ""].join(" ");
    const yearMatch = context.match(/(19|20)\d{2}\s?[-–]\s?((19|20)\d{2}|present)|(19|20)\d{2}/i);
    const degreeMatch = context.match(
      /((ph\.?d|m\.?tech|b\.?tech|b\.?sc|m\.?sc|mba|bca|mca|bachelor[s']?|master[s']?|associate|diploma)[^,|\n]{0,45})/i,
    );
    const schoolMatch = context.match(/([A-Z][\w.&'-]*(?:\s+[A-Z][\w.&'-]*)*\s+(University|College|Institute|School|Academy))/);
    const institution = (schoolMatch?.[1] ?? (hasSchool ? line : (lines[i + 1] ?? line))).trim();
    const entry: EducationEntry = {
      institution: institution.slice(0, 120),
      degree: degreeMatch?.[1] ? degreeMatch[1].trim().slice(0, 90) : null,
      year: yearMatch ? yearMatch[0] : null,
    };
    const dup = entries.some((e) => e.institution === entry.institution && e.degree === entry.degree);
    if (!dup) entries.push(entry);
  });
  return entries.slice(0, 6);
}

const PERIOD_RE =
  /((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s?)?((19|20)\d{2})\s?[-–—to]{1,3}\s?(((jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s?)?((19|20)\d{2})|present|current)/i;

function findExperience(lines: string[]): ExperienceEntry[] {
  const entries: ExperienceEntry[] = [];
  lines.forEach((line, i) => {
    const period = line.match(PERIOD_RE) ?? (lines[i + 1] ?? "").match(PERIOD_RE);
    const titleish =
      /(engineer|developer|manager|analyst|designer|consultant|intern|scientist|architect|administrator|specialist|lead|director|officer|associate)/i.test(
        line,
      );
    if (!titleish) return;
    if (line.length > 140) return;
    const cleaned = line.replace(PERIOD_RE, "").replace(/[|•]/g, " - ").replace(/\s+/g, " ").trim();
    const parts = cleaned.split(/\s[-–—,]\s|\sat\s/i).map((p) => p.trim()).filter(Boolean);
    const entry: ExperienceEntry = {
      title: (parts[0] ?? cleaned).slice(0, 90),
      company: parts[1] ? parts[1].slice(0, 90) : null,
      period: period ? period[0] : null,
    };
    if (!entries.some((e) => e.title === entry.title && e.company === entry.company)) entries.push(entry);
  });
  return entries.slice(0, 8);
}

function estimateYears(text: string, experience: ExperienceEntry[]): number | null {
  const explicit = text.match(/(\d{1,2}(\.\d)?)\+?\s*(years?|yrs?)\s+(of\s+)?experience/i);
  if (explicit) return Number(explicit[1]);
  const years: number[] = [];
  for (const e of experience) {
    if (!e.period) continue;
    const nums = e.period.match(/(19|20)\d{2}/g) ?? [];
    const start = nums[0] ? Number(nums[0]) : null;
    const end = /present|current/i.test(e.period)
      ? new Date().getFullYear()
      : nums[1]
        ? Number(nums[1])
        : null;
    if (start && end && end >= start) years.push(end - start);
  }
  if (!years.length) return null;
  const total = years.reduce((a, b) => a + b, 0);
  return Math.round(total * 10) / 10;
}

export function parseResume(rawText: string): ParsedResume {
  const lines = normalize(rawText);
  const text = lines.join("\n");
  const sections = splitSections(lines);
  const header = sections["header"] ?? lines.slice(0, 10);

  const email = findEmail(text);
  const experienceLines = sections["experience"] ?? [];
  const experience = findExperience(experienceLines.length ? experienceLines : lines);
  const educationLines = sections["education"] ?? [];

  return {
    full_name: findName(header, email),
    email,
    phone: findPhone(text),
    location: findLocation(header),
    links: findLinks(text),
    skills: findSkills(text, sections["skills"] ?? []),
    education: findEducation(educationLines.length ? educationLines : lines),
    experience,
    years_experience: estimateYears(text, experience),
  };
}
