(function () {
  const SHIFT_ORDER = ["01 - manhã", "02 - tarde", "03 - noite", "04 - madrugada"];

  function timeToSeconds(time) {
    const parts = String(time || "00:00:00").trim().split(":");
    const hours = Number(parts[0]) || 0;
    const minutes = Number(parts[1]) || 0;
    const seconds = Number(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }

  function classifyShift(time) {
    const totalSeconds = timeToSeconds(time);

    if (totalSeconds >= 5 * 3600 && totalSeconds <= 12 * 3600) {
      return "01 - manhã";
    }

    if (totalSeconds >= 12 * 3600 + 1 && totalSeconds <= 18 * 3600) {
      return "02 - tarde";
    }

    if (totalSeconds >= 18 * 3600 + 1 && totalSeconds <= 23 * 3600 + 59 * 60 + 59) {
      return "03 - noite";
    }

    return "04 - madrugada";
  }

  function getShift(transaction) {
    if (transaction && transaction.shift) {
      return transaction.shift;
    }

    return classifyShift(transaction ? transaction.time : null);
  }

  window.LavanderiaShifts = {
    SHIFT_ORDER,
    classifyShift,
    getShift,
  };
})();
