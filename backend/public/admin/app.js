/* =================================================================
   DASHBOARD ADMIN - APP.JS
   ================================================================= */

const API_BASE = "";
const CONTEXT = "admin/app.js";

const smsState = {
  page: 1,
  limit: 20,
  total: 0,
  filters: {
    status: "",
    provider: "",
    order: "",
    phone: "",
    from: "",
    to: "",
  },
  selectedSms: null,
};

function formatFCFA(amount) {
  return `${Number(amount || 0).toLocaleString("fr-FR")} FCFA`;
}

function formatPercent(value) {
  return `${Number(value || 0).toFixed(1)}%`;
}

function formatMs(value) {
  if (value === null || value === undefined || value === "") return "—";
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "—";
  return `${Math.round(num)} ms`;
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

function logError(action, err) {
  console.error(`[${CONTEXT}] ${action}`, err);
}

let toastTimeout;
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 3000);
}

async function apiCall(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "same-origin",
    ...options,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    if (response.status === 401) {
      showLoginOverlay(true);
    }
    const error = new Error(data?.error || `HTTP ${response.status}`);
    error.status = response.status;
    error.payload = data;
    throw error;
  }

  return data;
}

function renderRankedList(containerId, rows, mapFn) {
  const container = document.getElementById(containerId);
  if (!container) return;

  if (!rows || rows.length === 0) {
    container.innerHTML = `<li class="ranked-empty">Aucune donnée pour l'instant.</li>`;
    return;
  }

  container.innerHTML = rows
    .map((row) => {
      const mapped = mapFn(row);
      return `<li><span class="ranked-name">${mapped.name}</span><span class="ranked-value">${mapped.value}</span></li>`;
    })
    .join("");
}

function renderSimpleStats(prefix, stats) {
  const total = document.getElementById(`${prefix}TotalCount`);
  const delivered = document.getElementById(`${prefix}DeliveredCount`);
  const pending = document.getElementById(`${prefix}PendingCount`);
  const failed = document.getElementById(`${prefix}FailedCount`);
  const rate = document.getElementById(`${prefix}DeliveryRate`);
  const latency = document.getElementById(`${prefix}AvgLatency`);

  if (total) total.textContent = stats.total_sms ?? 0;
  if (delivered) delivered.textContent = stats.delivered_sms ?? 0;
  if (pending) pending.textContent = stats.pending_sms ?? 0;
  if (failed) failed.textContent = stats.failed_sms ?? 0;
  if (rate) rate.textContent = formatPercent(stats.delivery_rate ?? 0);
  if (latency) latency.textContent = formatMs(stats.avg_delivery_latency_ms ?? 0);
}

function getSmsQueryString() {
  const params = new URLSearchParams();
  params.set("page", String(smsState.page));
  params.set("limit", String(smsState.limit));
  if (smsState.filters.status) params.set("status", smsState.filters.status);
  if (smsState.filters.provider) params.set("provider", smsState.filters.provider);
  if (smsState.filters.order) params.set("order_id", smsState.filters.order);
  if (smsState.filters.phone) params.set("phone", smsState.filters.phone);
  if (smsState.filters.from) params.set("from", smsState.filters.from);
  if (smsState.filters.to) params.set("to", smsState.filters.to);
  params.set("sort", "created_at");
  params.set("direction", "desc");
  return params.toString();
}

function pillClass(status) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "DELIVERED" || normalized === "DELIVERED_TO_NETWORK") return "sms-pill-delivered";
  if (normalized === "PENDING" || normalized === "ACCEPTED") return "sms-pill-pending";
  if (normalized === "FAILED") return "sms-pill-failed";
  return "sms-pill-unknown";
}

function renderSmsTable(items) {
  const tbody = document.getElementById("smsTableBody");
  const empty = document.getElementById("smsEmptyState");
  if (!tbody || !empty) return;

  if (!items || items.length === 0) {
    tbody.innerHTML = "";
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  tbody.innerHTML = items
    .map((row) => {
      const statusClass = pillClass(row.status);
      return `
        <tr class="sms-row" data-sms-id="${row.id}">
          <td>${formatDateTime(row.created_at)}</td>
          <td>#${row.order_id ?? "—"}</td>
          <td>${row.order_table_number ?? "—"}</td>
          <td>${row.recipient_phone_masked ?? "—"}</td>
          <td>${row.message_summary ?? "—"}</td>
          <td>${row.provider ?? "—"}</td>
          <td><span class="sms-pill ${statusClass}">${row.status ?? "—"}</span></td>
          <td>${row.orange_resource_id ?? "—"}</td>
          <td>${formatMs(row.request_duration_ms)}</td>
          <td>${formatMs(row.delivery_latency_ms)}</td>
          <td>${row.error_message ? row.error_message : "—"}</td>
        </tr>
      `;
    })
    .join("");

  tbody.querySelectorAll("[data-sms-id]").forEach((row) => {
    row.addEventListener("click", () => {
      const smsId = row.dataset.smsId;
      const sms = items.find((item) => String(item.id) === String(smsId));
      if (sms) openSmsDetail(sms);
    });
  });
}

function renderSmsPagination() {
  const label = document.getElementById("smsPageLabel");
  const prev = document.getElementById("smsPrevPageBtn");
  const next = document.getElementById("smsNextPageBtn");
  const totalPages = Math.max(1, Math.ceil((smsState.total || 0) / smsState.limit));
  if (label) label.textContent = `Page ${smsState.page} / ${totalPages}`;
  if (prev) prev.disabled = smsState.page <= 1;
  if (next) next.disabled = smsState.page >= totalPages;
}

function detailItem(label, value) {
  return `
    <div class="detail-item">
      <span class="detail-label">${label}</span>
      <span class="detail-value">${value || "—"}</span>
    </div>
  `;
}

function openSmsDetail(sms) {
  smsState.selectedSms = sms;
  const overlay = document.getElementById("smsDetailOverlay");
  const modal = document.getElementById("smsDetailModal");
  const content = document.getElementById("smsDetailContent");
  if (!overlay || !modal || !content) return;

  content.innerHTML = [
    detailItem("Commande", sms.order_id ? `#${sms.order_id}` : "—"),
    detailItem("Table", sms.order_table_number || "—"),
    detailItem("Destinataire", sms.recipient_phone_masked || "—"),
    detailItem("Provider", sms.provider || "—"),
    detailItem("Statut interne", sms.status || "—"),
    detailItem("Orange status", sms.orange_delivery_status || "—"),
    detailItem("Request ID", sms.orange_resource_id || "—"),
    detailItem("Message", sms.message || "—"),
    detailItem("Heure demande", formatDateTime(sms.requested_at)),
    detailItem("Heure appel Orange", formatDateTime(sms.accepted_at || sms.sent_at)),
    detailItem("Temps API", formatMs(sms.request_duration_ms)),
    detailItem("Heure callback", formatDateTime(sms.callback_received_at)),
    detailItem("Temps livraison", formatMs(sms.delivery_latency_ms)),
    detailItem("Temps total", formatMs(sms.total_latency_ms)),
    detailItem("Retry count", String(sms.retry_count ?? 0)),
    detailItem("Erreur", sms.error_message || "—"),
  ].join("");

  overlay.classList.add("open");
  modal.classList.add("open");
}

function closeSmsDetail() {
  const overlay = document.getElementById("smsDetailOverlay");
  const modal = document.getElementById("smsDetailModal");
  if (overlay) overlay.classList.remove("open");
  if (modal) modal.classList.remove("open");
  smsState.selectedSms = null;
}

function showLoginOverlay(show) {
  const overlay = document.getElementById("adminLoginOverlay");
  if (!overlay) return;
  overlay.hidden = !show;
  overlay.setAttribute("aria-hidden", show ? "false" : "true");
  overlay.style.display = show ? "flex" : "none";
}

async function checkSession() {
  try {
    const data = await apiCall("/api/admin/session");
    if (data.authenticated) {
      showLoginOverlay(false);
      return true;
    }
  } catch (err) {
    return false;
  }
  showLoginOverlay(true);
  return false;
}

async function loginAdmin(code) {
  await apiCall("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

function setLoginStatus(message, kind = "") {
  const el = document.getElementById("loginStatus");
  if (!el) return;
  el.textContent = message || "";
  el.classList.remove("error", "success");
  if (kind) el.classList.add(kind);
}

async function loadStats() {
  const stats = await apiCall("/api/dashboard/stats");
  document.getElementById("statTotalOrders").textContent = stats.total_orders;
  document.getElementById("statTotalRevenue").textContent = formatFCFA(stats.total_revenue);
  document.getElementById("statOrdersToday").textContent = stats.orders_today;
  document.getElementById("statRevenueToday").textContent = formatFCFA(stats.revenue_today);

  renderRankedList("topProductsList", stats.top_products, (row) => ({
    name: row.product_name,
    value: `${row.total_quantity}x`,
  }));

  renderRankedList("byTableList", stats.by_table, (row) => ({
    name: `Table ${row.table_number}`,
    value: `${row.order_count} cmd - ${formatFCFA(row.revenue)}`,
  }));
}

async function loadTables() {
  const grid = document.getElementById("tablesGrid");
  const emptyState = document.getElementById("tablesEmpty");
  const tables = await apiCall("/api/tables");

  if (tables.length === 0) {
    grid.innerHTML = "";
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  grid.innerHTML = tables.map(tableCardHTML).join("");
  grid.querySelectorAll("[data-delete-table]").forEach((btn) => {
    btn.addEventListener("click", () => handleDeleteTable(btn.dataset.deleteTable, btn.dataset.tableName));
  });
}

function tableCardHTML(table) {
  const qrSrc = table.qr_code_path || "";
  return `
    <div class="table-card">
      <img src="${qrSrc}" alt="QR code table ${table.table_number}" loading="lazy">
      <div class="table-card-number">Table ${table.table_number}</div>
      <div class="table-card-location">${table.location || "—"}</div>
      <div class="table-card-actions">
        <a href="${table.qr_target_url || `/index.html?table=${table.table_number}`}" target="_blank" title="Tester le lien du menu" style="color: var(--color-red);">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </a>
        <a href="${qrSrc}" download="table-${table.table_number}.png" title="Télécharger le QR code">
          <svg width="16" height="16"><use href="#icon-download"></use></svg>
        </a>
        <button data-delete-table="${table.id}" data-table-name="${table.table_number}" title="Supprimer la table">
          <svg width="16" height="16"><use href="#icon-trash"></use></svg>
        </button>
      </div>
    </div>
  `;
}

let tableToDelete = null;

function handleDeleteTable(id, tableName) {
  tableToDelete = { id, tableName };
  const displayEl = document.getElementById("deleteTableNameDisplay");
  if (displayEl) displayEl.textContent = tableName;
  document.getElementById("modalOverlay").classList.add("open");
  document.getElementById("deleteTableModal").classList.add("open");
}

async function confirmDeleteTable() {
  if (!tableToDelete) return;
  const { id, tableName } = tableToDelete;
  const btn = document.getElementById("confirmDeleteTableBtn");
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = `<svg width="16" height="16" class="spin"><use href="#icon-refresh"></use></svg> Suppression...`;
  }

  try {
    await apiCall(`/api/tables/${id}`, { method: "DELETE" });
    showToast(`Table ${tableName} supprimée.`);
    closeModal();
    await loadTables();
  } catch (err) {
    showToast(`Échec de la suppression de la table ${tableName}.`, true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = "Oui, supprimer";
    }
    tableToDelete = null;
  }
}

async function handleAddTable(event) {
  event.preventDefault();
  const tableNumber = document.getElementById("tableNumberInput").value.trim();
  const location = document.getElementById("tableLocationInput").value;
  if (!tableNumber) {
    showToast("Le numéro de table est requis.", true);
    return;
  }

  const submitBtn = event.target.querySelector('button[type="submit"]');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `<svg width="16" height="16" class="spin"><use href="#icon-refresh"></use></svg> Création...`;
  }

  try {
    await apiCall("/api/tables", {
      method: "POST",
      body: JSON.stringify({ table_number: tableNumber, location }),
    });

    showToast(`Table ${tableNumber} créée avec succès.`);
    closeModal();
    document.getElementById("addTableForm").reset();
    await loadTables();
  } catch (err) {
    showToast(err.message || "Échec de la création de la table.", true);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Générer le QR code";
    }
  }
}

function openModal() {
  document.getElementById("modalOverlay").classList.add("open");
  document.getElementById("addTableModal").classList.add("open");
}

function closeModal() {
  document.getElementById("modalOverlay").classList.remove("open");
  document.getElementById("addTableModal").classList.remove("open");
  const deleteModal = document.getElementById("deleteTableModal");
  if (deleteModal) deleteModal.classList.remove("open");
  tableToDelete = null;
}

async function loadSmsStats() {
  const stats = await apiCall("/api/dashboard/sms/stats");
  renderSimpleStats("sms", stats);
}

async function loadSmsNotifications() {
  const query = getSmsQueryString();
  const data = await apiCall(`/api/dashboard/sms?${query}`);
  smsState.total = data.total || 0;
  smsState.page = data.page || 1;
  smsState.limit = data.limit || 20;
  renderSmsTable(data.items || []);
  renderSmsPagination();
}

async function refreshSms() {
  await Promise.all([loadSmsStats(), loadSmsNotifications()]);
}

async function refreshAll() {
  await Promise.all([loadStats(), loadTables(), refreshSms()]);
}

function readSmsFiltersFromForm() {
  smsState.filters.from = document.getElementById("smsFromDate").value;
  smsState.filters.to = document.getElementById("smsToDate").value;
  smsState.filters.order = document.getElementById("smsOrderFilter").value.trim();
  smsState.filters.phone = document.getElementById("smsPhoneFilter").value.trim();
  smsState.filters.status = document.getElementById("smsStatusFilter").value;
  smsState.filters.provider = document.getElementById("smsProviderFilter").value;
}

function clearSmsFiltersForm() {
  document.getElementById("smsFromDate").value = "";
  document.getElementById("smsToDate").value = "";
  document.getElementById("smsOrderFilter").value = "";
  document.getElementById("smsPhoneFilter").value = "";
  document.getElementById("smsStatusFilter").value = "";
  document.getElementById("smsProviderFilter").value = "";
}

function openSmsDetailModal() {
  document.getElementById("smsDetailOverlay").classList.add("open");
  document.getElementById("smsDetailModal").classList.add("open");
}

function wireEvents() {
  document.getElementById("refreshBtn").addEventListener("click", async () => {
    await refreshAll();
    showToast("Données actualisées.");
  });

  document.getElementById("refreshSmsBtn").addEventListener("click", async () => {
    await refreshSms();
    showToast("SMS actualisés.");
  });

  document.getElementById("openAddTableBtn").addEventListener("click", openModal);
  document.getElementById("cancelAddTableBtn").addEventListener("click", closeModal);
  document.getElementById("cancelDeleteTableBtn").addEventListener("click", closeModal);
  document.getElementById("confirmDeleteTableBtn").addEventListener("click", confirmDeleteTable);
  document.getElementById("modalOverlay").addEventListener("click", closeModal);
  document.getElementById("addTableForm").addEventListener("submit", handleAddTable);

  document.getElementById("smsFiltersForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    readSmsFiltersFromForm();
    smsState.page = 1;
    await loadSmsNotifications();
  });

  document.getElementById("smsResetFiltersBtn").addEventListener("click", async () => {
    clearSmsFiltersForm();
    readSmsFiltersFromForm();
    smsState.page = 1;
    await loadSmsNotifications();
  });

  document.getElementById("smsPrevPageBtn").addEventListener("click", async () => {
    if (smsState.page <= 1) return;
    smsState.page -= 1;
    await loadSmsNotifications();
  });

  document.getElementById("smsNextPageBtn").addEventListener("click", async () => {
    const totalPages = Math.max(1, Math.ceil((smsState.total || 0) / smsState.limit));
    if (smsState.page >= totalPages) return;
    smsState.page += 1;
    await loadSmsNotifications();
  });

  document.getElementById("closeSmsDetailBtn").addEventListener("click", closeSmsDetail);
  document.getElementById("smsDetailOverlay").addEventListener("click", closeSmsDetail);

  document.getElementById("adminLoginForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const code = document.getElementById("adminCodeInput").value.trim();
    const submitBtn = event.target.querySelector('button[type="submit"]');
    try {
      setLoginStatus("Connexion en cours...");
      if (submitBtn) submitBtn.disabled = true;
      await loginAdmin(code);
      showLoginOverlay(false);
      setLoginStatus("Connexion validée.", "success");
      showToast("Accès validé.");
      await refreshAll();
    } catch (err) {
      setLoginStatus(err.message || "Code invalide.", "error");
      showToast(err.message || "Code invalide.", true);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeModal();
      closeSmsDetail();
    }
  });
}

async function init() {
  wireEvents();
  const authed = await checkSession();
  if (!authed) {
    showLoginOverlay(true);
    return;
  }

  try {
    await refreshAll();
  } catch (err) {
    if (err.status === 401) {
      showLoginOverlay(true);
      return;
    }
    showToast("Impossible de charger les données du tableau de bord.", true);
    logError("initial load", err);
  }
}

document.addEventListener("DOMContentLoaded", init);
