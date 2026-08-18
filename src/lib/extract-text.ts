// Client-side text extraction from PDF / DOCX / TXT resumes.

export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();

  if (name.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

    const buffer = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buffer }).promise;
    const pages: string[] = [];
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      let line = "";
      let lastY: number | null = null;
      const lines: string[] = [];
      for (const item of content.items as Array<{ str?: string; transform?: number[] }>) {
        if (typeof item.str !== "string") continue;
        const y = item.transform?.[5] !== undefined ? Math.round(item.transform[5]) : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 3) {
          lines.push(line.trim());
          line = "";
        }
        line += item.str + " ";
        lastY = y;
      }
      lines.push(line.trim());
      pages.push(lines.filter(Boolean).join("\n"));
    }
    return pages.join("\n");
  }

  if (name.endsWith(".docx")) {
    const mammoth = (await import("mammoth/mammoth.browser")) as {
      extractRawText: (input: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }>;
    };
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value;
  }

  if (name.endsWith(".txt") || name.endsWith(".md") || name.endsWith(".rtf")) {
    return await file.text();
  }

  throw new Error("Unsupported file type. Upload a PDF, DOCX or TXT resume.");
}
