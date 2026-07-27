(function () {
  const MONTHS = [
    { value: 0, label: "Jan" },
    { value: 1, label: "Fev" },
    { value: 2, label: "Mar" },
    { value: 3, label: "Abr" },
    { value: 4, label: "Mai" },
    { value: 5, label: "Jun" },
    { value: 6, label: "Jul" },
    { value: 7, label: "Ago" },
    { value: 8, label: "Set" },
    { value: 9, label: "Out" },
    { value: 10, label: "Nov" },
    { value: 11, label: "Dez" },
  ];

  const monthNames = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
  ];

  const currency = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const chartColors = {
    credit: "#22c55e",
    creditSoft: "rgba(34, 197, 94, 0.75)",
    debit: "#ef4444",
    debitSoft: "rgba(239, 68, 68, 0.75)",
    balance: "#f59e0b",
    grid: "rgba(148, 163, 184, 0.15)",
    text: "#94a3b8",
  };

  const hiddenDatalabels = { display: false };

  let availableYears = [];
  const charts = {};

  const state = {
    primary: null,
    groupBy: "month",
    filterOpen: false,
    supplierSort: "value",
  };

  function getMovements() {
    return window.LAVANDERIA_DATA.cashFlow || [];
  }

  function parseDate(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function deriveYearsFromData() {
    const years = new Set();
    getMovements().forEach((item) => {
      years.add(parseDate(item.date).getFullYear());
    });
    return [...years].sort((a, b) => a - b);
  }

  function deriveMonthsFromData() {
    const months = new Set();
    getMovements().forEach((item) => {
      months.add(parseDate(item.date).getMonth());
    });
    return [...months].sort((a, b) => a - b);
  }

  function defaultFilter() {
    const monthsInData = deriveMonthsFromData();
    return {
      years: [...availableYears],
      months: monthsInData.length > 0 ? monthsInData : MONTHS.map((month) => month.value),
      days: [],
    };
  }

  function matchesFilter(item, filter) {
    const date = parseDate(item.date);
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    if (!filter.years.includes(year)) return false;
    if (!filter.months.includes(month)) return false;
    if (filter.days.length > 0 && !filter.days.includes(day)) return false;
    return true;
  }

  function filterMovements(filter) {
    return getMovements().filter((item) => matchesFilter(item, filter));
  }

  function describeDays(days) {
    if (days.length === 0) return "todos os dias";
    return `dias ${days.map((day) => String(day).padStart(2, "0")).join(", ")}`;
  }

  function describeFilterText(filter) {
    const years = filter.years.sort((a, b) => a - b).join(", ");
    const months =
      filter.months.length === 12
        ? "todos os meses"
        : filter.months
            .sort((a, b) => a - b)
            .map((month) => monthNames[month].slice(0, 3))
            .join(", ");
    const days = describeDays(filter.days);
    return `Anos ${years} · ${months} · ${days}`;
  }

  function formatMonthYear(month, year) {
    return `${monthNames[month].slice(0, 3)}/${year}`;
  }

  function formatDayMonthYear(day, month, year) {
    return `${String(day).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}/${year}`;
  }

  function bucketKey(item, groupBy) {
    const date = parseDate(item.date);
    if (groupBy === "year") return String(date.getFullYear());
    if (groupBy === "month") return `${date.getFullYear()}-${date.getMonth()}`;
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }

  function bucketLabel(key, groupBy) {
    if (groupBy === "year") return key;
    const parts = key.split("-").map(Number);
    if (groupBy === "month") return formatMonthYear(parts[1], parts[0]);
    return formatDayMonthYear(parts[2], parts[1], parts[0]);
  }

  function sortBucketKeys(keys, groupBy) {
    return keys.sort((a, b) => {
      if (groupBy === "year") return Number(a) - Number(b);
      const partsA = a.split("-").map(Number);
      const partsB = b.split("-").map(Number);
      if (partsA[0] !== partsB[0]) return partsA[0] - partsB[0];
      if (groupBy === "month") return partsA[1] - partsB[1];
      if (partsA[1] !== partsB[1]) return partsA[1] - partsB[1];
      return partsA[2] - partsB[2];
    });
  }

  function sumCredits(items) {
    return items.filter((item) => item.amount > 0).reduce((sum, item) => sum + item.amount, 0);
  }

  function sumDebitsAbs(items) {
    return items.filter((item) => item.amount < 0).reduce((sum, item) => sum + Math.abs(item.amount), 0);
  }

  function sumBalance(items) {
    return items.reduce((sum, item) => sum + item.amount, 0);
  }

  function groupSum(items, keyFn, valueFn) {
    const map = new Map();
    items.forEach((item) => {
      const key = keyFn(item);
      map.set(key, (map.get(key) || 0) + valueFn(item));
    });
    return map;
  }

  function getChartPalette(count) {
    const base = ["#2563eb", "#3b82f6", "#60a5fa", "#475569", "#1d4ed8", "#1e40af", "#64748b", "#334155"];
    return Array.from({ length: count }, (_, index) => base[index % base.length]);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function getSelectedValues(select, parser) {
    return [...select.selectedOptions].map((option) => parser(option.value));
  }

  function setSelectedValues(select, values) {
    const valueSet = new Set(values.map(String));
    [...select.options].forEach((option) => {
      option.selected = valueSet.has(option.value);
    });
  }

  function populateSelects() {
    const yearOptions = availableYears.map((year) => ({ value: year, label: String(year) }));
    const monthOptions = MONTHS;
    const dayOptions = Array.from({ length: 31 }, (_, index) => ({
      value: index + 1,
      label: String(index + 1).padStart(2, "0"),
    }));

    function fill(selectId, options) {
      const select = document.getElementById(selectId);
      if (!select) return;
      select.innerHTML = "";
      options.forEach(({ value, label }) => {
        const option = document.createElement("option");
        option.value = String(value);
        option.textContent = label;
        select.appendChild(option);
      });
    }

    fill("finPrimaryYears", yearOptions);
    fill("finPrimaryMonths", monthOptions);
    fill("finPrimaryDays", dayOptions);
  }

  function refreshDataDerivedOptions() {
    availableYears = deriveYearsFromData();
    populateSelects();
  }

  function syncSelectsFromState() {
    setSelectedValues(document.getElementById("finPrimaryYears"), state.primary.years);
    setSelectedValues(document.getElementById("finPrimaryMonths"), state.primary.months);
    setSelectedValues(document.getElementById("finPrimaryDays"), state.primary.days);
    document.getElementById("finGroupBySelect").value = state.groupBy;
  }

  function readFiltersFromSelects() {
    return {
      primary: {
        years: getSelectedValues(document.getElementById("finPrimaryYears"), Number),
        months: getSelectedValues(document.getElementById("finPrimaryMonths"), Number),
        days: getSelectedValues(document.getElementById("finPrimaryDays"), Number),
      },
      groupBy: document.getElementById("finGroupBySelect").value,
    };
  }

  function validateFilter(filter, label) {
    if (filter.years.length === 0) {
      alert(`Selecione pelo menos um ano em ${label}.`);
      return false;
    }
    if (filter.months.length === 0) {
      alert(`Selecione pelo menos um mês em ${label}.`);
      return false;
    }
    return true;
  }

  function setFilterDrawerOpen(isOpen) {
    state.filterOpen = isOpen;
    document.getElementById("finFilterDrawer").classList.toggle("is-hidden", !isOpen);
    document.getElementById("finFilterDrawer").setAttribute("aria-hidden", String(!isOpen));
    document.getElementById("finToggleFilterBtn").setAttribute("aria-expanded", String(isOpen));
    document.getElementById("finToggleFilterBtn").textContent = isOpen ? "Fechar" : "Alterar período";
    if (isOpen) syncSelectsFromState();
  }

  function selectAllInSelect(selectId) {
    [...document.getElementById(selectId).options].forEach((option) => {
      option.selected = true;
    });
  }

  function deselectAllInSelect(selectId) {
    [...document.getElementById(selectId).options].forEach((option) => {
      option.selected = false;
    });
  }

  function enableClickToggle(select) {
    select.addEventListener("mousedown", (event) => {
      event.preventDefault();
      const option = event.target;
      if (option.tagName !== "OPTION") return;
      option.selected = !option.selected;
      select.dispatchEvent(new Event("change"));
    });
  }

  function updateFilterSummary() {
    document.getElementById("finFilterSummary").textContent = describeFilterText(state.primary);
  }

  function updateDataSourceLabel(detail) {
    const label = document.getElementById("finDataSourceLabel");
    if (!detail) {
      label.textContent = "Nenhuma planilha de fluxo de caixa carregada";
      return;
    }

    let text = `${detail.fileName} · ${detail.count.toLocaleString("pt-BR")} movimentações`;
    if (detail.balance != null) {
      text += ` · saldo ${currency.format(detail.balance)}`;
    }
    if (detail.fromCache) text += " · dados salvos no navegador";
    if (detail.fromRemote) text += " · dados publicados na web";
    label.textContent = text;
  }

  function updateKpis(items) {
    const credits = sumCredits(items);
    const debitsAbs = sumDebitsAbs(items);
    const balance = sumBalance(items);

    document.getElementById("finKpiCredits").textContent = currency.format(credits);
    document.getElementById("finKpiDebits").textContent = currency.format(debitsAbs);

    const balanceEl = document.getElementById("finKpiBalance");
    balanceEl.textContent = currency.format(balance);
    balanceEl.classList.remove("kpi-value--positive", "kpi-value--negative");
    if (balance > 0) balanceEl.classList.add("kpi-value--positive");
    if (balance < 0) balanceEl.classList.add("kpi-value--negative");
  }

  function buildCashFlowSeries(items, groupBy) {
    const keys = sortBucketKeys([...new Set(items.map((item) => bucketKey(item, groupBy)))], groupBy);
    const credits = keys.map((key) => {
      const bucketItems = items.filter((item) => bucketKey(item, groupBy) === key && item.amount > 0);
      return Math.round(sumCredits(bucketItems) * 100) / 100;
    });
    const debits = keys.map((key) => {
      const bucketItems = items.filter((item) => bucketKey(item, groupBy) === key && item.amount < 0);
      return Math.round(sumDebitsAbs(bucketItems) * 100) / 100;
    });
    const balance = keys.map((key) => {
      const bucketItems = items.filter((item) => bucketKey(item, groupBy) === key);
      return Math.round(sumBalance(bucketItems) * 100) / 100;
    });

    return {
      labels: keys.map((key) => bucketLabel(key, groupBy)),
      credits,
      debits,
      balance,
    };
  }

  function renderCashFlowChart(items) {
    const series = buildCashFlowSeries(items, state.groupBy);
    const config = {
      type: "bar",
      data: {
        labels: series.labels,
        datasets: [
          {
            type: "bar",
            label: "Entradas",
            data: series.credits,
            backgroundColor: chartColors.creditSoft,
            borderColor: chartColors.credit,
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: "y",
            order: 2,
          },
          {
            type: "bar",
            label: "Saídas",
            data: series.debits,
            backgroundColor: chartColors.debitSoft,
            borderColor: chartColors.debit,
            borderWidth: 1,
            borderRadius: 6,
            yAxisID: "y",
            order: 3,
          },
          {
            type: "line",
            label: "Saldo",
            data: series.balance,
            borderColor: chartColors.balance,
            backgroundColor: "rgba(245, 158, 11, 0.15)",
            borderWidth: 2.5,
            pointRadius: 3,
            pointHoverRadius: 5,
            tension: 0.35,
            yAxisID: "y1",
            order: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: { color: chartColors.text },
          },
          datalabels: hiddenDatalabels,
          tooltip: {
            callbacks: {
              label(context) {
                return `${context.dataset.label}: ${currency.format(context.parsed.y)}`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: chartColors.text },
            grid: { color: chartColors.grid },
          },
          y: {
            position: "left",
            ticks: {
              color: chartColors.text,
              callback: (value) => currency.format(value),
            },
            grid: { color: chartColors.grid },
          },
          y1: {
            position: "right",
            ticks: {
              color: chartColors.balance,
              callback: (value) => currency.format(value),
            },
            grid: { drawOnChartArea: false },
          },
        },
      },
    };

    if (charts.cashFlow) charts.cashFlow.destroy();
    charts.cashFlow = new Chart(document.getElementById("finCashFlowChart"), config);

    const groupLabels = { year: "ano", month: "mês", day: "dia" };
    document.getElementById("finChartDesc").textContent =
      `Entradas, saídas (valor absoluto) e saldo por ${groupLabels[state.groupBy]}.`;
  }

  function renderExitTypeChart(items) {
    const debits = items.filter((item) => item.amount < 0);
    const totals = groupSum(
      debits,
      (item) => item.classification,
      (item) => Math.abs(item.amount),
    );
    const ranking = [...totals.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([classification, value]) => ({ classification, value }));

    const barHeight = 42;
    const canvas = document.getElementById("finExitTypeChart");
    const wrap = canvas.closest(".chart-wrap--scroll");
    wrap.style.height = `${Math.max(240, ranking.length * barHeight + 40)}px`;

    const config = {
      type: "bar",
      data: {
        labels: ranking.map((item) => item.classification),
        datasets: [
          {
            label: "Saídas",
            data: ranking.map((item) => item.value),
            backgroundColor: getChartPalette(ranking.length),
            borderColor: "#991b1b",
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: hiddenDatalabels,
          tooltip: {
            callbacks: {
              label(context) {
                return currency.format(context.parsed.x);
              },
            },
          },
        },
        scales: {
          x: {
            ticks: {
              color: chartColors.text,
              callback: (value) => currency.format(value),
            },
            grid: { color: chartColors.grid },
          },
          y: {
            ticks: { color: chartColors.text },
            grid: { display: false },
          },
        },
      },
    };

    if (charts.exitType) charts.exitType.destroy();
    charts.exitType = new Chart(canvas, config);
  }

  function buildSupplierRanking(items) {
    const debits = items.filter((item) => item.amount < 0);
    const totals = groupSum(
      debits,
      (item) => item.recipient,
      (item) => Math.abs(item.amount),
    );
    return [...totals.entries()].map(([name, value]) => ({ name, value }));
  }

  function updateSupplierSortButtons() {
    document.querySelectorAll(".fin-table-sort__btn").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.sort === state.supplierSort);
    });
  }

  function renderSupplierRankingTable(items) {
    const tbody = document.getElementById("finSupplierRankingBody");
    let rows = buildSupplierRanking(items);

    if (state.supplierSort === "name") {
      rows.sort((a, b) => a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" }));
    } else {
      rows.sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, "pt-BR"));
    }

    updateSupplierSortButtons();

    if (rows.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="3" class="data-table__empty">Nenhuma saída no período selecionado.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map(
        (row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.name)}</td>
          <td>${currency.format(row.value)}</td>
        </tr>`,
      )
      .join("");
  }

  function destroyCharts() {
    Object.values(charts).forEach((chart) => chart.destroy());
    Object.keys(charts).forEach((key) => delete charts[key]);
  }

  function resizeCharts() {
    Object.values(charts).forEach((chart) => {
      if (chart && typeof chart.resize === "function") chart.resize();
    });
  }

  function showEmptyFinanceiro(message) {
    updateFilterSummary();
    document.getElementById("finKpiCredits").textContent = currency.format(0);
    document.getElementById("finKpiDebits").textContent = currency.format(0);
    const balanceEl = document.getElementById("finKpiBalance");
    balanceEl.textContent = currency.format(0);
    balanceEl.classList.remove("kpi-value--positive", "kpi-value--negative");
    document.getElementById("finChartDesc").textContent =
      message || "Carregue a planilha Base_Fluxo_Caixa.xlsx para visualizar os gráficos.";
    destroyCharts();
    document.getElementById("finSupplierRankingBody").innerHTML =
      '<tr><td colspan="3" class="data-table__empty">Carregue a planilha de fluxo de caixa para ver o ranking.</td></tr>';
  }

  function renderDashboard(skipValidation) {
    if (getMovements().length === 0) {
      showEmptyFinanceiro();
      return;
    }

    if (!state.primary) {
      state.primary = defaultFilter();
    }

    if (!skipValidation && !validateFilter(state.primary, "Período principal")) return;

    if (skipValidation && state.primary.years.length === 0 && availableYears.length > 0) {
      state.primary = defaultFilter();
      syncSelectsFromState();
    }

    const filtered = filterMovements(state.primary);
    updateFilterSummary();
    updateKpis(filtered);
    renderCashFlowChart(filtered);
    renderExitTypeChart(filtered);
    renderSupplierRankingTable(filtered);
    setFilterDrawerOpen(false);
  }

  function applyLoadedData(detail) {
    refreshDataDerivedOptions();
    state.primary = defaultFilter();
    state.groupBy = "month";
    syncSelectsFromState();
    updateDataSourceLabel(detail);
    renderDashboard(true);
  }

  function initEvents() {
    document.getElementById("finToggleFilterBtn").addEventListener("click", () => {
      setFilterDrawerOpen(!state.filterOpen);
    });

    document.getElementById("finApplyFilters").addEventListener("click", () => {
      const draft = readFiltersFromSelects();
      if (!validateFilter(draft.primary, "Período principal")) return;
      state.primary = draft.primary;
      state.groupBy = draft.groupBy;
      renderDashboard();
    });

    document.getElementById("finCancelFilters").addEventListener("click", () => {
      setFilterDrawerOpen(false);
    });

    document.getElementById("finResetFilters").addEventListener("click", () => {
      state.primary = defaultFilter();
      state.groupBy = "month";
      syncSelectsFromState();
      renderDashboard();
    });

    document.getElementById("finGroupBySelect").addEventListener("change", (event) => {
      state.groupBy = event.target.value;
    });

    document.getElementById("finSortSuppliersByValue").addEventListener("click", () => {
      state.supplierSort = "value";
      renderSupplierRankingTable(filterMovements(state.primary || defaultFilter()));
    });

    document.getElementById("finSortSuppliersByName").addEventListener("click", () => {
      state.supplierSort = "name";
      renderSupplierRankingTable(filterMovements(state.primary || defaultFilter()));
    });

    document.querySelectorAll("[data-fin-select-all]").forEach((button) => {
      button.addEventListener("click", () => selectAllInSelect(button.dataset.finSelectAll));
    });

    document.querySelectorAll("[data-fin-deselect-all]").forEach((button) => {
      button.addEventListener("click", () => deselectAllInSelect(button.dataset.finDeselectAll));
    });

    window.addEventListener("lavanderia:cashflow-loaded", (event) => {
      applyLoadedData({ ...event.detail, fromCache: false });
    });
  }

  function init() {
    state.primary = defaultFilter();
    populateSelects();
    ["finPrimaryYears", "finPrimaryMonths", "finPrimaryDays"].forEach((id) => {
      enableClickToggle(document.getElementById(id));
    });
    setFilterDrawerOpen(false);
    initEvents();
    showEmptyFinanceiro();
  }

  window.LavanderiaFinanceiro = {
    init,
    renderDashboard,
    applyLoadedData,
    updateDataSourceLabel,
    showEmptyFinanceiro,
    resizeCharts,
  };
})();
