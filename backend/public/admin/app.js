/* =================================================================
   DASHBOARD ADMIN — APP.JS
   Consomme l'API backend : /api/tables, /api/dashboard/stats
   ================================================================= */

const API_BASE = ""; // même origine que le serveur Express (servi via /admin)

const CONTEXT = "admin/app.js";

/* -----------------------------------------------------------------
   Utilitaires
   ----------------------------------------------------------------- */

function formatFCFA(amount) {
  return `${Number(amount).toLocaleString("fr-FR")} FCFA`;
}

function logError(action, err) {
  // Log détaillé en console pour debug — visible dans les DevTools du navigateur
  console.error(`[${CONTEXT}] ❌ Échec: ${action}`);
  console.error(err);
}

let toastTimeout;
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove("show"), 3000);
}

/* -----------------------------------------------------------------
   Appel API générique avec gestion d'erreur explicite
   ----------------------------------------------------------------- */

async function apiCall(path, options = {}) {
  const url = `${API_BASE}${path}`;
  try {
    const response = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMessage = data?.error || `Erreur HTTP ${response.status}`;
      throw new Error(`${errorMessage} (${path})`);
    }

    return data;
  } catch (err) {
    logError(`appel API vers ${path}`, err);
    throw err;
  }
}

/* -----------------------------------------------------------------
   STATISTIQUES
   ----------------------------------------------------------------- */

async function loadStats() {
  try {
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
      value: `${row.order_count} cmd — ${formatFCFA(row.revenue)}`,
    }));
  } catch (err) {
    showToast("Impossible de charger les statistiques. Vérifie que le serveur backend tourne.", true);
  }
}

function renderRankedList(containerId, rows, mapFn) {
  const container = document.getElementById(containerId);

  if (!rows || rows.length === 0) {
    container.innerHTML = `<li class="ranked-empty">Aucune donnée pour l'instant.</li>`;
    return;
  }

  container.innerHTML = rows
    .map((row) => {
      const { name, value } = mapFn(row);
      return `<li><span class="ranked-name">${name}</span><span class="ranked-value">${value}</span></li>`;
    })
    .join("");
}

/* -----------------------------------------------------------------
   TABLES & QR CODES
   ----------------------------------------------------------------- */

async function loadTables() {
  const grid = document.getElementById("tablesGrid");
  const emptyState = document.getElementById("tablesEmpty");

  try {
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
  } catch (err) {
    showToast("Impossible de charger les tables. Vérifie que le serveur backend tourne.", true);
  }
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
    loadTables();
  } catch (err) {
    showToast(`Échec de la suppression de la table ${tableName}.`, true);
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = `Oui, supprimer`;
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
    loadTables();
  } catch (err) {
    showToast(err.message || "Échec de la création de la table.", true);
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = `Générer le QR code`;
    }
  }
}

/* -----------------------------------------------------------------
   MODALE
   ----------------------------------------------------------------- */

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

/* -----------------------------------------------------------------
   INITIALISATION
   ----------------------------------------------------------------- */

function init() {
  loadStats();
  loadTables();

  document.getElementById("refreshBtn").addEventListener("click", () => {
    loadStats();
    loadTables();
    showToast("Données actualisées.");
  });

  document.getElementById("openAddTableBtn").addEventListener("click", openModal);
  document.getElementById("cancelAddTableBtn").addEventListener("click", closeModal);
  
  // Nouveaux boutons pour le modal de suppression
  const cancelDeleteBtn = document.getElementById("cancelDeleteTableBtn");
  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener("click", closeModal);
  const confirmDeleteBtn = document.getElementById("confirmDeleteTableBtn");
  if (confirmDeleteBtn) confirmDeleteBtn.addEventListener("click", confirmDeleteTable);

  document.getElementById("modalOverlay").addEventListener("click", closeModal);
  document.getElementById("addTableForm").addEventListener("submit", handleAddTable);

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModal();
  });
}

document.addEventListener("DOMContentLoaded", init);