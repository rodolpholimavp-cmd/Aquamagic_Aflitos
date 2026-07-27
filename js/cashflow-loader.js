(function () {
  const DATE_COLUMN_NAMES = ["Data_Format", "Data Format", "Data"];
  const MOVEMENT_COLUMN_NAMES = ["Movimentação", "Movimentacao", "Movimentacao", "Tipo"];
  const AMOUNT_COLUMN_NAMES = ["Valor", "Value", "Montante", "Total"];
  const CLASSIFICATION_COLUMN_NAMES = ["Classificação", "Classificacao", "Categoria"];
  const RECIPIENT_COLUMN_NAMES = ["Destinatário", "Destinatario", "Fornecedor", "Beneficiário"];

  const COLUMN_ALIASES = {
    date: ["data format", "data_format", "data", "date"],
    movement: ["movimentacao", "movimentação", "tipo movimentacao", "tipo"],
    amount: ["valor", "value", "montante", "total"],
    classification: ["classificacao", "classificação", "categoria", "tipo despesa"],
    recipient: ["destinatario", "destinatário", "fornecedor", "beneficiario"],
  };

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function findColumnKey(row, aliases, preferredNames = []) {
    const keys = Object.keys(row);
    const normalized = keys.map((key) => ({ raw: key, norm: normalizeText(key) }));

    for (const preferred of preferredNames) {
      const target = normalizeText(preferred);
      const match = normalized.find((item) => item.norm === target);
      if (match) return match.raw;
    }

    for (const alias of aliases) {
      const match = normalized.find((item) => item.norm === alias);
      if (match) return match.raw;
    }

    const sortedAliases = [...aliases].sort((a, b) => b.length - a.length);
    for (const alias of sortedAliases) {
      const match = normalized.find((item) => item.norm.includes(alias));
      if (match) return match.raw;
    }

    return null;
  }

  function readCell(row, columnKey) {
    if (columnKey == null) return undefined;
    if (Object.prototype.hasOwnProperty.call(row, columnKey)) return row[columnKey];

    const match = Object.keys(row).find((key) => normalizeText(key) === normalizeText(columnKey));
    return match ? row[match] : undefined;
  }

  function formatDateParts(year, month, day) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function parseExcelDate(value) {
    if (value == null || value === "") return null;

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate());
    }

    if (typeof value === "number" && window.XLSX && window.XLSX.SSF) {
      const parsed = window.XLSX.SSF.parse_date_code(value);
      if (parsed) {
        return formatDateParts(parsed.y, parsed.m, parsed.d);
      }
    }

    const text = String(value).trim();
    const brDateMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})/);
    if (brDateMatch) {
      const year = brDateMatch[3].length === 2 ? `20${brDateMatch[3]}` : brDateMatch[3];
      return formatDateParts(Number(year), Number(brDateMatch[2]), Number(brDateMatch[1]));
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      return text.slice(0, 10);
    }

    const parsedDate = new Date(text);
    if (!Number.isNaN(parsedDate.getTime())) {
      return formatDateParts(parsedDate.getFullYear(), parsedDate.getMonth() + 1, parsedDate.getDate());
    }

    return null;
  }

  function parseAmount(value) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.round(value * 100) / 100;
    }

    const text = String(value ?? "").trim();
    if (!text) return 0;

    let cleaned = text.replace(/[R$\s]/g, "");

    if (cleaned.includes(",") && cleaned.includes(".")) {
      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
    } else if (cleaned.includes(",")) {
      cleaned = cleaned.replace(",", ".");
    }

    const amount = Number.parseFloat(cleaned);
    return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
  }

  function normalizeMovementType(value) {
    const text = normalizeText(value);
    if (text.includes("cred")) return "Crédito";
    if (text.includes("deb")) return "Débito";
    return String(value || "").trim();
  }

  function normalizeSignedAmount(rawAmount, movementType) {
    const absAmount = Math.abs(parseAmount(rawAmount));
    if (movementType === "Crédito") return absAmount;
    if (movementType === "Débito") return -absAmount;

    const signed = parseAmount(rawAmount);
    if (signed > 0) return signed;
    if (signed < 0) return signed;
    return 0;
  }

  function normalizeLabel(value, fallback) {
    const text = String(value || "").trim();
    return text || fallback;
  }

  function isCashFlowWorkbook(row) {
    const columns = detectColumns(row);
    return Boolean(columns.date && columns.movement && columns.amount);
  }

  function detectColumns(row) {
    return {
      date: findColumnKey(row, COLUMN_ALIASES.date, DATE_COLUMN_NAMES),
      movement: findColumnKey(row, COLUMN_ALIASES.movement, MOVEMENT_COLUMN_NAMES),
      amount: findColumnKey(row, COLUMN_ALIASES.amount, AMOUNT_COLUMN_NAMES),
      classification: findColumnKey(row, COLUMN_ALIASES.classification, CLASSIFICATION_COLUMN_NAMES),
      recipient: findColumnKey(row, COLUMN_ALIASES.recipient, RECIPIENT_COLUMN_NAMES),
    };
  }

  function mapRow(row, columns) {
    const date = parseExcelDate(readCell(row, columns.date));
    const movementType = normalizeMovementType(readCell(row, columns.movement));
    const amount = normalizeSignedAmount(readCell(row, columns.amount), movementType);
    const classification = normalizeLabel(readCell(row, columns.classification), "Sem classificação");
    const recipient = normalizeLabel(readCell(row, columns.recipient), "Não informado");

    if (!date || amount === 0 || !movementType) return null;
    if (movementType !== "Crédito" && movementType !== "Débito") return null;

    return {
      date,
      movementType,
      amount,
      classification,
      recipient,
    };
  }

  function parseWorkbook(workbook) {
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      throw new Error("A planilha não possui nenhuma aba.");
    }

    const sheet = workbook.Sheets[sheetName];
    const rows = window.XLSX.utils.sheet_to_json(sheet, { defval: "" });

    if (rows.length === 0) {
      throw new Error("A planilha está vazia.");
    }

    const columns = detectColumns(rows[0]);
    const requiredColumns = ["date", "movement", "amount"];
    const labels = {
      date: "Data_Format",
      movement: "Movimentação",
      amount: "Valor",
    };

    const missing = requiredColumns.filter((key) => !columns[key]);
    if (missing.length > 0) {
      throw new Error(
        `Colunas não encontradas: ${missing.map((key) => labels[key]).join(", ")}. Verifique o cabeçalho da planilha de fluxo de caixa.`,
      );
    }

    const movements = rows.map((row) => mapRow(row, columns)).filter(Boolean);

    if (movements.length === 0) {
      throw new Error(
        "Nenhuma movimentação válida foi encontrada. Verifique as colunas Data_Format, Movimentação e Valor.",
      );
    }

    return movements;
  }

  async function loadCashFlowFile(file) {
    if (!file) return;

    if (!window.XLSX) {
      throw new Error("Biblioteca de leitura do Excel não carregou. Verifique sua conexão com a internet.");
    }

    const buffer = await file.arrayBuffer();
    const workbook = window.XLSX.read(buffer, { type: "array", cellDates: true });
    const movements = parseWorkbook(workbook);
    const credits = movements.filter((item) => item.amount > 0).reduce((sum, item) => sum + item.amount, 0);
    const debits = movements.filter((item) => item.amount < 0).reduce((sum, item) => sum + item.amount, 0);

    window.LAVANDERIA_DATA.setFromCashFlow(movements, file.name);

    window.dispatchEvent(
      new CustomEvent("lavanderia:cashflow-loaded", {
        detail: {
          fileName: file.name,
          count: movements.length,
          totalCredits: credits,
          totalDebits: debits,
          balance: credits + debits,
        },
      }),
    );
  }

  window.LavanderiaCashFlow = {
    isCashFlowWorkbook,
    parseWorkbook,
    loadCashFlowFile,
  };
})();
