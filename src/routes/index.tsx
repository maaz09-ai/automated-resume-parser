import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileUp, Loader2, Search, Database } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CandidateCard } from "@/components/CandidateCard";
import { extractText } from "@/lib/extract-text";
import { parseResume } from "@/lib/resume-parser";
import { deleteCandidate, listCandidates, saveCandidate } from "@/lib/candidates";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Resume Parser — Extract & Search Candidate Data" },
      {
        name: "description",
        content:
          "Upload PDF or DOCX resumes to automatically extract names, contacts, skills, education and experience into a searchable candidate database.",
      },
      { property: "og:title", content: "Resume Parser — Extract & Search Candidate Data" },
      {
        property: "og:description",
        content:
          "Automated resume parsing: extract candidate details from PDFs and Docs into a searchable database.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [query, setQuery] = useState("");

  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ["candidates"],
    queryFn: listCandidates,
  });

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      let ok = 0;
      for (const file of files) {
        try {
          const text = await extractText(file);
          if (!text.trim()) throw new Error("No readable text found (scanned image?)");
          await saveCandidate(file.name, parseResume(text), text);
          ok++;
        } catch (err) {
          toast.error(`${file.name}: ${(err as Error).message}`);
        }
      }
      return ok;
    },
    onSuccess: (ok) => {
      if (ok > 0) toast.success(`Parsed ${ok} resume${ok > 1 ? "s" : ""}`);
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });

  const remove = useMutation({
    mutationFn: deleteCandidate,
    onSuccess: () => {
      toast.success("Candidate removed");
      queryClient.invalidateQueries({ queryKey: ["candidates"] });
    },
  });

  const handleFiles = useCallback(
    (fileList: FileList | null) => {
      const files = Array.from(fileList ?? []);
      if (files.length) upload.mutate(files);
    },
    [upload],
  );

  const terms = query.toLowerCase().split(/[\s,]+/).filter(Boolean);
  const results = useMemo(() => {
    if (!terms.length) return candidates;
    return candidates.filter((c) => {
      const haystack = [
        c.full_name,
        c.email,
        c.location,
        c.skills.join(" "),
        c.education.map((e) => `${e.degree ?? ""} ${e.institution}`).join(" "),
        c.experience.map((e) => `${e.title} ${e.company ?? ""}`).join(" "),
      ]
        .join(" ")
        .toLowerCase();
      return terms.every((t) => haystack.includes(t));
    });
  }, [candidates, terms]);

  const topSkills = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of candidates) for (const s of c.skills) counts.set(s, (counts.get(s) ?? 0) + 1);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
  }, [candidates]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-4 py-12 sm:px-6">
      <header className="text-center">
        <Badge variant="secondary" className="mb-4">
          <Database className="mr-1.5 size-3.5" /> Searchable candidate database
        </Badge>
        <h1 className="text-balance text-4xl font-bold tracking-tight sm:text-5xl">
          Automated Resume Parser
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-pretty text-muted-foreground">
          Drop in PDF, DOCX or TXT resumes. Contact details, skills, education and work history are
          extracted automatically and stored for instant search.
        </p>
      </header>

      <section
        aria-label="Upload resumes"
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`mt-10 rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          dragging ? "border-accent bg-accent/10" : "border-border bg-card/50"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md"
          className="hidden"
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {upload.isPending ? (
          <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Parsing resumes…
          </p>
        ) : (
          <>
            <FileUp className="mx-auto size-8 text-accent" />
            <p className="mt-3 text-sm text-muted-foreground">
              Drag &amp; drop resumes here, or
            </p>
            <Button className="mt-4" onClick={() => inputRef.current?.click()}>
              Choose files
            </Button>
          </>
        )}
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-56">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name, skill, degree, company…"
              className="pl-9"
              aria-label="Search candidates"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {results.length} of {candidates.length} candidates
          </span>
        </div>

        {topSkills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {topSkills.map(([skill, count]) => (
              <button key={skill} type="button" onClick={() => setQuery(skill)}>
                <Badge variant="outline" className="cursor-pointer hover:border-accent">
                  {skill} <span className="ml-1 text-muted-foreground">{count}</span>
                </Badge>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="mt-6 space-y-4 pb-16">
        {isLoading && <p className="text-sm text-muted-foreground">Loading candidates…</p>}
        {!isLoading && results.length === 0 && (
          <p className="rounded-xl border border-border bg-card/50 p-8 text-center text-sm text-muted-foreground">
            {candidates.length === 0
              ? "No resumes parsed yet — upload one to get started."
              : "No candidates match your search."}
          </p>
        )}
        {results.map((candidate) => (
          <CandidateCard key={candidate.id} candidate={candidate} onDelete={remove.mutate} />
        ))}
      </section>
    </main>
  );
}
