(function () {
  if (window.Chart && window.ChartDataLabels) {
    Chart.register(ChartDataLabels);
  }

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

  let availableYears = [];

  function getTransactions() {
    return window.LAVANDERIA_DATA.transactions;
  }

  function deriveYearsFromData() {
    const years = new Set();
    getTransactions().forEach((item) => {
      years.add(parseDate(item.date).getFullYear());
    });
    return [...years].sort((a, b) => a - b);
  }

  function deriveMonthsFromData() {
    const months = new Set();
    getTransactions().forEach((item) => {
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

  const state = {
    primary: defaultFilter(),
    compare: defaultFilter(),
    compareEnabled: false,
    groupBy: "month",
    filterOpen: false,
    userRankingSort: "revenue",
    charts: {},
  };

  const chartColors = {
    primary: "#3b82f6",
    primarySoft: "rgba(59, 130, 246, 0.75)",
    compare: "#64748b",
    compareSoft: "rgba(100, 116, 139, 0.65)",
    payment: ["#2563eb", "#3b82f6", "#60a5fa", "#475569"],
    cycle: ["#2563eb", "#334155"],
    machines: ["#1d4ed8", "#2563eb", "#3b82f6", "#60a5fa", "#1e40af", "#1e3a8a", "#475569", "#64748b"],
    grid: "rgba(148, 163, 184, 0.15)",
    text: "#94a3b8",
  };

  function parseDate(value) {
    const [year, month, day] = value.split("-").map(Number);
    return new Date(year, month - 1, day);
  }

  function sumAmount(items) {
    return items.reduce((total, item) => total + item.amount, 0);
  }

  function uniqueDays(items) {
    return new Set(items.map((item) => item.date)).size;
  }

  function groupSum(items, keyFn) {
    const map = new Map();
    items.forEach((item) => {
      const key = keyFn(item);
      map.set(key, (map.get(key) || 0) + item.amount);
    });
    return map;
  }

  function groupCount(items, keyFn) {
    const map = new Map();
    items.forEach((item) => {
      const key = keyFn(item);
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
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

  function filterTransactions(filter) {
    return getTransactions().filter((item) => matchesFilter(item, filter));
  }

  function formatMonthYear(month, year) {
    return `${monthNames[month].slice(0, 3)}/${year}`;
  }

  function formatDayMonthYear(day, month, year) {
    return `${String(day).padStart(2, "0")}/${String(month + 1).padStart(2, "0")}/${year}`;
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

  function updateFilterSummary() {
    const summary = document.getElementById("filterSummary");
    summary.textContent = describeFilterText(state.primary);
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
      select.innerHTML = "";
      options.forEach(({ value, label }) => {
        const option = document.createElement("option");
        option.value = String(value);
        option.textContent = label;
        select.appendChild(option);
      });
    }

    ["primaryYears", "compareYears"].forEach((id) => fill(id, yearOptions));
    ["primaryMonths", "compareMonths"].forEach((id) => fill(id, monthOptions));
    ["primaryDays", "compareDays"].forEach((id) => fill(id, dayOptions));
  }

  function refreshDataDerivedOptions() {
    availableYears = deriveYearsFromData();
    populateSelects();
  }

  function updateDataSourceLabel(detail) {
    const label = document.getElementById("dataSourceLabel");
    if (!detail) {
      label.textContent = "Nenhuma planilha carregada";
      return;
    }

    let text = `${detail.fileName} · ${detail.count.toLocaleString("pt-BR")} vendas`;
    if (detail.totalRevenue != null) {
      text += ` · ${currency.format(detail.totalRevenue)}`;
    }
    if (detail.fromCache) {
      text += " · dados salvos no navegador";
    }
    if (detail.fromRemote) {
      text += " · dados publicados na web";
    }
    label.textContent = text;
  }

  function applyLoadedData(detail) {
    refreshDataDerivedOptions();
    state.primary = defaultFilter();
    state.compare = defaultFilter();
    state.compareEnabled = false;
    state.groupBy = "month";
    syncSelectsFromState();
    updateDataSourceLabel(detail);
    renderDashboard(true);
  }

  function selectAllInSelect(selectId) {
    const select = document.getElementById(selectId);
    [...select.options].forEach((option) => {
      option.selected = true;
    });
  }

  function deselectAllInSelect(selectId) {
    const select = document.getElementById(selectId);
    [...select.options].forEach((option) => {
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

  function syncSelectsFromState() {
    setSelectedValues(document.getElementById("primaryYears"), state.primary.years);
    setSelectedValues(document.getElementById("primaryMonths"), state.primary.months);
    setSelectedValues(document.getElementById("primaryDays"), state.primary.days);
    setSelectedValues(document.getElementById("compareYears"), state.compare.years);
    setSelectedValues(document.getElementById("compareMonths"), state.compare.months);
    setSelectedValues(document.getElementById("compareDays"), state.compare.days);
    document.getElementById("compareFilterToggle").checked = state.compareEnabled;
    document.getElementById("groupBySelect").value = state.groupBy;
    document.getElementById("compareFilterBlock").classList.toggle("is-hidden", !state.compareEnabled);
  }

  function readFiltersFromSelects() {
    return {
      primary: {
        years: getSelectedValues(document.getElementById("primaryYears"), Number),
        months: getSelectedValues(document.getElementById("primaryMonths"), Number),
        days: getSelectedValues(document.getElementById("primaryDays"), Number),
      },
      compare: {
        years: getSelectedValues(document.getElementById("compareYears"), Number),
        months: getSelectedValues(document.getElementById("compareMonths"), Number),
        days: getSelectedValues(document.getElementById("compareDays"), Number),
      },
      compareEnabled: document.getElementById("compareFilterToggle").checked,
      groupBy: document.getElementById("groupBySelect").value,
    };
  }

  function setFilterDrawerOpen(isOpen) {
    state.filterOpen = isOpen;
    document.getElementById("filterDrawer").classList.toggle("is-hidden", !isOpen);
    document.getElementById("filterDrawer").setAttribute("aria-hidden", String(!isOpen));
    document.getElementById("toggleFilterBtn").setAttribute("aria-expanded", String(isOpen));
    document.getElementById("toggleFilterBtn").textContent = isOpen ? "Fechar" : "Alterar período";

    if (isOpen) {
      syncSelectsFromState();
    }
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
    if (groupBy === "month") {
      return formatMonthYear(parts[1], parts[0]);
    }

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

  function buildGroupedSeries(items, groupBy) {
    const map = groupSum(items, (item) => bucketKey(item, groupBy));
    const keys = sortBucketKeys([...map.keys()], groupBy);

    return {
      keys,
      labels: keys.map((key) => bucketLabel(key, groupBy)),
      values: keys.map((key) => Math.round((map.get(key) || 0) * 100) / 100),
    };
  }

  function describeShort(filter) {
    const years = filter.years.sort((a, b) => a - b).join("/");
    if (filter.months.length === 1 && filter.days.length === 0) {
      return `${monthNames[filter.months[0]].slice(0, 3)}/${years}`;
    }
    if (filter.months.length === 1 && filter.days.length > 0) {
      const days = filter.days.map((day) => String(day).padStart(2, "0")).join(", ");
      return `${days} ${monthNames[filter.months[0]].slice(0, 3)}/${years}`;
    }
    return years;
  }

  function sumForMonth(items, month) {
    return sumAmount(items.filter((item) => parseDate(item.date).getMonth() === month));
  }

  function sumForDay(items, day) {
    return sumAmount(items.filter((item) => parseDate(item.date).getDate() === day));
  }

  function sameMonthSelection(a, b) {
    if (a.length !== b.length) return false;
    const sortedA = [...a].sort((left, right) => left - right);
    const sortedB = [...b].sort((left, right) => left - right);
    return sortedA.every((value, index) => value === sortedB[index]);
  }

  function buildAlignedDayComparison(primaryItems, compareItems) {
    const daySet = new Set([
      ...primaryItems.map((item) => parseDate(item.date).getDate()),
      ...compareItems.map((item) => parseDate(item.date).getDate()),
    ]);

    let days = [...daySet].sort((a, b) => a - b);

    if (state.primary.days.length > 0 || state.compare.days.length > 0) {
      const allowed = new Set([
        ...(state.primary.days.length > 0 ? state.primary.days : days),
        ...(state.compare.days.length > 0 ? state.compare.days : days),
      ]);
      days = days.filter((day) => allowed.has(day));
    }

    return {
      labels: days.map((day) => `Dia ${String(day).padStart(2, "0")}`),
      datasets: [
        {
          label: `Principal (${describeShort(state.primary)})`,
          data: days.map((day) => Math.round(sumForDay(primaryItems, day) * 100) / 100),
          backgroundColor: chartColors.primarySoft,
          borderColor: chartColors.primary,
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: `Comparação (${describeShort(state.compare)})`,
          data: days.map((day) => Math.round(sumForDay(compareItems, day) * 100) / 100),
          backgroundColor: chartColors.compareSoft,
          borderColor: chartColors.compare,
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  }

  function buildAlignedMonthComparison(primaryItems, compareItems) {
    const months = [...state.primary.months].sort((a, b) => a - b);

    return {
      labels: months.map((month) => monthNames[month].slice(0, 3)),
      datasets: [
        {
          label: `Principal (${describeShort(state.primary)})`,
          data: months.map((month) => Math.round(sumForMonth(primaryItems, month) * 100) / 100),
          backgroundColor: chartColors.primarySoft,
          borderColor: chartColors.primary,
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: `Comparação (${describeShort(state.compare)})`,
          data: months.map((month) => Math.round(sumForMonth(compareItems, month) * 100) / 100),
          backgroundColor: chartColors.compareSoft,
          borderColor: chartColors.compare,
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  }

  function buildSingleMonthTotalsComparison(primaryItems, compareItems) {
    return {
      labels: [describeShort(state.primary), describeShort(state.compare)],
      datasets: [
        {
          label: "Período principal",
          data: [Math.round(sumAmount(primaryItems) * 100) / 100, 0],
          backgroundColor: chartColors.primarySoft,
          borderColor: chartColors.primary,
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: "Período de comparação",
          data: [0, Math.round(sumAmount(compareItems) * 100) / 100],
          backgroundColor: chartColors.compareSoft,
          borderColor: chartColors.compare,
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  }

  function buildComparisonChartData() {
    const primaryItems = filterTransactions(state.primary);

    if (!state.compareEnabled) {
      const grouped = buildGroupedSeries(primaryItems, state.groupBy);
      return {
        labels: grouped.labels,
        datasets: [
          {
            label: "Faturamento",
            data: grouped.values,
            backgroundColor: chartColors.primarySoft,
            borderColor: chartColors.primary,
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      };
    }

    const compareItems = filterTransactions(state.compare);
    const sameMonths = sameMonthSelection(state.primary.months, state.compare.months);
    const singleMonthEach =
      state.primary.months.length === 1 &&
      state.compare.months.length === 1 &&
      state.primary.months[0] === state.compare.months[0];

    if (state.groupBy === "day" && sameMonths) {
      return buildAlignedDayComparison(primaryItems, compareItems);
    }

    if (state.groupBy === "month" && sameMonths) {
      return buildAlignedMonthComparison(primaryItems, compareItems);
    }

    if (state.groupBy === "month" && singleMonthEach) {
      return buildSingleMonthTotalsComparison(primaryItems, compareItems);
    }

    const primaryGrouped = buildGroupedSeries(primaryItems, state.groupBy);
    const compareGrouped = buildGroupedSeries(compareItems, state.groupBy);
    const allKeys = sortBucketKeys(
      [...new Set([...primaryGrouped.keys, ...compareGrouped.keys])],
      state.groupBy,
    );
    const primaryMap = new Map(primaryGrouped.keys.map((key, index) => [key, primaryGrouped.values[index]]));
    const compareMap = new Map(compareGrouped.keys.map((key, index) => [key, compareGrouped.values[index]]));

    return {
      labels: allKeys.map((key) => bucketLabel(key, state.groupBy)),
      datasets: [
        {
          label: "Período principal",
          data: allKeys.map((key) => primaryMap.get(key) || 0),
          backgroundColor: chartColors.primarySoft,
          borderColor: chartColors.primary,
          borderWidth: 1,
          borderRadius: 6,
        },
        {
          label: "Período de comparação",
          data: allKeys.map((key) => compareMap.get(key) || 0),
          backgroundColor: chartColors.compareSoft,
          borderColor: chartColors.compare,
          borderWidth: 1,
          borderRadius: 6,
        },
      ],
    };
  }

  function updateKpis() {
    const filtered = filterTransactions(state.primary);
    const revenue = sumAmount(filtered);
    const cycles = filtered.length;
    const days = uniqueDays(filtered);
    const cyclesPerDay = days > 0 ? cycles / days : 0;

    document.getElementById("kpiRevenue").textContent = currency.format(revenue);
    document.getElementById("kpiCycles").textContent = cycles.toLocaleString("pt-BR");
    document.getElementById("kpiCyclesPerDay").textContent = cyclesPerDay.toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    });
    document.getElementById("kpiRevenueHint").textContent = state.compareEnabled
      ? "período principal (cards não somam a comparação)"
      : "no período selecionado";
  }

  function getChartPalette(count) {
    const base = ["#2563eb", "#3b82f6", "#60a5fa", "#475569", "#1d4ed8", "#1e40af", "#64748b", "#334155"];
    return Array.from({ length: count }, (_, index) => base[index % base.length]);
  }

  function sharePercent(value, values) {
    const total = values.reduce((sum, item) => sum + item, 0);
    return total ? (value / total) * 100 : 0;
  }

  const datalabelDefaults = {
    color: "#f8fafc",
    font: { weight: "600", size: 11 },
    textAlign: "center",
  };

  const hiddenDatalabels = { display: false };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function buildUserRanking(items) {
    const totals = groupSum(items, (item) => item.user || "Não informado");
    return [...totals.entries()].map(([user, revenue]) => ({ user, revenue }));
  }

  function updateUserRankingSortButtons() {
    document.querySelectorAll(".table-sort__btn").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.sort === state.userRankingSort);
    });
  }

  function renderUserRankingTable() {
    const tbody = document.getElementById("userRankingBody");
    const filtered = filterTransactions(state.primary);
    let rows = buildUserRanking(filtered);

    if (state.userRankingSort === "name") {
      rows.sort((a, b) => a.user.localeCompare(b.user, "pt-BR", { sensitivity: "base" }));
    } else {
      rows.sort((a, b) => b.revenue - a.revenue || a.user.localeCompare(b.user, "pt-BR"));
    }

    updateUserRankingSortButtons();

    if (rows.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="3" class="data-table__empty">Nenhum usuário no período selecionado.</td></tr>';
      return;
    }

    tbody.innerHTML = rows
      .map(
        (row, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${escapeHtml(row.user)}</td>
          <td>${currency.format(row.revenue)}</td>
        </tr>`,
      )
      .join("");
  }

  function showEmptyDashboard(options = {}) {
    const isWeb = window.LAVANDERIA_CONFIG && window.LAVANDERIA_CONFIG.readOnly;
    document.getElementById("kpiRevenue").textContent = currency.format(0);
    document.getElementById("kpiCycles").textContent = "0";
    document.getElementById("kpiCyclesPerDay").textContent = "0";
    document.getElementById("kpiRevenueHint").textContent = isWeb
      ? "aguardando publicação dos dados"
      : "carregue uma planilha Excel";
    document.getElementById("filterSummary").textContent = "Nenhum dado carregado";
    document.getElementById("chartDesc").textContent =
      options.message ||
      (isWeb
        ? "Os dados ainda não foram publicados. Peça ao administrador para atualizar."
        : "Carregue sua planilha Excel para visualizar os gráficos.");

    Object.values(state.charts).forEach((chart) => chart.destroy());
    state.charts = {};

    document.getElementById("userRankingBody").innerHTML =
      '<tr><td colspan="3" class="data-table__empty">Carregue a planilha para ver o ranking.</td></tr>';
  }

  function configureViewMode() {
    const isOwner = !window.LAVANDERIA_CONFIG || !window.LAVANDERIA_CONFIG.readOnly;
    const ownerActions = document.getElementById("ownerActions");
    const footer = document.getElementById("appFooter");

    if (isOwner) {
      ownerActions.classList.remove("is-hidden");
      footer.textContent =
        "Carregue a planilha Excel, clique em Publicar na web e execute publicar.bat para atualizar o link dos sócios.";
    } else {
      ownerActions.classList.add("is-hidden");
      footer.textContent = "Dashboard compartilhado — somente visualização.";
    }
  }

  function handlePublishData() {
    if (window.LAVANDERIA_DATA.transactions.length === 0) {
      alert("Carregue a planilha Excel antes de publicar na web.");
      return;
    }

    window.LavanderiaRemote.downloadPublishedData();
    alert(
      "Arquivo dashboard-data.json baixado.\n\n" +
        "Próximos passos:\n" +
        "1. Copie o arquivo para a pasta data\\ do projeto (substitua o existente)\n" +
        "2. Dê duplo clique em publicar.bat\n\n" +
        "Seus sócios verão os dados em:\n" +
        "https://rodolpholimavp-cmd.github.io/Aquamagic_Aflitos/",
    );
  }

  function renderRevenueChart() {
    const chartData = buildComparisonChartData();
    const config = {
      type: "bar",
      data: chartData,
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
            ticks: {
              color: chartColors.text,
              callback: (value) => currency.format(value),
            },
            grid: { color: chartColors.grid },
          },
        },
      },
    };

    if (state.charts.revenue) state.charts.revenue.destroy();
    state.charts.revenue = new Chart(document.getElementById("revenueDrillChart"), config);

    const groupLabels = { year: "ano", month: "mês", day: "dia" };
    document.getElementById("chartDesc").textContent = state.compareEnabled
      ? `Comparando dois períodos, agrupados por ${groupLabels[state.groupBy]}.`
      : `Faturamento filtrado, agrupado por ${groupLabels[state.groupBy]}.`;
  }

  function renderPaymentChart() {
    const filtered = filterTransactions(state.primary);
    const methods = window.LAVANDERIA_DATA.paymentMethods;
    const totals = methods.map((method) =>
      sumAmount(filtered.filter((item) => item.paymentMethod === method)),
    );

    const config = {
      type: "doughnut",
      data: {
        labels: methods,
        datasets: [
          {
            data: totals,
            backgroundColor: getChartPalette(methods.length),
            borderColor: "#0b1220",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: chartColors.text, padding: 16 },
          },
          datalabels: {
            ...datalabelDefaults,
            formatter(value) {
              return `${sharePercent(value, totals).toFixed(1)}%`;
            },
          },
          tooltip: {
            callbacks: {
              label(context) {
                const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
                const share = total ? (context.parsed / total) * 100 : 0;
                return `${context.label}: ${currency.format(context.parsed)} (${share.toFixed(1)}%)`;
              },
            },
          },
        },
      },
    };

    if (state.charts.payment) state.charts.payment.destroy();
    state.charts.payment = new Chart(document.getElementById("paymentChart"), config);
  }

  function renderCycleChart() {
    const filtered = filterTransactions(state.primary);
    const types = window.LAVANDERIA_DATA.cycleTypes;
    const totals = types.map((type) => filtered.filter((item) => item.cycleType === type).length);

    const config = {
      type: "pie",
      data: {
        labels: types,
        datasets: [
          {
            data: totals,
            backgroundColor: getChartPalette(types.length),
            borderColor: "#0b1220",
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: chartColors.text, padding: 16 },
          },
          datalabels: {
            ...datalabelDefaults,
            formatter(value) {
              return `${value.toLocaleString("pt-BR")}\n${sharePercent(value, totals).toFixed(1)}%`;
            },
          },
          tooltip: {
            callbacks: {
              label(context) {
                const total = context.dataset.data.reduce((sum, item) => sum + item, 0);
                const share = total ? (context.parsed / total) * 100 : 0;
                return `${context.label}: ${context.parsed} ciclos (${share.toFixed(1)}%)`;
              },
            },
          },
        },
      },
    };

    if (state.charts.cycle) state.charts.cycle.destroy();
    state.charts.cycle = new Chart(document.getElementById("cycleChart"), config);
  }

  function renderShiftChart() {
    const filtered = filterTransactions(state.primary);
    const shifts = window.LavanderiaShifts.SHIFT_ORDER;
    const revenueByShift = shifts.map((shift) =>
      sumAmount(filtered.filter((item) => window.LavanderiaShifts.getShift(item) === shift)),
    );
    const cyclesByShift = shifts.map(
      (shift) => filtered.filter((item) => window.LavanderiaShifts.getShift(item) === shift).length,
    );

    const config = {
      type: "bar",
      data: {
        labels: shifts,
        datasets: [
          {
            label: "Faturamento",
            data: revenueByShift,
            backgroundColor: getChartPalette(shifts.length),
            borderColor: "#1e3a8a",
            borderWidth: 1,
            borderRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          datalabels: {
            ...datalabelDefaults,
            color: "#f8fafc",
            anchor: "start",
            align: "end",
            offset: 8,
            clamp: true,
            formatter(_value, context) {
              return cyclesByShift[context.dataIndex].toLocaleString("pt-BR");
            },
          },
          tooltip: {
            callbacks: {
              label(context) {
                const revenue = context.parsed.y;
                const share = sharePercent(revenue, revenueByShift);
                return [
                  `Faturamento: ${currency.format(revenue)}`,
                  `${share.toFixed(1)}% do faturamento`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: chartColors.text },
            grid: { display: false },
          },
          y: {
            ticks: {
              color: chartColors.text,
              callback(value) {
                return currency.format(value);
              },
            },
            grid: { color: chartColors.grid },
          },
        },
      },
    };

    if (state.charts.shift) state.charts.shift.destroy();
    state.charts.shift = new Chart(document.getElementById("shiftChart"), config);
  }

  function renderMachineChart() {
    const filtered = filterTransactions(state.primary);
    const counts = groupCount(filtered, (item) => item.machine);
    const ranking = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([machine, uses]) => ({ machine, uses }));

    const config = {
      type: "bar",
      data: {
        labels: ranking.map((item) => item.machine),
        datasets: [
          {
            label: "Ciclos realizados",
            data: ranking.map((item) => item.uses),
            backgroundColor: getChartPalette(ranking.length),
            borderColor: "#1e3a8a",
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
                return `${context.parsed.x} ciclos`;
              },
            },
          },
        },
        scales: {
          x: {
            ticks: { color: chartColors.text, precision: 0 },
            grid: { color: chartColors.grid },
          },
          y: {
            ticks: { color: chartColors.text },
            grid: { display: false },
          },
        },
      },
    };

    if (state.charts.machine) state.charts.machine.destroy();
    state.charts.machine = new Chart(document.getElementById("machineChart"), config);
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

  function renderDashboard(skipValidation) {
    if (getTransactions().length === 0) {
      showEmptyDashboard();
      return;
    }

    if (!skipValidation) {
      if (!validateFilter(state.primary, "Período principal")) return;
      if (state.compareEnabled && !validateFilter(state.compare, "Período de comparação")) return;
    } else if (state.primary.years.length === 0 && availableYears.length > 0) {
      state.primary = defaultFilter();
      state.compare = defaultFilter();
      syncSelectsFromState();
    }

    updateFilterSummary();
    updateKpis();
    renderRevenueChart();
    renderPaymentChart();
    renderCycleChart();
    renderShiftChart();
    renderMachineChart();
    renderUserRankingTable();
    setFilterDrawerOpen(false);
  }

  async function handleExcelSelected(event) {
    const file = event.target.files[0];
    if (!file) return;

    const button = document.getElementById("loadExcelBtn");
    button.disabled = true;
    button.textContent = "Atualizando...";

    try {
      await window.LavanderiaExcel.loadExcelFile(file);
    } catch (error) {
      alert(error.message || "Não foi possível ler a planilha.");
    } finally {
      button.disabled = false;
      button.textContent = "Atualizar Dados";
      event.target.value = "";
    }
  }

  document.getElementById("loadExcelBtn").addEventListener("click", () => {
    document.getElementById("excelFileInput").click();
  });

  document.getElementById("publishDataBtn").addEventListener("click", handlePublishData);

  document.getElementById("sortUsersByRevenue").addEventListener("click", () => {
    state.userRankingSort = "revenue";
    renderUserRankingTable();
  });

  document.getElementById("sortUsersByName").addEventListener("click", () => {
    state.userRankingSort = "name";
    renderUserRankingTable();
  });

  document.getElementById("excelFileInput").addEventListener("change", handleExcelSelected);

  window.addEventListener("lavanderia:data-loaded", (event) => {
    applyLoadedData(event.detail);
  });

  document.getElementById("toggleFilterBtn").addEventListener("click", () => {
    setFilterDrawerOpen(!state.filterOpen);
  });

  document.getElementById("compareFilterToggle").addEventListener("change", (event) => {
    document.getElementById("compareFilterBlock").classList.toggle("is-hidden", !event.target.checked);
  });

  document.getElementById("groupBySelect").addEventListener("change", (event) => {
    state.groupBy = event.target.value;
  });

  document.getElementById("applyFilters").addEventListener("click", () => {
    const draft = readFiltersFromSelects();

    if (!validateFilter(draft.primary, "Período principal")) return;
    if (draft.compareEnabled && !validateFilter(draft.compare, "Período de comparação")) return;

    state.primary = draft.primary;
    state.compare = draft.compare;
    state.compareEnabled = draft.compareEnabled;
    state.groupBy = draft.groupBy;
    renderDashboard();
  });

  document.getElementById("cancelFilters").addEventListener("click", () => {
    setFilterDrawerOpen(false);
  });

  document.getElementById("resetFilters").addEventListener("click", () => {
    state.primary = defaultFilter();
    state.compare = defaultFilter();
    state.compareEnabled = false;
    state.groupBy = "month";
    syncSelectsFromState();
    renderDashboard();
  });

  document.querySelectorAll("[data-select-all]").forEach((button) => {
    button.addEventListener("click", () => {
      selectAllInSelect(button.dataset.selectAll);
    });
  });

  document.querySelectorAll("[data-deselect-all]").forEach((button) => {
    button.addEventListener("click", () => {
      deselectAllInSelect(button.dataset.deselectAll);
    });
  });

  populateSelects();
  refreshDataDerivedOptions();
  [
    "primaryYears",
    "primaryMonths",
    "primaryDays",
    "compareYears",
    "compareMonths",
    "compareDays",
  ].forEach((id) => enableClickToggle(document.getElementById(id)));

  setFilterDrawerOpen(false);
  configureViewMode();

  async function bootstrapData() {
    if (window.LAVANDERIA_CONFIG && window.LAVANDERIA_CONFIG.readOnly) {
      const remoteData = await window.LavanderiaRemote.loadRemoteData();
      if (remoteData) {
        const totalRevenue = remoteData.transactions.reduce((sum, item) => sum + item.amount, 0);
        applyLoadedData({
          fileName: remoteData.sourceFile || "Dados publicados",
          count: remoteData.transactions.length,
          totalRevenue,
          fromRemote: true,
        });
        return;
      }

      showEmptyDashboard();
      return;
    }

    const cachedData = window.LAVANDERIA_DATA.loadFromStorage();
    if (cachedData) {
      const totalRevenue = window.LAVANDERIA_DATA.transactions.reduce((sum, item) => sum + item.amount, 0);
      applyLoadedData({
        fileName: cachedData.sourceFile || "Planilha salva",
        count: cachedData.transactions.length,
        totalRevenue,
        fromCache: true,
      });
    } else {
      showEmptyDashboard();
    }
  }

  bootstrapData();
})();
