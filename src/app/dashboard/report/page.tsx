"use client";

// PDF Health Report Generator — Bug 2 fix.
//
// Uses jsPDF + jspdf-autotable to generate the PDF programmatically in the
// browser. All data is fetched from Supabase before generation starts, so the
// PDF is never blank. The final file is saved via doc.save().

import { useEffect, useState } from "react";
import { getBrowserSupabase } from "@/lib/supabase-client";
import type { HealthEntity, Memory } from "@/types";
import { Printer, Loader2, FileText, AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Types ─────────────────────────────────────────────────────────────────────

type EntityType = "medication" | "diagnosis" | "symptom" | "procedure" | "provider";

interface EntityGroup {
  type: EntityType;
  label: string;
  color: [number, number, number]; // RGB for jsPDF
  entities: HealthEntity[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const ENTITY_GROUPS: Omit<EntityGroup, "entities">[] = [
  { type: "medication",  label: "Current Medications",   color: [91, 141, 239] },
  { type: "diagnosis",   label: "Active Diagnoses",      color: [155, 109, 201] },
  { type: "symptom",     label: "Reported Symptoms",     color: [224, 122, 95] },
  { type: "procedure",   label: "Recent Procedures",     color: [76, 175, 125] },
  { type: "provider",    label: "Healthcare Providers",  color: [232, 152, 59] },
];

// Brand sage green as RGB.
const SAGE_RGB: [number, number, number] = [138, 154, 135];

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const supabase = getBrowserSupabase();

  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [userEmail, setUserEmail] = useState("");
  const [userName, setUserName] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          setError("Please sign in to generate a report.");
          setLoading(false);
          return;
        }

        setUserEmail(session.user.email ?? "");
        setUserName(
          (session.user.user_metadata?.full_name as string | undefined) ?? ""
        );

        const res = await fetch("/api/memories", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) {
          const d = (await res.json()) as { error?: string };
          throw new Error(d.error ?? "Failed to load memories");
        }
        const data = (await res.json()) as { memories: Memory[] };
        setMemories(data.memories ?? []);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load data"
        );
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [supabase]);

  // Build deduplicated entity groups from all memories.
  const entityGroups: EntityGroup[] = ENTITY_GROUPS.map((g) => {
    const seen = new Set<string>();
    const entities: HealthEntity[] = [];

    for (const mem of memories) {
      for (const entity of mem.entities ?? []) {
        if (entity.type === g.type) {
          const key = entity.name.toLowerCase().trim();
          if (!seen.has(key)) {
            seen.add(key);
            entities.push(entity);
          }
        }
      }
    }
    entities.sort((a, b) => b.confidence - a.confidence);
    return { ...g, entities };
  });

  const totalEntities = entityGroups.reduce(
    (sum, g) => sum + g.entities.length,
    0
  );

  // Generate and download the PDF using jsPDF + autoTable.
  async function handleGeneratePDF() {
    setGenerating(true);
    try {
      // Dynamic import so jsPDF is not bundled into the initial page load.
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const doc = new jsPDF({ unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      const today = new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      let y = margin;

      // ── Header band ──────────────────────────────────────────────────────
      doc.setFillColor(...SAGE_RGB);
      doc.rect(0, 0, pageWidth, 36, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("Cognure Health Report", margin, 16);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("AI-Powered Health Memory Companion", margin, 23);

      // Date — right-aligned in the header.
      doc.setFontSize(9);
      const dateLabel = `Generated: ${today}`;
      const dateW = doc.getTextWidth(dateLabel);
      doc.text(dateLabel, pageWidth - margin - dateW, 16);

      y = 46;

      // ── Patient summary block ─────────────────────────────────────────────
      doc.setTextColor(44, 44, 44);
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Patient Summary", margin, y);
      y += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const summaryLines = [
        `Name:           ${userName || "—"}`,
        `Email:          ${userEmail || "—"}`,
        `Report Date:    ${today}`,
        `Total Documents (memories): ${memories.length}`,
        `Total Entities Extracted:   ${totalEntities}`,
      ];
      for (const line of summaryLines) {
        doc.text(line, margin, y);
        y += 5.5;
      }
      y += 4;

      // ── Entity sections ───────────────────────────────────────────────────
      for (const group of entityGroups) {
        if (group.entities.length === 0) continue;

        // Section heading with coloured left rule.
        doc.setFillColor(...group.color);
        doc.rect(margin, y, 3, 7, "F");

        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(44, 44, 44);
        doc.text(group.label, margin + 6, y + 5.5);
        y += 12;

        // Build table rows: name + confidence %.
        const tableRows = group.entities.map((e) => [
          e.name,
          `${Math.round(e.confidence * 100)}%`,
        ]);

        autoTable(doc, {
          startY: y,
          head: [["Name", "Confidence"]],
          body: tableRows,
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 10,
            cellPadding: 3,
            textColor: [44, 44, 44],
            lineColor: [220, 215, 205],
            lineWidth: 0.2,
          },
          headStyles: {
            fillColor: group.color,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 10,
          },
          alternateRowStyles: { fillColor: [248, 246, 240] },
          columnStyles: {
            0: { cellWidth: contentWidth * 0.75 },
            1: { cellWidth: contentWidth * 0.25, halign: "center" },
          },
        });

        // Move y past the table (autoTable tracks lastAutoTable).
        y = (doc as unknown as { lastAutoTable: { finalY: number } })
          .lastAutoTable.finalY + 10;

        // Page break if needed.
        if (y > 260) {
          doc.addPage();
          y = margin;
        }
      }

      // ── Recent memory excerpts ────────────────────────────────────────────
      if (memories.length > 0) {
        if (y > 220) {
          doc.addPage();
          y = margin;
        }

        doc.setFillColor(...SAGE_RGB);
        doc.rect(margin, y, 3, 7, "F");
        doc.setFontSize(13);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(44, 44, 44);
        doc.text("Recent Memory Excerpts", margin + 6, y + 5.5);
        y += 12;

        const recentMemories = [...memories]
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )
          .slice(0, 8);

        const excerptRows = recentMemories.map((mem) => [
          formatDate(mem.created_at),
          mem.text.slice(0, 300) + (mem.text.length > 300 ? "…" : ""),
        ]);

        autoTable(doc, {
          startY: y,
          head: [["Date", "Excerpt"]],
          body: excerptRows,
          margin: { left: margin, right: margin },
          styles: {
            fontSize: 9,
            cellPadding: 3,
            textColor: [44, 44, 44],
            lineColor: [220, 215, 205],
            lineWidth: 0.2,
            overflow: "linebreak",
          },
          headStyles: {
            fillColor: SAGE_RGB,
            textColor: [255, 255, 255],
            fontStyle: "bold",
            fontSize: 10,
          },
          alternateRowStyles: { fillColor: [248, 246, 240] },
          columnStyles: {
            0: { cellWidth: 38 },
            1: { cellWidth: contentWidth - 38 },
          },
        });

        y = (doc as unknown as { lastAutoTable: { finalY: number } })
          .lastAutoTable.finalY + 10;
      }

      // ── Footer on every page ──────────────────────────────────────────────
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(160, 155, 145);
        const footerText = `Generated by Cognure AI  |  ${today}  |  Page ${i} of ${pageCount}`;
        const footerW = doc.getTextWidth(footerText);
        doc.text(
          footerText,
          (pageWidth - footerW) / 2,
          doc.internal.pageSize.getHeight() - 10
        );
        doc.setDrawColor(...SAGE_RGB);
        doc.setLineWidth(0.3);
        doc.line(
          margin,
          doc.internal.pageSize.getHeight() - 14,
          pageWidth - margin,
          doc.internal.pageSize.getHeight() - 14
        );
      }

      // Save the file.
      const filename = `cognure-health-report-${Date.now()}.pdf`;
      doc.save(filename);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate PDF"
      );
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Page header */}
      <div className="border-b border-border bg-card px-6 py-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-heading text-2xl font-bold text-charcoal">
              Health Report
            </h1>
            <p className="mt-0.5 text-sm text-charcoal/50">
              Download a structured PDF summary of your health memory.
            </p>
          </div>
          <Button
            onClick={handleGeneratePDF}
            disabled={loading || generating || !!error || totalEntities === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-sage px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sage/90 disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {generating ? "Generating…" : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto bg-background p-6">
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-coral/30 bg-coral/8 px-4 py-3 text-sm text-coral">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-6 w-6 animate-spin text-sage" />
          </div>
        )}

        {!loading && !error && totalEntities === 0 && (
          <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border py-24 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sage/10">
              <FileText className="h-7 w-7 text-sage" />
            </div>
            <div>
              <p className="font-semibold text-charcoal">No health data yet</p>
              <p className="mt-1 text-sm text-charcoal/45">
                Upload and memorize at least one document to generate a report.
              </p>
            </div>
          </div>
        )}

        {/* Report preview — what will be in the PDF */}
        {!loading && !error && totalEntities > 0 && (
          <div className="mx-auto max-w-3xl space-y-4">
            {/* Summary card */}
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-widest text-sage">
                    Health Memory Report
                  </p>
                  <h2 className="mt-1 font-heading text-2xl font-bold text-charcoal">
                    {userName || userEmail || "Your Health Summary"}
                  </h2>
                  {userName && userEmail && (
                    <p className="mt-0.5 text-sm text-charcoal/40">{userEmail}</p>
                  )}
                </div>
                <p className="shrink-0 text-right text-xs text-charcoal/35">
                  {new Date().toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              {/* Stats row */}
              <div className="flex flex-wrap gap-2">
                <StatPill label="Memories" value={memories.length} />
                <StatPill label="Total entities" value={totalEntities} />
                {entityGroups
                  .filter((g) => g.entities.length > 0)
                  .map((g) => (
                    <StatPill
                      key={g.type}
                      label={g.label}
                      value={g.entities.length}
                      color={`rgb(${g.color.join(",")})`}
                    />
                  ))}
              </div>
            </div>

            {/* Entity preview cards */}
            {entityGroups
              .filter((g) => g.entities.length > 0)
              .map((group) => (
                <div
                  key={group.type}
                  className="rounded-2xl border border-border bg-card p-6 shadow-sm"
                >
                  <div className="mb-4 flex items-center gap-2.5">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: `rgb(${group.color.join(",")})` }}
                    />
                    <h3 className="font-heading text-base font-semibold text-charcoal">
                      {group.label}
                    </h3>
                    <span className="ml-auto rounded-full bg-muted px-2.5 py-0.5 text-xs text-charcoal/50">
                      {group.entities.length}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {group.entities.map((e) => (
                      <div
                        key={e.name}
                        className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5"
                      >
                        <span className="text-sm text-charcoal">{e.name}</span>
                        <span className="text-xs text-charcoal/35">
                          {Math.round(e.confidence * 100)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

            <p className="text-center text-xs text-charcoal/35">
              The downloaded PDF will include all sections above plus recent
              memory excerpts and a branded header/footer.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Helper ────────────────────────────────────────────────────────────────────

function StatPill({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs">
      {color && (
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="font-bold text-charcoal">{value}</span>
      <span className="text-charcoal/45">{label}</span>
    </div>
  );
}
