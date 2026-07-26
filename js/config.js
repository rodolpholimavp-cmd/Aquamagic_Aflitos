(function () {
  const isLocalFile = window.location.protocol === "file:";

  window.LAVANDERIA_CONFIG = {
    dataUrl: "data/dashboard-data.json",
    /** No GitHub Pages: sócios só visualizam. Localmente (file://): você atualiza a planilha. */
    readOnly: !isLocalFile,
  };
})();
