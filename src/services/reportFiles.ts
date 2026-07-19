import { ReportExportFormat, ReportRecord } from "../types";

export type ReportCell = string | number;

export interface ReportTableData {
  title: string;
  companyName: string;
  filters: string;
  generatedAt: string;
  generatedBy: string;
  columns: string[];
  rows: ReportCell[][];
}

export interface ReportArtifact {
  format: ReportExportFormat;
  fileName: string;
  mimeType: string;
  fileContent: string;
  fileSize: string;
}

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return window.btoa(binary);
};

const base64ToBytes = (content: string) => {
  const binary = window.atob(content);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const formatFileSize = (bytes: number) => {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
};

const safeFileName = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "relatorio";

const displayCell = (value: ReportCell) =>
  typeof value === "number"
    ? value.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    : value;

const escapeCsv = (value: ReportCell) => {
  const text = displayCell(value);
  return `"${text.replace(/"/g, '""')}"`;
};

const createCsv = (table: ReportTableData) => {
  const metadata: ReportCell[][] = [
    ["Relatório", table.title],
    ["Empresa", table.companyName],
    ["Filtros", table.filters],
    ["Gerado em", new Date(table.generatedAt).toLocaleString("pt-BR")],
    ["Gerado por", table.generatedBy],
    [],
  ];
  const rows = [...metadata, table.columns, ...table.rows];
  return (
    "\uFEFF" +
    rows.map((row) => row.map(escapeCsv).join(";")).join("\r\n")
  );
};

const asciiText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");

const escapePdfText = (value: string) =>
  asciiText(value).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

const wrapLine = (value: string, maxLength = 112) => {
  const words = asciiText(value).split(/\s+/);
  const lines: string[] = [];
  let current = "";
  words.forEach((word) => {
    if (!current) current = word;
    else if (`${current} ${word}`.length <= maxLength) current += ` ${word}`;
    else {
      lines.push(current);
      current = word;
    }
  });
  if (current) lines.push(current);
  return lines.length ? lines : [""];
};

const createPdf = (table: ReportTableData) => {
  const lines = [
    table.title,
    `Empresa: ${table.companyName}`,
    `Filtros: ${table.filters}`,
    `Gerado em: ${new Date(table.generatedAt).toLocaleString("pt-BR")} por ${table.generatedBy}`,
    "",
    table.columns.join(" | "),
    "-".repeat(112),
    ...table.rows.flatMap((row) =>
      wrapLine(row.map(displayCell).join(" | ")),
    ),
  ];
  if (table.rows.length === 0) lines.push("Nenhum registro encontrado para os filtros informados.");

  const pages: string[][] = [];
  for (let index = 0; index < lines.length; index += 46) {
    pages.push(lines.slice(index, index + 46));
  }

  const fontObjectId = 3 + pages.length * 2;
  const objects: string[] = [];
  objects[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objects[2] = `<< /Type /Pages /Kids [${pages
    .map((_, index) => `${3 + index * 2} 0 R`)
    .join(" ")}] /Count ${pages.length} >>`;

  pages.forEach((pageLines, index) => {
    const pageId = 3 + index * 2;
    const contentId = pageId + 1;
    const stream = [
      "BT",
      "/F1 8 Tf",
      "36 560 Td",
      "11 TL",
      ...pageLines.map((line, lineIndex) =>
        `${lineIndex === 0 ? "" : "T* "}(${escapePdfText(line)}) Tj`,
      ),
      "ET",
    ].join("\n");
    objects[pageId] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] ` +
      `/Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });
  objects[fontObjectId] =
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>";

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let id = 1; id <= fontObjectId; id += 1) {
    offsets[id] = pdf.length;
    pdf += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }
  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${fontObjectId + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let id = 1; id <= fontObjectId; id += 1) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdf +=
    `trailer\n<< /Size ${fontObjectId + 1} /Root 1 0 R >>\n` +
    `startxref\n${xrefOffset}\n%%EOF`;
  return pdf;
};

export function createReportArtifact(
  table: ReportTableData,
  format: ReportExportFormat,
): ReportArtifact {
  const date = table.generatedAt.slice(0, 10);
  const baseName = `${safeFileName(table.title)}-${date}`;
  if (format === "CSV") {
    const bytes = new TextEncoder().encode(createCsv(table));
    return {
      format,
      fileName: `${baseName}.csv`,
      mimeType: "text/csv;charset=utf-8",
      fileContent: bytesToBase64(bytes),
      fileSize: formatFileSize(bytes.byteLength),
    };
  }

  const pdf = createPdf(table);
  const bytes = new TextEncoder().encode(pdf);
  return {
    format,
    fileName: `${baseName}.pdf`,
    mimeType: "application/pdf",
    fileContent: bytesToBase64(bytes),
    fileSize: formatFileSize(bytes.byteLength),
  };
}

export function downloadReportFile(report: ReportRecord): boolean {
  if (!report.fileContent || !report.fileName || !report.mimeType) return false;
  try {
    const bytes = base64ToBytes(report.fileContent);
    const blob = new Blob([bytes], { type: report.mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = report.fileName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    return true;
  } catch {
    return false;
  }
}
