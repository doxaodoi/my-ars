import { Document, Page, View, Text, Image, StyleSheet } from "@react-pdf/renderer";

// ─── Data types ───────────────────────────────────────────────────────────────

export type SubjectGrade = {
  name: string;
  // KG
  midterm?: number | null;
  exam?: number | null;
  // Basic (Primary)
  test1?: number | null;
  test2?: number | null;
  midtermScore?: number | null;
  assignment?: number | null;
  project?: number | null;
  basicExam?: number | null;
  // Common
  total?: number | null;
  grade?: string | null;
  remark?: string | null;
};

export type NurserySection = {
  name: string;
  items: { name: string; ticked: boolean; remark?: string | null }[];
};

export type ReportCardData = {
  studentName: string;
  className: string;
  classType: "KG" | "PRIMARY" | "NURSERY" | "CRECHE";
  termName: string;
  year: number;
  teacherRemark?: string | null;
  headRemark?: string | null;
  grades?: SubjectGrade[];
  nurserySections?: NurserySection[];
  logoUrl?: string;
};

// ─── Colors ───────────────────────────────────────────────────────────────────

const VIOLET = "#7c3aed";
const GOLD = "#d4a017";
const LIGHT_VIOLET = "#ede9fe";
const BORDER = "#e5e7eb";

// ─── Grade badge helper ───────────────────────────────────────────────────────

function gradeColor(grade: string | null | undefined): { bg: string; text: string } {
  const map: Record<string, { bg: string; text: string }> = {
    "A+": { bg: "#d1fae5", text: "#065f46" },
    "A":  { bg: "#dcfce7", text: "#166534" },
    "B":  { bg: "#dbeafe", text: "#1e40af" },
    "C":  { bg: "#fef9c3", text: "#854d0e" },
    "D":  { bg: "#ffedd5", text: "#9a3412" },
    "E":  { bg: "#fee2e2", text: "#b91c1c" },
    "F":  { bg: "#fecaca", text: "#7f1d1d" },
  };
  return map[grade ?? ""] ?? { bg: "#f3f4f6", text: "#6b7280" };
}

function fmt(v: number | null | undefined): string {
  return v != null ? v.toFixed(1) : "-";
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", fontSize: 9, backgroundColor: "#fff" },

  // Header
  header:         { backgroundColor: VIOLET, paddingHorizontal: 24, paddingVertical: 14, alignItems: "center" },
  headerLogo:     { width: 52, height: 52, borderRadius: 26, marginBottom: 6, backgroundColor: "white" },
  headerTitle:    { color: "white", fontSize: 15, fontFamily: "Helvetica-Bold", letterSpacing: 0.5 },
  headerAddr:     { color: "#ddd6fe", fontSize: 8, marginTop: 2 },
  headerMotto:    { color: GOLD, fontSize: 8.5, fontFamily: "Helvetica-Bold", marginTop: 3 },
  banner:         { backgroundColor: GOLD, paddingVertical: 5, alignItems: "center" },
  bannerText:     { color: "white", fontSize: 9.5, fontFamily: "Helvetica-Bold", letterSpacing: 1 },

  // Body
  body:           { paddingHorizontal: 22, paddingVertical: 16 },

  // Student info strip
  infoRow:        { flexDirection: "row", borderWidth: 1, borderColor: BORDER, borderRadius: 4, marginBottom: 14, overflow: "hidden" },
  infoCell:       { flex: 1, padding: 8, borderRightWidth: 1, borderColor: BORDER },
  infoLabel:      { fontSize: 7, color: "#6b7280", textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 2 },
  infoValue:      { fontSize: 9.5, fontFamily: "Helvetica-Bold", color: "#111827" },

  // Section heading
  sectionLabel:   { fontSize: 8, fontFamily: "Helvetica-Bold", color: VIOLET, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 },

  // Grade table
  tblWrap:        { borderWidth: 1, borderColor: BORDER, borderRadius: 4, overflow: "hidden", marginBottom: 12 },
  tblHead:        { flexDirection: "row", backgroundColor: VIOLET, paddingVertical: 5, paddingHorizontal: 4 },
  tblHCell:       { color: "white", fontSize: 7.5, fontFamily: "Helvetica-Bold", textAlign: "center" },
  tblRow:         { flexDirection: "row", paddingVertical: 4, paddingHorizontal: 4, borderBottomWidth: 1, borderColor: "#f3f4f6" },
  tblRowAlt:      { backgroundColor: "#fafafa" },
  tblCell:        { fontSize: 8.5, textAlign: "center", color: "#374151" },
  tblCellLeft:    { textAlign: "left", color: "#111827" },
  tblCellBold:    { fontFamily: "Helvetica-Bold" },

  // Nursery assessment
  secHead:        { backgroundColor: LIGHT_VIOLET, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 3, marginBottom: 3 },
  secHeadText:    { fontSize: 8.5, fontFamily: "Helvetica-Bold", color: VIOLET },
  itemRow:        { flexDirection: "row", alignItems: "center", paddingVertical: 3.5, paddingHorizontal: 8, borderBottomWidth: 1, borderColor: "#f3f4f6" },
  tickMark:       { width: 14, fontSize: 8, fontFamily: "Helvetica-Bold", marginRight: 5 },
  itemName:       { flex: 1, fontSize: 8.5, color: "#374151" },
  itemRemark:     { fontSize: 7.5, color: "#9ca3af" },

  // Remarks box
  remarkBox:      { borderWidth: 1, borderColor: BORDER, borderRadius: 4, overflow: "hidden", marginBottom: 8 },
  remarkHdr:      { backgroundColor: LIGHT_VIOLET, paddingVertical: 4, paddingHorizontal: 10 },
  remarkHdrText:  { fontSize: 8, fontFamily: "Helvetica-Bold", color: VIOLET },
  remarkBody:     { padding: 10, minHeight: 32 },
  remarkText:     { fontSize: 9, color: "#374151", lineHeight: 1.5 },

  // Signatures
  sigRow:         { flexDirection: "row", marginTop: 18, paddingTop: 12, borderTopWidth: 1, borderColor: BORDER },
  sigBox:         { flex: 1, alignItems: "center" },
  sigLine:        { borderTopWidth: 1, borderColor: "#9ca3af", width: "65%", marginBottom: 4 },
  sigLabel:       { fontSize: 7.5, color: "#6b7280" },
});

// ─── Component ────────────────────────────────────────────────────────────────

export function ReportCard({ data }: { data: ReportCardData }) {
  const isKG      = data.classType === "KG";
  const isNursery = data.classType === "NURSERY" || data.classType === "CRECHE";

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* ── School header ───────────────────────────────────────────── */}
        <View style={s.header}>
          {data.logoUrl && (
            <Image src={data.logoUrl} style={s.headerLogo} />
          )}
          <Text style={s.headerTitle}>ABUNDANT RAIN SCHOOL</Text>
          <Text style={s.headerAddr}>Abease, Amasaman, Accra  |  Ghana</Text>
          <Text style={s.headerMotto}>Let God Arise!  ·  Psalm 68:1</Text>
        </View>

        {/* ── Report title banner ─────────────────────────────────────── */}
        <View style={s.banner}>
          <Text style={s.bannerText}>
            TERMINAL REPORT  —  {data.termName.toUpperCase()}  {data.year}
          </Text>
        </View>

        {/* ── Body ────────────────────────────────────────────────────── */}
        <View style={s.body}>

          {/* Student info strip */}
          <View style={s.infoRow}>
            <View style={[s.infoCell, { flex: 2 }]}>
              <Text style={s.infoLabel}>Student Name</Text>
              <Text style={s.infoValue}>{data.studentName}</Text>
            </View>
            <View style={s.infoCell}>
              <Text style={s.infoLabel}>Class</Text>
              <Text style={s.infoValue}>{data.className}</Text>
            </View>
            <View style={s.infoCell}>
              <Text style={s.infoLabel}>Term</Text>
              <Text style={s.infoValue}>{data.termName}</Text>
            </View>
            <View style={[s.infoCell, { borderRightWidth: 0 }]}>
              <Text style={s.infoLabel}>Year</Text>
              <Text style={s.infoValue}>{data.year}</Text>
            </View>
          </View>

          {/* ── Academic grades (KG / Basic) ────────────────────────── */}
          {!isNursery && data.grades && data.grades.length > 0 && (
            <View>
              <Text style={s.sectionLabel}>Academic Performance</Text>
              <View style={s.tblWrap}>
                {/* header row */}
                <View style={s.tblHead}>
                  <Text style={[s.tblHCell, { flex: 3, textAlign: "left" }]}>Subject</Text>
                  {isKG ? (
                    <>
                      <Text style={[s.tblHCell, { flex: 1 }]}>{"Midterm\n/30"}</Text>
                      <Text style={[s.tblHCell, { flex: 1 }]}>{"Exam\n/70"}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={[s.tblHCell, { flex: 0.75 }]}>{"T1\n/10"}</Text>
                      <Text style={[s.tblHCell, { flex: 0.75 }]}>{"T2\n/10"}</Text>
                      <Text style={[s.tblHCell, { flex: 0.75 }]}>{"Mid\n/10"}</Text>
                      <Text style={[s.tblHCell, { flex: 0.75 }]}>{"Asgn\n/10"}</Text>
                      <Text style={[s.tblHCell, { flex: 0.75 }]}>{"Proj\n/20"}</Text>
                      <Text style={[s.tblHCell, { flex: 1 }]}>{"Exam\n/100"}</Text>
                    </>
                  )}
                  <Text style={[s.tblHCell, { flex: 1 }]}>Total</Text>
                  <Text style={[s.tblHCell, { flex: 0.85 }]}>Grade</Text>
                </View>

                {/* data rows */}
                {data.grades.map((g, i) => {
                  const gc = gradeColor(g.grade);
                  return (
                    <View key={i} style={[s.tblRow, i % 2 === 1 ? s.tblRowAlt : {}]}>
                      <Text style={[s.tblCell, s.tblCellLeft, { flex: 3 }]}>{g.name}</Text>
                      {isKG ? (
                        <>
                          <Text style={[s.tblCell, { flex: 1 }]}>{fmt(g.midterm)}</Text>
                          <Text style={[s.tblCell, { flex: 1 }]}>{fmt(g.exam)}</Text>
                        </>
                      ) : (
                        <>
                          <Text style={[s.tblCell, { flex: 0.75 }]}>{fmt(g.test1)}</Text>
                          <Text style={[s.tblCell, { flex: 0.75 }]}>{fmt(g.test2)}</Text>
                          <Text style={[s.tblCell, { flex: 0.75 }]}>{fmt(g.midtermScore)}</Text>
                          <Text style={[s.tblCell, { flex: 0.75 }]}>{fmt(g.assignment)}</Text>
                          <Text style={[s.tblCell, { flex: 0.75 }]}>{fmt(g.project)}</Text>
                          <Text style={[s.tblCell, { flex: 1 }]}>{fmt(g.basicExam)}</Text>
                        </>
                      )}
                      <Text style={[s.tblCell, s.tblCellBold, { flex: 1 }]}>{fmt(g.total)}</Text>
                      <View style={[{ flex: 0.85, alignItems: "center", justifyContent: "center" }]}>
                        {g.grade ? (
                          <View style={{ backgroundColor: gc.bg, paddingHorizontal: 5, paddingVertical: 1.5, borderRadius: 3 }}>
                            <Text style={{ fontSize: 7.5, fontFamily: "Helvetica-Bold", color: gc.text }}>{g.grade}</Text>
                          </View>
                        ) : (
                          <Text style={s.tblCell}>-</Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* ── Nursery / Creche tick assessments ───────────────────── */}
          {isNursery && data.nurserySections && data.nurserySections.length > 0 && (
            <View>
              <Text style={s.sectionLabel}>Assessment</Text>
              {data.nurserySections.map((sec, si) => (
                <View key={si} style={{ marginBottom: 8 }}>
                  <View style={s.secHead}>
                    <Text style={s.secHeadText}>{sec.name}</Text>
                  </View>
                  <View style={{ borderWidth: 1, borderColor: BORDER, borderRadius: 3, overflow: "hidden" }}>
                    {sec.items.map((item, ii) => (
                      <View
                        key={ii}
                        style={[
                          s.itemRow,
                          ii === sec.items.length - 1 ? { borderBottomWidth: 0 } : {},
                          ii % 2 === 1 ? { backgroundColor: "#fafafa" } : {},
                        ]}
                      >
                        <Text style={[s.tickMark, { color: item.ticked ? "#059669" : "#9ca3af" }]}>
                          {item.ticked ? "[Y]" : "[ ]"}
                        </Text>
                        <Text style={s.itemName}>{item.name}</Text>
                        {item.remark ? (
                          <Text style={s.itemRemark}>{item.remark}</Text>
                        ) : null}
                      </View>
                    ))}
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Remarks ─────────────────────────────────────────────── */}
          <View style={s.remarkBox}>
            <View style={s.remarkHdr}>
              <Text style={s.remarkHdrText}>Class Teacher Remark</Text>
            </View>
            <View style={s.remarkBody}>
              <Text style={s.remarkText}>{data.teacherRemark || "—"}</Text>
            </View>
          </View>

          <View style={s.remarkBox}>
            <View style={s.remarkHdr}>
              <Text style={s.remarkHdrText}>Head Teacher Remark</Text>
            </View>
            <View style={s.remarkBody}>
              <Text style={s.remarkText}>{data.headRemark || "—"}</Text>
            </View>
          </View>

          {/* ── Signatures ──────────────────────────────────────────── */}
          <View style={s.sigRow}>
            {["Class Teacher", "Head Teacher", "Parent / Guardian"].map((label) => (
              <View key={label} style={s.sigBox}>
                <View style={s.sigLine} />
                <Text style={s.sigLabel}>{label}</Text>
              </View>
            ))}
          </View>
        </View>
      </Page>
    </Document>
  );
}
