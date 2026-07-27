(function () {
  async function loadRemoteData() {
    const config = window.LAVANDERIA_CONFIG;
    if (!config || !config.dataUrl) return null;

    const url = `${config.dataUrl}?v=${Date.now()}`;

    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return null;

      const parsed = await response.json();
      const hasTransactions = Array.isArray(parsed.transactions) && parsed.transactions.length > 0;
      const hasCashFlow = Array.isArray(parsed.cashFlow) && parsed.cashFlow.length > 0;

      if (!hasTransactions && !hasCashFlow) {
        return null;
      }

      if (hasTransactions) {
        window.LAVANDERIA_DATA.setFromTransactions(parsed.transactions, parsed.sourceFile || "Dados publicados", {
          loadedAt: parsed.loadedAt,
          skipSave: true,
        });
      }

      if (hasCashFlow) {
        window.LAVANDERIA_DATA.setFromCashFlow(parsed.cashFlow, parsed.cashFlowSourceFile || "Fluxo de caixa publicado", {
          loadedAt: parsed.cashFlowLoadedAt,
          skipSave: true,
        });
      }

      return parsed;
    } catch (error) {
      console.warn("Não foi possível carregar os dados publicados.", error);
      return null;
    }
  }

  function buildPublishedPayload() {
    return {
      sourceFile: window.LAVANDERIA_DATA.sourceFile,
      cashFlowSourceFile: window.LAVANDERIA_DATA.cashFlowSourceFile,
      loadedAt: new Date().toISOString(),
      cashFlowLoadedAt: window.LAVANDERIA_DATA.cashFlowLoadedAt || new Date().toISOString(),
      transactions: window.LAVANDERIA_DATA.transactions,
      cashFlow: window.LAVANDERIA_DATA.cashFlow,
    };
  }

  function downloadPublishedData() {
    const payload = buildPublishedPayload();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "dashboard-data.json";
    link.click();
    URL.revokeObjectURL(link.href);
    return payload;
  }

  window.LavanderiaRemote = {
    loadRemoteData,
    downloadPublishedData,
    buildPublishedPayload,
  };
})();
