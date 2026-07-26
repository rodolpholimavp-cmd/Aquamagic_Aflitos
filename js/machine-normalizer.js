(function () {
  const MACHINE_DE_PARA = {
    "11890 - secar - 02": "2 - SECAR - 02",
    "11890 - secar -": "2 - SECAR - 02",
    "3": "3 - LAVAR - 03",
    "11890": "2 - SECAR - 02",
    "4": "4 - SECAR - 04",
    "lavar - 01": "1 - LAVAR - 01",
    "secar - 02": "2 - SECAR - 02",
    "lavar - 03": "3 - LAVAR - 03",
    "lavar - 05": "5 - LAVAR - 05",
    "secar - 04": "4 - SECAR - 04",
    "secar - 06": "6 - SECAR - 06",
    "5": "5 - LAVAR - 05",
    "6": "6 - SECAR - 06",
    "1": "1 - LAVAR - 01",
    "19736 - 01": "2 - SECAR - 02",
    "19736 - 01 - seca": "2 - SECAR - 02",
    "ind": "2 - SECAR - 02",
    "4 - lavar - 03": "3 - LAVAR - 03",
  };

  const SECAGEM_MACHINES = new Set([
    "2 - secar - 02",
    "11890",
    "11890 - secar - 02",
    "11890 - secar -",
    "19736 - 01",
    "19736 - 01 - seca",
    "ind",
  ]);

  function normalizeText(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function formatStandardMachine(number, action) {
    const machineNumber = Number(number);
    const actionUpper = String(action || "").toUpperCase();
    return `${machineNumber} - ${actionUpper} - ${String(machineNumber).padStart(2, "0")}`;
  }

  function isSecagemMachine(value) {
    return SECAGEM_MACHINES.has(normalizeText(value));
  }

  function normalizeMachine(value) {
    const text = String(value || "").trim();
    if (!text) return "Não informado";

    const mapped = MACHINE_DE_PARA[normalizeText(text)];
    if (mapped) return mapped;

    const standardMatch = text.match(/^(\d+)\s*-\s*(LAVAR|SECAR)\s*-\s*(\d+)$/i);
    if (standardMatch) {
      const machineNumber = Number(standardMatch[3]);
      return formatStandardMachine(machineNumber, standardMatch[2]);
    }

    const actionOnlyMatch = text.match(/^(LAVAR|SECAR)\s*-\s*(\d+)$/i);
    if (actionOnlyMatch) {
      return formatStandardMachine(actionOnlyMatch[2], actionOnlyMatch[1]);
    }

    if (/^\d+$/.test(text)) {
      const machineNumber = Number(text);
      const action = machineNumber % 2 === 0 ? "SECAR" : "LAVAR";
      return formatStandardMachine(machineNumber, action);
    }

    return text;
  }

  function renormalizeTransaction(transaction) {
    return {
      ...transaction,
      machine: normalizeMachine(transaction.machine),
    };
  }

  function renormalizeTransactions(transactions) {
    return (Array.isArray(transactions) ? transactions : []).map(renormalizeTransaction);
  }

  window.LavanderiaMachines = {
    normalizeMachine,
    isSecagemMachine,
    renormalizeTransaction,
    renormalizeTransactions,
  };
})();
