import ExcelJS from "exceljs";

const GREEN = "FF006239";
const STRIPE = "FFF4FBF7";
const BORDER = "FFE6E6E4";

const cellValue = (column, row) => {
  if (column.exportValue) return column.exportValue(row);
  const value = row?.[column.key];
  if (value == null || value === "") return "";
  return value;
};

const downloadBuffer = (buffer, filename) => {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportExcel = async ({ filename, sheetName = "Export", title, columns = [], rows = [] }) => {
  const cols = columns.filter((col) => col.key && col.label && !["actions", "photo"].includes(col.key));
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Fleet21";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: title ? 2 : 1, showGridLines: false }],
  });

  let headerRowNumber = 1;
  if (title) {
    sheet.mergeCells(1, 1, 1, Math.max(cols.length, 1));
    const banner = sheet.getRow(1);
    banner.height = 28;
    const titleCell = sheet.getCell(1, 1);
    titleCell.value = title;
    titleCell.font = { name: "Calibri", size: 16, bold: true, color: { argb: GREEN } };
    titleCell.alignment = { vertical: "middle", horizontal: "left" };
    headerRowNumber = 2;
  }

  sheet.columns = cols.map((col) => ({
    key: col.key,
    width: Math.min(42, Math.max(16, String(col.label).length + 8)),
  }));

  const header = sheet.getRow(headerRowNumber);
  header.height = 24;
  cols.forEach((col, index) => {
    const cell = header.getCell(index + 1);
    cell.value = col.label;
    cell.font = { name: "Calibri", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: GREEN } };
    cell.alignment = { vertical: "middle", horizontal: "left" };
    cell.border = {
      top: { style: "thin", color: { argb: GREEN } },
      bottom: { style: "thin", color: { argb: GREEN } },
    };
  });

  rows.forEach((row) => {
    const values = cols.map((col) => cellValue(col, row));
    const added = sheet.addRow(values);
    added.height = 20;
    added.eachCell((cell, colNumber) => {
      cell.font = { name: "Calibri", size: 11, color: { argb: "FF171717" } };
      cell.alignment = { vertical: "middle" };
      cell.border = {
        bottom: { style: "hair", color: { argb: BORDER } },
      };
      if (added.number % 2 === 0) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: STRIPE } };
      }
      const col = cols[colNumber - 1];
      if (col?.type === "n" && cell.value !== "") {
        cell.numFmt = "#,##0.00";
        cell.value = Number(cell.value) || 0;
      }
    });
  });

  const lastRow = Math.max(headerRowNumber, sheet.rowCount);
  sheet.autoFilter = {
    from: { row: headerRowNumber, column: 1 },
    to: { row: lastRow, column: Math.max(cols.length, 1) },
  };

  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, filename);
};
