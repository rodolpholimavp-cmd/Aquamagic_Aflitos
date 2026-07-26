(function () {
  function normalizeText(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function extractMachineNumber(machine) {
    const text = String(machine || "").trim();

    const standardMatch = text.match(/^(\d+)\s*-\s*(?:LAVAR|SECAR)\s*-\s*\d+/i);
    if (standardMatch) return Number(standardMatch[1]);

    const actionMatch = text.match(/(\d+)\s*-\s*(?:LAVAR|SECAR)/i);
    if (actionMatch) return Number(actionMatch[1]);

    const leadingMatch = text.match(/^(\d+)/);
    if (leadingMatch) return Number(leadingMatch[1]);

    return null;
  }

  function inferCycleTypeFromMachine(machine) {
    if (window.LavanderiaMachines && window.LavanderiaMachines.isSecagemMachine(machine)) {
      return "Secagem";
    }

    const text = normalizeText(machine);
    if (text.includes("secar")) return "Secagem";
    if (text.includes("lavar")) return "Lavagem";

    const number = extractMachineNumber(machine);
    if (number != null) {
      return number % 2 === 0 ? "Secagem" : "Lavagem";
    }

    return null;
  }

  function normalizeCycleTypeFromProduct(value) {
    const text = normalizeText(value);
    if (!text || text === "indefinido" || text === "outros") return "Outros";
    if (text.includes("lav")) return "Lavagem";
    if (text.includes("sec")) return "Secagem";
    return String(value).trim() || "Outros";
  }

  function resolveCycleType(productValue, machine) {
    const fromProduct = normalizeCycleTypeFromProduct(productValue);
    if (fromProduct !== "Outros") {
      return fromProduct;
    }

    const fromMachine = inferCycleTypeFromMachine(machine);
    if (fromMachine) {
      return fromMachine;
    }

    return "Outros";
  }

  function reclassifyTransaction(transaction) {
    const productValue =
      transaction.productRaw != null
        ? transaction.productRaw
        : transaction.cycleType === "Lavagem" || transaction.cycleType === "Secagem"
          ? transaction.cycleType
          : "outros";

    return {
      ...transaction,
      cycleType: resolveCycleType(productValue, transaction.machine),
    };
  }

  function reclassifyTransactions(transactions) {
    return (Array.isArray(transactions) ? transactions : []).map(reclassifyTransaction);
  }

  window.LavanderiaCycleType = {
    resolveCycleType,
    reclassifyTransaction,
    reclassifyTransactions,
  };
})();
