import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Candidate } from "@/lib/candidates";
import { Mail, MapPin, Phone, Trash2, Link2, GraduationCap, Briefcase } from "lucide-react";

type Props = {
  candidate: Candidate;
  onDelete: (id: string) => void;
};

export function CandidateCard({ candidate, onDelete }: Props) {
  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-panel)] transition-colors hover:border-accent/50">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold tracking-tight text-card-foreground">
            {candidate.full_name ?? "Unnamed candidate"}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{candidate.file_name}</p>
        </div>
        <div className="flex items-center gap-2">
          {candidate.years_experience !== null && (
            <Badge variant="secondary">{candidate.years_experience} yrs exp</Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Delete ${candidate.full_name ?? candidate.file_name}`}
            onClick={() => onDelete(candidate.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </header>

      <dl className="mt-4 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
        {candidate.email && (
          <div className="flex items-center gap-2">
            <Mail className="size-4 text-accent" />
            <span className="truncate">{candidate.email}</span>
          </div>
        )}
        {candidate.phone && (
          <div className="flex items-center gap-2">
            <Phone className="size-4 text-accent" />
            <span>{candidate.phone}</span>
          </div>
        )}
        {candidate.location && (
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-accent" />
            <span>{candidate.location}</span>
          </div>
        )}
        {candidate.links.slice(0, 2).map((link) => (
          <div key={link} className="flex items-center gap-2">
            <Link2 className="size-4 text-accent" />
            <a
              href={link.startsWith("http") ? link : `https://${link}`}
              target="_blank"
              rel="noreferrer"
              className="truncate underline-offset-4 hover:underline"
            >
              {link}
            </a>
          </div>
        ))}
      </dl>

      {candidate.skills.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {candidate.skills.slice(0, 18).map((skill) => (
            <Badge key={skill} variant="outline">
              {skill}
            </Badge>
          ))}
          {candidate.skills.length > 18 && (
            <Badge variant="outline">+{candidate.skills.length - 18} more</Badge>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {candidate.education.length > 0 && (
          <section>
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <GraduationCap className="size-4" /> Education
            </h4>
            <ul className="mt-2 space-y-1.5 text-sm">
              {candidate.education.slice(0, 3).map((e, i) => (
                <li key={i}>
                  <span className="text-card-foreground">{e.degree ?? e.institution}</span>
                  {e.degree && <span className="text-muted-foreground"> — {e.institution}</span>}
                  {e.year && <span className="text-muted-foreground"> ({e.year})</span>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {candidate.experience.length > 0 && (
          <section>
            <h4 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Briefcase className="size-4" /> Experience
            </h4>
            <ul className="mt-2 space-y-1.5 text-sm">
              {candidate.experience.slice(0, 3).map((e, i) => (
                <li key={i}>
                  <span className="text-card-foreground">{e.title}</span>
                  {e.company && <span className="text-muted-foreground"> — {e.company}</span>}
                  {e.period && <span className="text-muted-foreground"> ({e.period})</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </article>
  );
}
