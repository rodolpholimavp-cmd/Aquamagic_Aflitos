(function () {
  const PAYMENT_COLUMN_NAMES = ["Tipo Cartão", "Tipo Cartao", "Tipo cartão", "Tipo cartao"];
  const DATE_COLUMN_NAMES = ["Data", "DATA", "Date"];
  const AMOUNT_COLUMN_NAMES = ["Total Venda", "Total venda", "TOTAL VENDA"];
  const USER_COLUMN_NAMES = ["Usuário", "Usuario", "USER", "User"];
  const COLUMN_ALIASES = {
    date: ["data", "date", "dia"],
    time: ["hora", "horario", "horário", "time"],
    amount: ["total venda", "totalvenda", "valor", "faturamento"],
    cycleType: ["produtos", "produto", "tipo ciclo", "ciclo"],
    machine: ["maquina", "máquina", "equipamento"],
    paymentMethod: ["tipo cartao", "tipo cartão"],
    user: ["usuario", "usuário", "user", "operador", "cliente", "nome usuario", "nome usuário"],
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

  function isEmptyPaymentValue(value) {
    if (value == null) return true;

    const text = normalizeText(value);
    return !text || text === "-" || text === "na" || text === "n/a" || text === "null" || text === "undefined";
  }

  function normalizePaymentMethod(value) {
    if (isEmptyPaymentValue(value)) return "Fidelidade";

    const text = normalizeText(value);

    if (text.includes("pix")) return "PIX";
    if (text.includes("cred")) return "Crédito";
    if (text.includes("deb")) return "Débito";
    if (text.includes("fidelidade")) return "Fidelidade";

    return String(value).trim();
  }

  function formatDateParts(year, month, day) {
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function formatTimeParts(hours, minutes, seconds) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function parseExcelDateTime(value) {
    if (value == null || value === "") return null;

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return {
        date: formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate()),
        time: formatTimeParts(value.getHours(), value.getMinutes(), value.getSeconds()),
      };
    }

    if (typeof value === "number" && window.XLSX && window.XLSX.SSF) {
      const parsed = window.XLSX.SSF.parse_date_code(value);
      if (parsed) {
        return {
          date: formatDateParts(parsed.y, parsed.m, parsed.d),
          time: formatTimeParts(parsed.H || 0, parsed.M || 0, parsed.S || 0),
        };
      }
    }

    const text = String(value).trim();
    const brDateTimeMatch = text.match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s+|T)(\d{1,2}:\d{2}(?::\d{2})?)/,
    );

    if (brDateTimeMatch) {
      const year = brDateTimeMatch[3].length === 2 ? `20${brDateTimeMatch[3]}` : brDateTimeMatch[3];
      const timeParts = brDateTimeMatch[4].split(":");
      return {
        date: formatDateParts(Number(year), Number(brDateTimeMatch[2]), Number(brDateTimeMatch[1])),
        time: formatTimeParts(Number(timeParts[0]), Number(timeParts[1]), Number(timeParts[2] || 0)),
      };
    }

    const brDateMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:\s|$)/);
    if (brDateMatch) {
      const year = brDateMatch[3].length === 2 ? `20${brDateMatch[3]}` : brDateMatch[3];
      return {
        date: formatDateParts(Number(year), Number(brDateMatch[2]), Number(brDateMatch[1])),
        time: "00:00:00",
      };
    }

    if (/^\d{4}-\d{2}-\d{2}/.test(text)) {
      const timeMatch = text.match(/(\d{2}:\d{2}(?::\d{2})?)/);
      const timeParts = timeMatch ? timeMatch[1].split(":") : ["00", "00", "00"];
      return {
        date: text.slice(0, 10),
        time: formatTimeParts(Number(timeParts[0]), Number(timeParts[1]), Number(timeParts[2] || 0)),
      };
    }

    const parsedDate = new Date(text);
    if (!Number.isNaN(parsedDate.getTime())) {
      return {
        date: formatDateParts(parsedDate.getFullYear(), parsedDate.getMonth() + 1, parsedDate.getDate()),
        time: formatTimeParts(parsedDate.getHours(), parsedDate.getMinutes(), parsedDate.getSeconds()),
      };
    }

    return null;
  }

  function parseExcelTime(value) {
    if (value == null || value === "") return null;

    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return formatTimeParts(value.getHours(), value.getMinutes(), value.getSeconds());
    }

    if (typeof value === "number" && value >= 0 && value < 1) {
      const totalSeconds = Math.round(value * 86400);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;
      return formatTimeParts(hours, minutes, seconds);
    }

    const text = String(value).trim();
    const match = text.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return null;

    return formatTimeParts(Number(match[1]), Number(match[2]), Number(match[3] || 0));
  }

  function parseExcelDate(value) {
    const parsed = parseExcelDateTime(value);
    return parsed ? parsed.date : null;
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

  function normalizeUser(value) {
    const text = String(value || "").trim();
    return text || "Não informado";
  }

  function normalizeMachine(value) {
    return window.LavanderiaMachines.normalizeMachine(value);
  }

  function resolveCycleType(productValue, machine) {
    return window.LavanderiaCycleType.resolveCycleType(productValue, machine);
  }

  function mapRow(row, columns) {
    const dateTime = parseExcelDateTime(readCell(row, columns.date));
    const separateTime = columns.time ? parseExcelTime(readCell(row, columns.time)) : null;
    const date = dateTime ? dateTime.date : null;
    const time = separateTime || (dateTime ? dateTime.time : "00:00:00");
    const amount = parseAmount(readCell(row, columns.amount));
    const machine = normalizeMachine(readCell(row, columns.machine));
    const productRaw = String(readCell(row, columns.cycleType) || "").trim();
    const cycleType = resolveCycleType(productRaw, machine);
    const paymentMethod = normalizePaymentMethod(readCell(row, columns.paymentMethod));
    const user = normalizeUser(columns.user ? readCell(row, columns.user) : "");

    if (!date || amount <= 0) return null;

    return {
      date,
      time,
      amount,
      cycleType,
      productRaw,
      machine,
      paymentMethod,
      user,
      shift: window.LavanderiaShifts.classifyShift(time),
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

    const columns = {
      date: findColumnKey(rows[0], COLUMN_ALIASES.date, DATE_COLUMN_NAMES),
      time: findColumnKey(rows[0], COLUMN_ALIASES.time),
      amount: findColumnKey(rows[0], COLUMN_ALIASES.amount, AMOUNT_COLUMN_NAMES),
      cycleType: findColumnKey(rows[0], COLUMN_ALIASES.cycleType),
      machine: findColumnKey(rows[0], COLUMN_ALIASES.machine),
      paymentMethod: findColumnKey(rows[0], COLUMN_ALIASES.paymentMethod, PAYMENT_COLUMN_NAMES),
      user: findColumnKey(rows[0], COLUMN_ALIASES.user, USER_COLUMN_NAMES),
    };

    const requiredColumns = ["date", "amount", "cycleType", "machine", "paymentMethod"];
    const missing = requiredColumns
      .filter((key) => !columns[key])
      .map((key) => key);

    if (missing.length > 0) {
      const labels = {
        date: "Data",
        amount: "Total Venda",
        cycleType: "Produtos",
        machine: "Máquina",
        paymentMethod: "Tipo cartão",
      };
      throw new Error(
        `Colunas não encontradas: ${missing.map((key) => labels[key]).join(", ")}. Verifique o cabeçalho da planilha.`,
      );
    }

    const transactions = rows
      .map((row) => mapRow(row, columns))
      .filter(Boolean);

    if (transactions.length === 0) {
      throw new Error(
        "Nenhuma venda válida foi encontrada. Verifique as colunas Data e Total Venda e se os valores estão preenchidos.",
      );
    }

    return transactions;
  }

  async function loadExcelFile(file) {
    if (!file) return;

    if (!window.XLSX) {
      throw new Error("Biblioteca de leitura do Excel não carregou. Verifique sua conexão com a internet.");
    }

    const buffer = await file.arrayBuffer();
    const workbook = window.XLSX.read(buffer, { type: "array", cellDates: true });
    const transactions = parseWorkbook(workbook);
    const totalRevenue = transactions.reduce((sum, item) => sum + item.amount, 0);

    window.LAVANDERIA_DATA.setFromTransactions(transactions, file.name);

    window.dispatchEvent(
      new CustomEvent("lavanderia:data-loaded", {
        detail: {
          fileName: file.name,
          count: transactions.length,
          totalRevenue,
        },
      }),
    );
  }

  window.LavanderiaExcel = {
    loadExcelFile,
  };
})();
