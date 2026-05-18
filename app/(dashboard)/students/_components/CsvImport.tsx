"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Upload, Download, X, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { importStudentsFromCSV } from "@/lib/actions/students";
import { parseDateFlexible } from "@/lib/date-utils";
import type { Class } from "@prisma/client";

interface ParsedRow {
  name: string;
  className: string;
  admissionNo?: string;
  dateOfBirth?: string;
  parentName?: string;
  parentEmail?: string;
  parentPhone?: string;
  _error?: string;
}

// ─── CSV Helpers ─────────────────────────────────────────────────────────────

/** Split a CSV line handling quoted fields (commas inside quotes) */
function splitCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

/** Normalize a string for comparison: lowercase, collapse whitespace */
function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Restore leading zero on phone numbers that Excel strips.
 * Excel opens CSV and converts "0244123456" → 244123456 (9 digits).
 * If we get a 9-digit number we pad it back to 10 digits with a leading 0.
 */
function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return trimmed;
  // Strip everything except digits
  const digitsOnly = trimmed.replace(/\D/g, "");
  // 9-digit number → was a 10-digit number with leading 0 stripped by Excel
  if (digitsOnly.length === 9 && /^\d+$/.test(trimmed)) {
    return "0" + digitsOnly;
  }
  return trimmed;
}

function parseCSV(
  text: string,
  classes: Class[]
): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Build class lookup maps
  const classNameSet = new Set(classes.map((c) => normalize(c.name)));
  // Also match without spaces: "Basic1" -> "Basic 1"
  const classNoSpace = new Map(
    classes.map((c) => [normalize(c.name).replace(/\s/g, ""), normalize(c.name)])
  );

  // Normalize headers: lowercase, strip spaces/underscores
  const headers = splitCSVLine(lines[0]).map((h) =>
    h.toLowerCase().replace(/[\s_]/g, "")
  );

  return lines
    .slice(1)
    .map((line) => {
      if (!line.trim()) return null;
      const values = splitCSVLine(line);
      const col = (key: string) => {
        const idx = headers.indexOf(key);
        return idx >= 0 ? values[idx]?.trim() || "" : "";
      };

      const name =
        col("name") || col("fullname") || col("studentname") || col("student");
      const rawClassName =
        col("class") || col("classname");
      const admissionNo =
        col("admissionno") || col("admno") || col("admission") || undefined;
      const dateOfBirth =
        col("dateofbirth") || col("dob") || col("birthdate") || undefined;
      const parentName =
        col("parentname") || col("parent") || col("guardian") || undefined;
      const parentEmail =
        col("parentemail") || col("email") || undefined;
      const parentPhone = normalizePhone(
        col("parentphone") || col("phone") || col("tel") || ""
      ) || undefined;

      // Resolve class name with fuzzy matching
      let resolvedClassName = rawClassName;
      const norm = normalize(rawClassName);
      if (!classNameSet.has(norm)) {
        // Try without spaces
        const noSpace = norm.replace(/\s/g, "");
        const match = classNoSpace.get(noSpace);
        if (match) {
          // Find the original class name (preserving case)
          const cls = classes.find((c) => normalize(c.name) === match);
          resolvedClassName = cls?.name ?? rawClassName;
        }
      } else {
        // Use the exact DB name for consistency
        const cls = classes.find((c) => normalize(c.name) === norm);
        resolvedClassName = cls?.name ?? rawClassName;
      }

      const row: ParsedRow = {
        name,
        className: resolvedClassName,
        admissionNo: admissionNo || undefined,
        dateOfBirth: dateOfBirth || undefined,
        parentName: parentName || undefined,
        parentEmail: parentEmail || undefined,
        parentPhone: parentPhone || undefined,
      };

      if (!name) row._error = "Name is required";
      else if (!rawClassName) row._error = "Class is required";
      else if (
        !classNameSet.has(normalize(resolvedClassName))
      )
        row._error = `Class "${rawClassName}" not found`;
      else if (dateOfBirth && !parseDateFlexible(dateOfBirth))
        row._error = `Invalid date "${dateOfBirth}" — use DD/MM/YYYY`;

      return row;
    })
    .filter(Boolean) as ParsedRow[];
}

function downloadTemplate() {
  // Phone numbers are quoted so Excel treats them as text (not numbers).
  // The UTF-8 BOM (﻿) tells Excel this is a text file and preserves string values.
  const csv =
    "﻿" +
    "name,class,admissionNo,dateOfBirth,parentName,parentEmail,parentPhone\n" +
    'Kofi Mensah,Basic 1,ARS001,15/03/2015,Ama Mensah,ama@gmail.com,"0244123456"\n' +
    'Abena Owusu,KG 2,,22/09/2018,,,"0277654321"\n';
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "students-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

interface CsvImportProps {
  classes: Class[];
}

export function CsvImport({ classes }: CsvImportProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [loading, setLoading] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCSV(text, classes));
      setOpen(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  async function handleImport() {
    const valid = rows.filter((r) => !r._error);
    if (valid.length === 0) {
      toast.error("No valid rows to import");
      return;
    }

    setLoading(true);
    const result = await importStudentsFromCSV(
      valid.map(({ _error, ...r }) => r)
    );
    setLoading(false);

    const { created, errors } = result;
    if (errors.length > 0) {
      toast.warning(`Imported ${created} student${created !== 1 ? "s" : ""}. ${errors.length} failed.`);
    } else {
      toast.success(`Successfully imported ${created} student${created !== 1 ? "s" : ""}`);
    }
    setOpen(false);
    router.refresh();
  }

  const validCount = rows.filter((r) => !r._error).length;
  const errorCount = rows.filter((r) => r._error).length;

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFile}
      />
      <Button variant="ghost" size="sm" onClick={downloadTemplate} type="button">
        <Download className="w-4 h-4 mr-1.5" />
        Template
      </Button>
      <Button variant="outline" onClick={() => fileRef.current?.click()}>
        <Upload className="w-4 h-4 mr-2" />
        Import CSV
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Import Students — Preview</DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between text-sm py-1">
            <span className="text-muted-foreground">
              {rows.length} row{rows.length !== 1 ? "s" : ""} ·{" "}
              <span className="text-green-600 font-medium">{validCount} valid</span>
              {errorCount > 0 && (
                <span className="text-destructive font-medium">
                  {" "}· {errorCount} with errors (skipped)
                </span>
              )}
            </span>
          </div>

          <div className="overflow-auto max-h-72 border rounded-md">
            <table className="w-full text-xs">
              <thead className="bg-muted sticky top-0">
                <tr>
                  <th className="text-left p-2 font-medium">Name</th>
                  <th className="text-left p-2 font-medium">Class</th>
                  <th className="text-left p-2 font-medium">Adm #</th>
                  <th className="text-left p-2 font-medium">Parent</th>
                  <th className="text-left p-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className={row._error ? "bg-destructive/5" : ""}>
                    <td className="p-2">{row.name || "—"}</td>
                    <td className="p-2">{row.className || "—"}</td>
                    <td className="p-2 text-muted-foreground">
                      {row.admissionNo || "—"}
                    </td>
                    <td className="p-2 text-muted-foreground">
                      {row.parentName || "—"}
                    </td>
                    <td className="p-2">
                      {row._error ? (
                        <span className="text-destructive flex items-center gap-1">
                          <X className="w-3 h-3 shrink-0" />
                          {row._error}
                        </span>
                      ) : (
                        <span className="text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={loading || validCount === 0}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Import {validCount} student{validCount !== 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
