/**
 * Armazena os dados reais carregados da planilha Excel.
 */
(function () {
  const STORAGE_KEY = "lavanderia-dashboard-v3";
  const LEGACY_STORAGE_KEYS = ["lavanderia-dashboard-v2", "lavanderia-dashboard-v1"];

  window.LAVANDERIA_DATA = {
    transactions: [],
    paymentMethods: [],
    cycleTypes: [],
    machines: [],
    sourceFile: null,
    loadedAt: null,

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

      if (!options.skipSave && cleaned.length > 0) {
        this.saveToStorage();
        LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
      }

      if (cleaned.length === 0 && !options.skipSave) {
        localStorage.removeItem(STORAGE_KEY);
      }
    },

    saveToStorage() {
      if (this.transactions.length === 0) {
        return false;
      }

      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            sourceFile: this.sourceFile,
            loadedAt: this.loadedAt,
            transactions: this.transactions,
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
        if (!Array.isArray(parsed.transactions) || parsed.transactions.length === 0) {
          return null;
        }

        this.setFromTransactions(parsed.transactions, parsed.sourceFile, {
          loadedAt: parsed.loadedAt,
          skipSave: true,
        });

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
      localStorage.removeItem(STORAGE_KEY);
      LEGACY_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
    },
  };
})();
