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

function parseCSV(text: string, classNames: Set<string>): ParsedRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  // Normalize headers: lowercase, strip spaces/underscores
  const headers = lines[0]
    .split(",")
    .map((h) => h.trim().toLowerCase().replace(/[\s_]/g, ""));

  return lines
    .slice(1)
    .map((line) => {
      if (!line.trim()) return null;
      // Simple parse — strip surrounding quotes from each field
      const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const col = (key: string) => {
        const idx = headers.indexOf(key);
        return idx >= 0 ? values[idx]?.trim() || "" : "";
      };

      const name =
        col("name") || col("fullname") || col("studentname") || col("student");
      const className =
        col("class") || col("classname");
      const admissionNo =
        col("admissionno") || col("admno") || col("admission") || undefined;
      const dateOfBirth =
        col("dateofbirth") || col("dob") || col("birthdate") || undefined;
      const parentName =
        col("parentname") || col("parent") || col("guardian") || undefined;
      const parentEmail =
        col("parentemail") || col("email") || undefined;
      const parentPhone =
        col("parentphone") || col("phone") || col("tel") || undefined;

      const row: ParsedRow = {
        name,
        className,
        admissionNo: admissionNo || undefined,
        dateOfBirth: dateOfBirth || undefined,
        parentName: parentName || undefined,
        parentEmail: parentEmail || undefined,
        parentPhone: parentPhone || undefined,
      };

      if (!name) row._error = "Name is required";
      else if (!className) row._error = "Class is required";
      else if (!classNames.has(className.toLowerCase().trim()))
        row._error = `Class "${className}" not found`;

      return row;
    })
    .filter(Boolean) as ParsedRow[];
}

function downloadTemplate() {
  const csv =
    "name,class,admissionNo,dateOfBirth,parentName,parentEmail,parentPhone\n" +
    "Kofi Mensah,Basic 1,ARS001,2015-03-15,Ama Mensah,ama@gmail.com,0244123456\n" +
    "Abena Owusu,KG 2,,,,0277654321\n";
  const blob = new Blob([csv], { type: "text/csv" });
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

  const classNames = new Set(classes.map((c) => c.name.toLowerCase().trim()));

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setRows(parseCSV(text, classNames));
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
            <Button variant="ghost" size="sm" onClick={downloadTemplate} type="button">
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download template
            </Button>
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
