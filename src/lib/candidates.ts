import { supabase } from "@/integrations/supabase/client";
import type { EducationEntry, ExperienceEntry, ParsedResume } from "./resume-parser";

export type Candidate = {
  id: string;
  file_name: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  links: string[];
  skills: string[];
  education: EducationEntry[];
  experience: ExperienceEntry[];
  years_experience: number | null;
  raw_text: string;
  created_at: string;
};

export async function listCandidates(): Promise<Candidate[]> {
  const { data, error } = await supabase
    .from("candidates")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Candidate[];
}

export async function saveCandidate(fileName: string, parsed: ParsedResume, rawText: string) {
  const { error } = await supabase.from("candidates").insert({
    file_name: fileName,
    full_name: parsed.full_name,
    email: parsed.email,
    phone: parsed.phone,
    location: parsed.location,
    links: parsed.links,
    skills: parsed.skills,
    education: parsed.education as unknown as never,
    experience: parsed.experience as unknown as never,
    years_experience: parsed.years_experience,
    raw_text: rawText.slice(0, 200000),
  });
  if (error) throw error;
}

export async function deleteCandidate(id: string) {
  const { error } = await supabase.from("candidates").delete().eq("id", id);
  if (error) throw error;
}
