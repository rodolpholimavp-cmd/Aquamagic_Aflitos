(function () {
  async function loadRemoteData() {
    const config = window.LAVANDERIA_CONFIG;
    if (!config || !config.dataUrl) return null;

    const url = `${config.dataUrl}?v=${Date.now()}`;

    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) return null;

      const parsed = await response.json();
      if (!Array.isArray(parsed.transactions) || parsed.transactions.length === 0) {
        return null;
      }

      window.LAVANDERIA_DATA.setFromTransactions(parsed.transactions, parsed.sourceFile || "Dados publicados", {
        loadedAt: parsed.loadedAt,
        skipSave: true,
      });

      return parsed;
    } catch (error) {
      console.warn("Não foi possível carregar os dados publicados.", error);
      return null;
    }
  }

  function buildPublishedPayload() {
    return {
      sourceFile: window.LAVANDERIA_DATA.sourceFile,
      loadedAt: new Date().toISOString(),
      transactions: window.LAVANDERIA_DATA.transactions,
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
