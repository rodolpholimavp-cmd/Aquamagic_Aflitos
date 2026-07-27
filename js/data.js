/**
 * Armazena os dados reais carregados das planilhas Excel.
 */
(function () {
  const STORAGE_KEY = "lavanderia-dashboard-v4";
  const LEGACY_STORAGE_KEYS = ["lavanderia-dashboard-v3", "lavanderia-dashboard-v2", "lavanderia-dashboard-v1"];

  window.LAVANDERIA_DATA = {
    transactions: [],
    cashFlow: [],
    paymentMethods: [],
    cycleTypes: [],
    machines: [],
    sourceFile: null,
    cashFlowSourceFile: null,
    loadedAt: null,
    cashFlowLoadedAt: null,

    setFromTransactions(transactions, sourceFile, options = {}) {
      let cleaned = Array.isArray(transactions) ? transactions : [];

      if (window.LavanderiaMachines) {
        cleaned = window.LavanderiaMachines.renormalizeTransactions(cleaned);
      }

      if (window.LavanderiaCycleType) {
        cleaned = window.LavanderiaCycleType.reclassifyTransactions(cleaned);
      }

      this.transactions = cleaned;
      this.sourceFile = sourceFile || null;
      this.loadedAt = options.loadedAt || new Date().toISOString();
      this.paymentMethods = [...new Set(cleaned.map((item) => item.paymentMethod))].sort();
      this.cycleTypes = [...new Set(cleaned.map((item) => item.cycleType))].sort();
      this.machines = [...new Set(cleaned.map((item) => item.machine))].sort();

      if (!options.skipSave && (cleaned.length > 0 || this.cashFlow.length > 0)) {
        this.saveToStorage();
        LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
      }

      if (cleaned.length === 0 && this.cashFlow.length === 0 && !options.skipSave) {
        localStorage.removeItem(STORAGE_KEY);
      }
    },

    setFromCashFlow(movements, sourceFile, options = {}) {
      this.cashFlow = Array.isArray(movements) ? movements : [];
      this.cashFlowSourceFile = sourceFile || null;
      this.cashFlowLoadedAt = options.loadedAt || new Date().toISOString();

      if (!options.skipSave && (this.cashFlow.length > 0 || this.transactions.length > 0)) {
        this.saveToStorage();
        LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
      }

      if (this.cashFlow.length === 0 && this.transactions.length === 0 && !options.skipSave) {
        localStorage.removeItem(STORAGE_KEY);
      }
    },

    saveToStorage() {
      if (this.transactions.length === 0 && this.cashFlow.length === 0) {
        return false;
      }

      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            sourceFile: this.sourceFile,
            cashFlowSourceFile: this.cashFlowSourceFile,
            loadedAt: this.loadedAt,
            cashFlowLoadedAt: this.cashFlowLoadedAt,
            transactions: this.transactions,
            cashFlow: this.cashFlow,
          }),
        );
        return true;
      } catch (error) {
        console.warn("Não foi possível salvar os dados no navegador.", error);
        return false;
      }
    },

    loadFromStorage() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        const hasTransactions = Array.isArray(parsed.transactions) && parsed.transactions.length > 0;
        const hasCashFlow = Array.isArray(parsed.cashFlow) && parsed.cashFlow.length > 0;

        if (!hasTransactions && !hasCashFlow) {
          return null;
        }

        if (hasTransactions) {
          this.setFromTransactions(parsed.transactions, parsed.sourceFile, {
            loadedAt: parsed.loadedAt,
            skipSave: true,
          });
        } else {
          this.transactions = [];
          this.sourceFile = parsed.sourceFile || null;
          this.loadedAt = parsed.loadedAt || null;
        }

        if (hasCashFlow) {
          this.setFromCashFlow(parsed.cashFlow, parsed.cashFlowSourceFile, {
            loadedAt: parsed.cashFlowLoadedAt,
            skipSave: true,
          });
        } else {
          this.cashFlow = [];
          this.cashFlowSourceFile = parsed.cashFlowSourceFile || null;
          this.cashFlowLoadedAt = parsed.cashFlowLoadedAt || null;
        }

        if (!localStorage.getItem(STORAGE_KEY)) {
          this.saveToStorage();
        }

        return parsed;
      } catch (error) {
        localStorage.removeItem(STORAGE_KEY);
        LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
        return null;
      }
    },

    clear() {
      this.setFromTransactions([], null, { skipSave: true });
      this.setFromCashFlow([], null, { skipSave: true });
      localStorage.removeItem(STORAGE_KEY);
      LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    },
  };
})();
