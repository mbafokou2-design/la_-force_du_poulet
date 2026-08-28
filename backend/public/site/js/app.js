/* =================================================================
   LA FORCE DU POULET — APP.JS
   Carte de Menu Web App Mobile (QR Code sur Place à Table)
   ================================================================= */

/* -----------------------------------------------------------------
   1. DONNÉES CATEGORIES & PRODUITS
   ----------------------------------------------------------------- */

const CATEGORIES = [
  { id: "tous", label: "Tout le menu", icon: "icon-plate" },
  { id: "vedettes", label: "Vedettes", icon: "icon-star" },
  { id: "poulet", label: "Poulet Rôti & Pané", icon: "icon-drumstick" },
  { id: "burgers", label: "Burgers & Chawarmas", icon: "icon-burger" },
  { id: "pizzas", label: "Pizzas", icon: "icon-pizza" },
  { id: "combos", label: "Menus Combos", icon: "icon-combo" },
  { id: "plats", label: "Plats Chauds", icon: "icon-bowl" },
  { id: "accompagnements", label: "Accompagnements & Sauces", icon: "icon-fries" },
  { id: "boissons", label: "Boissons", icon: "icon-drink" },
  { id: "desserts", label: "Desserts", icon: "icon-icecream" },
];

const PRODUCTS = [
  // --- ⭐ VEDETTES / INCONTOURNABLES ---
  { id: "burger-poulet-epice", name: "Burger poulet épicé", category: "burgers", price: 1600, description: "Burger poulet épicé maison, notre best-seller.", image: "assets/images/produits/burger-poulet-epice.webp", badge: "populaire", isVedette: true },
  { id: "force-tranquille-1", name: "La Force Tranquille 1", category: "combos", price: 3600, description: "Burger poulet épicé + 1 aile + 2 nuggets + 1 soda 500ml.", image: "assets/images/produits/force-tranquille-1.webp", badge: "populaire", isVedette: true },
  { id: "demi-poulet-roti", name: "Demi-poulet rôti + 2 frites", category: "poulet", price: 6500, description: "Demi-poulet rôti Orléans servi avec 2 portions de frites.", image: "assets/images/produits/demi-poulet-roti.webp", badge: "populaire", isVedette: true },
  { id: "chawarma-poulet-mayo", name: "Chawarma poulet mayo", category: "burgers", price: 1800, description: "Poulet savoureux grillé, sauce mayonnaise. + soda = 2 600 FCFA.", image: "assets/images/produits/chawarma-poulet-mayo.webp", isVedette: true },
  { id: "poulet-entier", name: "Poulet entier croustillant + 3 frites + soda", category: "poulet", price: 12500, description: "Poulet entier à partager, 3 frites et 1 boisson.", image: "assets/images/produits/poulet-entier.webp", badge: "partager", isVedette: true },

  // --- 🍗 POULET RÔTI & PANÉ ---
  { id: "demi-poulet-croustillant", name: "Demi-poulet croustillant + 2 frites", category: "poulet", price: 6500, description: "Demi-poulet croustillant avec deux portions de frites.", image: "assets/images/produits/demi-poulet-croustillant.webp" },
  { id: "nuggets", name: "Nuggets de poulet (6 pcs)", category: "poulet", price: 1500, description: "6 pièces de nuggets croustillants dorés.", image: "assets/images/produits/nuggets.webp" },
  { id: "cuisses-epicees", name: "Cuisses de poulet épicées (2 pcs)", category: "poulet", price: 1800, description: "Pilon et avant-cuisse bien épicés.", image: "assets/images/produits/cuisses-epicees.webp" },
  { id: "clavicules", name: "Clavicules de poulet (5 pcs)", category: "poulet", price: 1500, description: "5 pièces bien épicées et dorées.", image: "assets/images/produits/clavicules.webp" },
  { id: "popcorn-poulet", name: "Popcorns de poulet", category: "poulet", price: 1400, description: "Bouchées de poulet croustillantes à grignoter.", image: "assets/images/produits/popcorn-poulet.webp" },
  { id: "ailes-roties", name: "Ailes rôties épicées", category: "poulet", price: 1500, description: "Ailes rôties et relevées.", image: "assets/images/produits/ailes-roties.webp" },
  { id: "cotes-poulet", name: "Côtes de poulet (5 pcs)", category: "poulet", price: 1600, description: "5 pièces croustillantes.", image: "assets/images/produits/cotes-poulet.webp" },
  { id: "filets-poulet", name: "Filets de poulet épicés (5 pcs)", category: "poulet", price: 1500, description: "5 pièces de filets de poulet épicés.", image: "assets/images/produits/filets-poulet.webp" },
  { id: "ailes-poulet", name: "Ailes de poulet épicées (2 pcs)", category: "poulet", price: 1500, description: "2 pièces d'ailes épicées (3 pcs = 2 100 FCFA).", image: "assets/images/produits/ailes-poulet.webp" },

  // --- 🍔 BURGERS & CHAWARMAS ---
  { id: "burger-steak-boeuf", name: "Burger steak de bœuf cheddar", category: "burgers", price: 2000, description: "Steak de bœuf avec fromage cheddar. + soda = 2 800 FCFA.", image: "assets/images/produits/burger-steak-boeuf.webp" },
  { id: "double-burger-poulet", name: "Double burger poulet épicé", category: "burgers", price: 2000, description: "Le double burger qui rassasie. + soda = 2 800 FCFA.", image: "assets/images/produits/double-burger-poulet.webp" },
  { id: "burger-cuisse-epicee", name: "Burger cuisse épicée", category: "burgers", price: 1800, description: "Burger gourmand à la cuisse de poulet épicée.", image: "assets/images/produits/burger-cuisse-epicee.webp" },
  { id: "chawarma-poulet-classique", name: "Chawarma poulet classique", category: "burgers", price: 1500, description: "Chawarma gourmand au poulet.", image: "assets/images/produits/chawarma-poulet-classique.webp" },
  { id: "chawarma-boeuf-mayo", name: "Chawarma bœuf mayo", category: "burgers", price: 2000, description: "Chawarma au bœuf et mayonnaise. + soda = 2 800 FCFA.", image: "assets/images/produits/chawarma-boeuf-mayo.webp" },

  // --- 🍕 PIZZAS ---
  { id: "pizza-saucisse", name: "Pizza saucisse (10\")", category: "pizzas", price: 6000, description: "Pizza garnie de saucisse. Version 14\" = 8 000 FCFA.", image: "assets/images/produits/pizza-saucisse.webp" },
  { id: "pizza-poulet-luxe", name: "Pizza poulet luxe (10\")", category: "pizzas", price: 6300, description: "Pizza généreuse au poulet. Version 14\" = 8 300 FCFA.", image: "assets/images/produits/pizza-poulet-luxe.webp", badge: "populaire" },
  { id: "pizza-mixte", name: "Pizza mixte bœuf/poulet (10\")", category: "pizzas", price: 6800, description: "Pizza mixte bœuf et poulet. Version 14\" = 8 800 FCFA.", image: "assets/images/produits/pizza-mixte.webp" },

  // --- 🍱 MENUS COMBOS ---
  { id: "force-tranquille-2", name: "La Force Tranquille 2", category: "combos", price: 3800, description: "Cuisse épicée + popcorn + 2 nuggets + 1 frite de pomme.", image: "assets/images/produits/force-tranquille-2.webp" },
  { id: "force-tranquille-3", name: "La Force Tranquille 3", category: "combos", price: 4000, description: "Chawarma classique + 3 filets épicés + 1 aile rôtie + 1 soda.", image: "assets/images/produits/force-tranquille-3.webp" },
  { id: "poulet-agent-double", name: "Poulet agent double", category: "combos", price: 6500, description: "2 cuisses, 2 clavicules, 2 filets, 4 nuggets, frites et 2 sodas.", image: "assets/images/produits/poulet-agent-double.webp", badge: "partager" },
  { id: "menu-familial-colonel", name: "Menu Familial Colonel", category: "combos", price: 10000, description: "3 cuisses, 3 ailes, 3 filets, 4 nuggets, 3 clavicules, frites & plantain.", image: "assets/images/produits/menu-familial-colonel.webp", badge: "partager" },
  { id: "menu-familial-general", name: "Menu Familial Général", category: "combos", price: 14500, description: "6 cuisses, 6 ailes, 2 frites pomme, 1 frite plantain & 1 soda.", image: "assets/images/produits/menu-familial-general.webp", badge: "partager" },
  { id: "poulet-ailes-volant", name: "Poulet ailes volant", category: "combos", price: 8000, description: "8 ailes épicées + 1 frite pomme + 1 frite plantain.", image: "assets/images/produits/poulet-ailes-volant.webp", badge: "partager" },
  { id: "poulet-cuisses-galopant", name: "Poulet cuisses galopant", category: "combos", price: 11500, description: "8 cuisses épicées + plantain + 2 frites pomme + 1 soda.", image: "assets/images/produits/poulet-cuisses-galopant.webp", badge: "partager" },

  // --- 🍲 PLATS CHAUDS ---
  { id: "spaghettis-poulet", name: "Spaghettis poulet", category: "plats", price: 2500, description: "Sauce tomate basilic et poulet.", image: "assets/images/produits/spaghettis-poulet.webp" },
  { id: "spaghettis-carbonara", name: "Spaghettis carbonara", category: "plats", price: 3500, description: "Crème, fromage, champignon, poulet et saucisson.", image: "assets/images/produits/spaghettis-carbonara.webp" },
  { id: "spaghettis-viande", name: "Spaghettis viande", category: "plats", price: 3000, description: "Sauce au poivre noir.", image: "assets/images/produits/spaghettis-viande.webp" },
  { id: "riz-saute-poulet", name: "Riz sauté poulet", category: "plats", price: 3000, description: "Riz sauté avec un steak de poulet.", image: "assets/images/produits/riz-saute-poulet.webp" },
  { id: "riz-saute-colonel", name: "Riz sauté colonel", category: "plats", price: 3500, description: "Riz sauté crevette, viande et saucisson.", image: "assets/images/produits/riz-saute-colonel.webp" },
  { id: "poulet-basquaise", name: "Poulet basquaise", category: "plats", price: 3500, description: "Quart de poulet mijoté façon basquaise.", image: "assets/images/produits/poulet-basquaise.webp" },
  { id: "poulet-dg", name: "Poulet DG", category: "plats", price: 3500, description: "Poulet DG traditionnel savoureux.", image: "assets/images/produits/poulet-dg.webp", badge: "populaire" },
  { id: "riz-cuisse-poulet", name: "Riz cuisse de poulet", category: "plats", price: 3000, description: "Riz accompagné d'une cuisse de poulet.", image: "assets/images/produits/riz-cuisse-poulet.webp" },
  { id: "ndole", name: "Ndolé (viande)", category: "plats", price: 3000, description: "Ndolé traditionnel à la viande (version crevette = 3 500 FCFA).", image: "assets/images/produits/ndole.webp" },
  { id: "poisson-bar", name: "Poisson bar grillé", category: "plats", price: 3000, description: "Poisson bar grillé servi avec plantains.", image: "assets/images/produits/poisson-bar.webp" },
  { id: "salade-poulet", name: "Salade de poulet + brioche", category: "plats", price: 2600, description: "Salade garnie de poulet avec brioche.", image: "assets/images/produits/salade-poulet.webp" },

  // --- 🍟 ACCOMPAGNEMENTS & SAUCES ---
  { id: "frites-pomme", name: "Frites de pomme de terre", category: "accompagnements", price: 1000, description: "Portion de frites croustillantes.", image: "assets/images/produits/frites-pomme.webp" },
  { id: "frites-plantain", name: "Frites de plantain (Alloco)", category: "accompagnements", price: 1000, description: "Plantains frits dorés et moelleux.", image: "assets/images/produits/frites-plantain.webp" },
  { id: "poulet-angelique", name: "Poulet sauce Angélique", category: "accompagnements", price: 5000, description: "2 ailes, 1 pilon, 3 filets, 1 frite & 1 soda.", image: "assets/images/produits/poulet-sauce-angelique.webp", badge: "epice" },
  { id: "poulet-diabolique", name: "Poulet sauce Diabolique", category: "accompagnements", price: 5500, description: "2 ailes, 1 pilon, 4 filets, 1 frite & 1 soda.", image: "assets/images/produits/poulet-sauce-diabolique.webp", badge: "hot" },
  { id: "spicy-6", name: "Spicy Chicken (6 pcs) + frites", category: "accompagnements", price: 3500, description: "6 morceaux de poulet épicé avec frites.", image: "assets/images/produits/spicy-chicken.webp", badge: "epice" },

  // --- 🥤 BOISSONS ---
  { id: "soda-gobelet", name: "Soda 500ml", category: "boissons", price: 1000, description: "Coca-Cola, Fanta ou Sprite. (1L = 1 500 FCFA).", image: "assets/images/produits/soda.webp" },
  { id: "supermont", name: "Eau Supermont (500ml)", category: "boissons", price: 400, description: "Eau minérale (Grande bouteille = 800 FCFA).", image: "assets/images/produits/eau.webp" },
  { id: "jus-naturel", name: "Jus de fruits naturel (500ml)", category: "boissons", price: 1800, description: "Baobab, ananas, goyave ou corossol.", image: "assets/images/produits/jus-naturel.webp" },
  { id: "biere-standard", name: "Bière Castel / 33 / Guinness", category: "boissons", price: 1200, description: "Bière fraîche en canette.", image: "assets/images/produits/biere.webp" },
  { id: "biere-premium", name: "Bière Heineken / Isenbeck", category: "boissons", price: 1500, description: "Bière fraîche premium.", image: "assets/images/produits/biere.webp" },
  { id: "malta", name: "Malta", category: "boissons", price: 800, description: "Boisson maltée.", image: "assets/images/produits/malta.webp" },
  { id: "kossam", name: "Kossam traditionnel", category: "boissons", price: 1000, description: "Lait fermenté traditionnel onctueux.", image: "assets/images/produits/kossam.webp" },
  { id: "bubble-tea", name: "Bubble tea aux perles", category: "boissons", price: 1800, description: "Thé aux perles parfaits plusieurs parfums.", image: "assets/images/produits/bubble-tea.webp" },

  // --- 🍨 DESSERTS ---
  { id: "glace-pot", name: "Glace en pot", category: "desserts", price: 1000, description: "Dessert glacé individuel rafraîchissant.", image: "assets/images/produits/glace-pot.webp" },
  { id: "pink-mood-milk", name: "Pink Mood Milk", category: "desserts", price: 1500, description: "Boisson lactée parfumée avec perles gourmandes.", image: "assets/images/produits/pink-mood-milk.webp" },
];

const BADGE_LABELS = {
  populaire: "⭐ Populaire",
  hot: "🔥 HOT",
  epice: "🌶️ Épicé",
  partager: "👨‍👩‍👧‍👦 À partager",
};

/* -----------------------------------------------------------------
   2. ÉTAT DU MENU
   ----------------------------------------------------------------- */

let currentCategory = "tous";
let currentSearch = "";
let currentTable = getInitialTable();
let cart = loadCart();
let lastOrder = loadLastOrder();

/* -----------------------------------------------------------------
   3. GESTION DU NUMÉRO DE TABLE & STOCKAGE
   ----------------------------------------------------------------- */

function getInitialTable() {
  const urlParams = new URLSearchParams(window.location.search);
  const tableFromUrl = urlParams.get("table");
  if (tableFromUrl) {
    const num = parseInt(tableFromUrl, 10);
    if (!isNaN(num) && num > 0) {
      try {
        localStorage.setItem("lfp_table", num.toString());
      } catch (e) {}
      return num;
    }
  }
  
  // Si pas de table dans l'URL, on essaie le localStorage
  const stored = localStorage.getItem("lfp_table");
  if (stored) {
    const num = parseInt(stored, 10);
    if (!isNaN(num) && num > 0) return num;
  }
  
  // AUCUNE table trouvée ni dans l'URL ni dans le localStorage
  return null;
}

function saveTable(tableNum) {
  currentTable = tableNum;
  try {
    localStorage.setItem("lfp_table", tableNum.toString());
  } catch (e) {}
  updateTableDisplay();
}

function forgetCurrentTable() {
  if (!window.confirm("Oublier cette table et vider le panier de ce navigateur ?")) return;
  cart = [];
  saveCart();
  try { localStorage.removeItem("lfp_table"); } catch (e) {}
  currentTable = null;
  closeTableModal();
  const overlay = document.getElementById("missingTableOverlay");
  if (overlay) overlay.style.display = "flex";
}

function clearCart() {
  if (cart.length === 0 || !window.confirm("Vider tous les articles du panier ?")) return;
  cart = [];
  saveCart();
  const noteInput = document.getElementById("orderNote");
  if (noteInput) noteInput.value = "";
  renderCart();
  showToast("Panier vide.");
}

function updateTableDisplay() {
  const formatted = `Table N° ${currentTable < 10 ? '0' + currentTable : currentTable}`;
  const badgeText = document.getElementById("tableBadgeText");
  const cartDisplay = document.getElementById("cartTableDisplay");
  if (badgeText) badgeText.textContent = formatted;
  if (cartDisplay) cartDisplay.textContent = formatted;
}

function formatPrice(amount) {
  return amount.toLocaleString("fr-FR").replace(/\u202F|\u00A0/g, " ") + " FCFA";
}

function loadCart() {
  try {
    const raw = localStorage.getItem("lfp_cart");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveCart() {
  try {
    localStorage.setItem("lfp_cart", JSON.stringify(cart));
  } catch (e) {}
}

function loadLastOrder() {
  try {
    const raw = localStorage.getItem("lfp_last_order");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function saveLastOrder(order) {
  lastOrder = order;
  try {
    if (order) {
      localStorage.setItem("lfp_last_order", JSON.stringify(order));
    } else {
      localStorage.removeItem("lfp_last_order");
    }
  } catch (e) {}
}

function clearLastOrder() {
  saveLastOrder(null);
  updateOrderLiveStrip(null);
  closeOrderSummary();
  showToast("Rappel de commande supprime de ce navigateur.");
}

function updateOrderLiveStrip(order) {
  const strip = document.getElementById("orderLiveStrip");
  const text = document.getElementById("orderLiveText");
  if (!strip || !text) return;

  const activeOrder = order || lastOrder;
  if (!activeOrder || !activeOrder.orderId) {
    strip.hidden = true;
    return;
  }

  strip.hidden = false;
  const tableLabel = `Table N° ${activeOrder.tableNumber < 10 ? "0" + activeOrder.tableNumber : activeOrder.tableNumber}`;
  const smsLabel = activeOrder.smsStatus ? ` - SMS ${String(activeOrder.smsStatus).toUpperCase()}` : "";
  text.textContent = `Commande #${activeOrder.orderId} envoyée pour ${tableLabel}${smsLabel}`;
}

function findProduct(id) {
  return PRODUCTS.find((p) => p.id === id);
}

const KNOWN_PRODUCT_IMAGES = new Set([
  "assets/images/produits/ailes-poulet.webp",
  "assets/images/produits/ailes-roties.webp",
  "assets/images/produits/burger-cuisse-epicee.webp",
  "assets/images/produits/burger-poulet-epice.webp",
  "assets/images/produits/burger-steak-boeuf.webp",
  "assets/images/produits/chawarma-boeuf-mayo.webp",
  "assets/images/produits/chawarma-poulet-classique.webp",
  "assets/images/produits/chawarma-poulet-mayo.webp",
  "assets/images/produits/clavicules.webp",
  "assets/images/produits/cotes-poulet.webp",
  "assets/images/produits/double-burger-poulet.webp",
  "assets/images/produits/filets-poulet.webp",
  "assets/images/produits/popcorn-poulet.webp",
  "assets/images/logo.webp",
  "assets/images/produits/product-placeholder.svg",
]);

const PRODUCT_IMAGE_PLACEHOLDER = "assets/images/produits/product-placeholder.svg";

function resolveProductImage(imagePath) {
  return KNOWN_PRODUCT_IMAGES.has(imagePath) ? imagePath : PRODUCT_IMAGE_PLACEHOLDER;
}

/* -----------------------------------------------------------------
   4. RENDU DES FILTRES & CATÉGORIES
   ----------------------------------------------------------------- */

function renderFilters() {
  const container = document.getElementById("menuFilters");
  container.innerHTML = CATEGORIES.map((cat) => `
    <button class="filter-chip${cat.id === currentCategory ? " active" : ""}" data-category="${cat.id}">
      <span class="filter-chip-icon"><svg width="15" height="15"><use href="#${cat.icon}"></use></svg></span>
      <span>${cat.label}</span>
    </button>
  `).join("");

  container.querySelectorAll(".filter-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      currentCategory = btn.dataset.category;
      renderFilters();
      renderProducts();
      // Scroll doux vers les produits
      document.querySelector(".products-section").scrollIntoView({ behavior: "smooth" });
    });
  });
}

/* -----------------------------------------------------------------
   5. RENDU GRILLE PRODUITS
   ----------------------------------------------------------------- */

function getFilteredProducts() {
  const search = currentSearch.trim().toLowerCase();

  return PRODUCTS.filter((p) => {
    let matchCategory = false;
    if (currentCategory === "tous") matchCategory = true;
    else if (currentCategory === "vedettes") matchCategory = p.isVedette || p.badge === "populaire";
    else matchCategory = p.category === currentCategory;

    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(search) ||
      p.description.toLowerCase().includes(search);

    return matchCategory && matchSearch;
  });
}

function productCardHTML(product) {
  const badgeHTML = product.badge
    ? `<span class="product-badge badge-${product.badge}">
         ${BADGE_LABELS[product.badge]}
       </span>`
    : "";


  return `
    <article class="product-card" data-id="${product.id}">
      <div class="product-media">
        ${badgeHTML}
        <img
          src="${resolveProductImage(product.image)}"
          alt="${product.name}"
          loading="lazy"
          onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
        >
        <div class="product-media-fallback" style="display:none;">
          <svg width="36" height="36"><use href="#icon-drumstick"></use></svg>
        </div>
      </div>
      <div class="product-body">
        <h3 class="product-name">${product.name}</h3>
        <p class="product-desc">${product.description}</p>
        <div class="product-footer">
          <span class="product-price">${formatPrice(product.price)}</span>
          <button class="btn-add" data-add="${product.id}">
            <svg width="12" height="12"><use href="#icon-plus"></use></svg>
            Ajouter
          </button>
        </div>
      </div>
    </article>
  `;
}

function renderProducts() {
  const grid = document.getElementById("menuGrid");
  const emptyState = document.getElementById("menuEmpty");
  const titleEl = document.getElementById("activeCategoryTitle");
  const countEl = document.getElementById("productsCount");

  const categoryObj = CATEGORIES.find((c) => c.id === currentCategory);
  if (titleEl && categoryObj) {
    titleEl.textContent = `${categoryObj.icon} ${categoryObj.label}`;
  }

  const filtered = getFilteredProducts();
  if (countEl) countEl.textContent = `${filtered.length} plat${filtered.length > 1 ? "s" : ""}`;

  if (filtered.length === 0) {
    grid.innerHTML = "";
    emptyState.hidden = false;
    return;
  }

  emptyState.hidden = true;
  grid.innerHTML = filtered.map(productCardHTML).join("");

  grid.querySelectorAll("[data-add]").forEach((btn) => {
    btn.addEventListener("click", () => addToCart(btn.dataset.add));
  });
}

/* -----------------------------------------------------------------
   6. LOGIQUE PANIER
   ----------------------------------------------------------------- */

function addToCart(productId) {
  const product = findProduct(productId);
  if (!product) return;

  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ id: productId, qty: 1 });
  }

  saveCart();
  renderCart();
  bumpBadge();
  showToast(`+1 ${product.name} au panier`);
}

function updateQty(productId, delta) {
  const item = cart.find((i) => i.id === productId);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter((i) => i.id !== productId);
  }

  saveCart();
  renderCart();
}

function removeFromCart(productId) {
  cart = cart.filter((i) => i.id !== productId);
  saveCart();
  renderCart();
}

function cartTotal() {
  return cart.reduce((sum, item) => {
    const product = findProduct(item.id);
    return product ? sum + product.price * item.qty : sum;
  }, 0);
}

function cartCount() {
  return cart.reduce((sum, item) => sum + item.qty, 0);
}

function buildOrderSnapshot(items, note = "") {
  const resolvedItems = items.map((item) => {
    const product = findProduct(item.id);
    return {
      id: item.id,
      name: product ? product.name : item.id,
      price: product ? product.price : item.price || 0,
      qty: item.qty,
    };
  });

  const total = resolvedItems.reduce((sum, item) => sum + item.price * item.qty, 0);

  return {
    tableNumber: currentTable,
    note,
    total,
    itemCount: resolvedItems.reduce((sum, item) => sum + item.qty, 0),
    items: resolvedItems,
    createdAt: new Date().toISOString(),
  };
}

function orderItemSummaryHTML(item) {
  return `
    <div class="order-summary-row">
      <div class="order-summary-item-name">${item.qty}x ${item.name}</div>
      <div class="order-summary-item-price">${formatPrice(item.price * item.qty)}</div>
    </div>
  `;
}

function renderOrderSummary(order) {
  const content = document.getElementById("orderSummaryContent");
  const actionBtn = document.getElementById("orderSummaryAction");
  if (!content) return;

  const source = order || lastOrder;
  const activeCartItems = cart.map((item) => {
    const product = findProduct(item.id);
    return {
      id: item.id,
      name: product ? product.name : item.id,
      price: product ? product.price : 0,
      qty: item.qty,
    };
  });

  const snapshot = source || buildOrderSnapshot(activeCartItems, document.getElementById("orderNote")?.value?.trim() || "");
  const hasItems = Array.isArray(snapshot.items) && snapshot.items.length > 0;
  const subtitle = snapshot.createdAt
    ? new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" }).format(new Date(snapshot.createdAt))
    : "";
  const statusClass =
    snapshot.orderId && String(snapshot.smsStatus || "").toLowerCase() === "sent"
      ? "order-summary-status is-live"
      : "order-summary-status";

  content.innerHTML = `
    <div class="order-summary-meta">
      <div><span class="order-summary-label">Table</span><strong>Table N° ${snapshot.tableNumber < 10 ? "0" + snapshot.tableNumber : snapshot.tableNumber}</strong></div>
      <div><span class="order-summary-label">Articles</span><strong>${snapshot.itemCount || 0}</strong></div>
      <div><span class="order-summary-label">Total</span><strong>${formatPrice(snapshot.total || 0)}</strong></div>
    </div>
    ${subtitle ? `<div class="order-summary-timestamp">${subtitle}</div>` : ""}
    <div class="order-summary-list">
      ${hasItems ? snapshot.items.map(orderItemSummaryHTML).join("") : `<div class="order-summary-empty">Aucun article dans cette commande.</div>`}
    </div>
    <div class="order-summary-note">
      <span>Note</span>
      <p>${snapshot.note ? snapshot.note : "Aucune note"}</p>
    </div>
    ${snapshot.orderId ? `<div class="${statusClass}">Commande #${snapshot.orderId}${snapshot.smsStatus ? ` - SMS ${snapshot.smsStatus}` : ""}</div>` : ""}
  `;

  if (actionBtn) {
    actionBtn.textContent = cart.length > 0 ? "Voir le panier" : "Fermer";
  }
}

function openOrderSummary(order) {
  renderOrderSummary(order);
  const overlay = document.getElementById("orderSummaryOverlay");
  if (overlay) overlay.classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeOrderSummary() {
  const overlay = document.getElementById("orderSummaryOverlay");
  if (overlay) overlay.classList.remove("open");
  document.body.style.overflow = "";
}

function renderCart() {
  const itemsContainer = document.getElementById("cartItems");
  const emptyState = document.getElementById("cartEmptyState");
  const footer = document.getElementById("cartFooter");
  const badge = document.getElementById("cartBadge");
  const totalEl = document.getElementById("cartTotal");

  // Barre flottante du bas
  const bottomBar = document.getElementById("bottomCartBar");
  const bottomCount = document.getElementById("bottomCartCount");
  const bottomTotal = document.getElementById("bottomCartTotal");

  const total = cartTotal();
  const count = cartCount();

  if (badge) badge.textContent = count;

  // Mise à jour de la barre flottante inférieure
  if (bottomBar) {
    if (count > 0) {
      bottomBar.classList.add("visible");
      if (bottomCount) bottomCount.textContent = count;
      if (bottomTotal) bottomTotal.textContent = formatPrice(total);
    } else {
      bottomBar.classList.remove("visible");
    }
  }

  if (cart.length === 0) {
    itemsContainer.innerHTML = `
      <div class="cart-empty" id="cartEmptyState" style="display: flex;">
        <svg width="50" height="50"><use href="#icon-cart"></use></svg>
        <p>Votre panier est vide.</p>
        <p class="cart-empty-sub">Ajoutez de bons plats pour commander à table !</p>
      </div>`;
    if (footer) footer.hidden = true;
    return;
  }

  itemsContainer.innerHTML = cart.map(cartItemHTML).join("");
  if (footer) footer.hidden = false;
  if (totalEl) totalEl.textContent = formatPrice(total);

  itemsContainer.querySelectorAll("[data-increase]").forEach((btn) => {
    btn.addEventListener("click", () => updateQty(btn.dataset.increase, 1));
  });
  itemsContainer.querySelectorAll("[data-decrease]").forEach((btn) => {
    btn.addEventListener("click", () => updateQty(btn.dataset.decrease, -1));
  });
  itemsContainer.querySelectorAll("[data-remove]").forEach((btn) => {
    btn.addEventListener("click", () => removeFromCart(btn.dataset.remove));
  });
}

function cartItemHTML(item) {
  const product = findProduct(item.id);
  if (!product) return "";

  return `
    <div class="cart-item" data-id="${product.id}">
      <img
        src="${resolveProductImage(product.image)}"
        alt="${product.name}"
        class="cart-item-img"
        onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"
      >
      <div class="cart-item-img-fallback" style="display:none;">
        <svg width="20" height="20"><use href="#icon-drumstick"></use></svg>
      </div>
      <div class="cart-item-info">
        <div class="cart-item-name">${product.name}</div>
        <div class="cart-item-unit-price">${formatPrice(product.price)}</div>
        <div class="cart-item-row">
          <div class="qty-control">
            <button class="qty-btn" data-decrease="${product.id}" aria-label="Moins">
              <svg width="10" height="10"><use href="#icon-minus"></use></svg>
            </button>
            <span class="qty-value">${item.qty}</span>
            <button class="qty-btn" data-increase="${product.id}" aria-label="Plus">
              <svg width="10" height="10"><use href="#icon-plus"></use></svg>
            </button>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="cart-item-subtotal">${formatPrice(product.price * item.qty)}</span>
            <button class="cart-item-remove" data-remove="${product.id}" aria-label="Supprimer">
              <svg width="14" height="14"><use href="#icon-trash"></use></svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
}

function bumpBadge() {
  const badge = document.getElementById("cartBadge");
  if (!badge) return;
  badge.classList.remove("bump");
  void badge.offsetWidth;
  badge.classList.add("bump");
}

/* -----------------------------------------------------------------
   7. INTERFACE MODALS & PANIER
   ----------------------------------------------------------------- */

function openCart() {
  document.getElementById("cartPanel").classList.add("open");
  document.getElementById("cartOverlay").classList.add("open");
  document.body.style.overflow = "hidden";
}

function closeCart() {
  document.getElementById("cartPanel").classList.remove("open");
  document.getElementById("cartOverlay").classList.remove("open");
  document.body.style.overflow = "";
}

function openTableModal() {
  const modal = document.getElementById("tableModalOverlay");
  const input = document.getElementById("tableNumberInput");
  if (input) input.value = currentTable;
  if (modal) modal.classList.add("open");
}

function closeTableModal() {
  const modal = document.getElementById("tableModalOverlay");
  if (modal) modal.classList.remove("open");
}

/* -----------------------------------------------------------------
   8. TOAST
   ----------------------------------------------------------------- */

let toastTimeout;
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.toggle("error", isError);
  toast.classList.add("show");

  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

/* -----------------------------------------------------------------
   9. CHECKOUT / VALIDATION DE COMMANDE
   ----------------------------------------------------------------- */

async function checkout() {
  if (cart.length === 0) return;

  const noteInput = document.getElementById("orderNote");
  const note = noteInput ? noteInput.value.trim() : "";
  const orderSnapshot = buildOrderSnapshot(
    cart.map((item) => ({ ...item })),
    note
  );

  // Enrichit chaque article avec le nom et le prix depuis PRODUCTS
  const items = cart.map((item) => {
    const product = findProduct(item.id);
    return {
      id: item.id,
      name: product ? product.name : item.id,
      price: product ? product.price : 0,
      qty: item.qty,
    };
  });

  const tableNumber = String(currentTable);

  // Désactive le bouton pendant la requête pour éviter les doubles soumissions
  const checkoutBtn = document.getElementById("checkoutBtn");
  if (checkoutBtn) {
    checkoutBtn.disabled = true;
    checkoutBtn.textContent = "Envoi en cours…";
  }

  try {
    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table_number: tableNumber, items, note }),
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const msg = data?.error || `Erreur serveur (${response.status})`;
      throw new Error(msg);
    }

    // ✅ Succès — on vide le panier et on ferme
    const tableStr = `Table N° ${currentTable < 10 ? "0" + currentTable : currentTable}`;
    let msg = `✅ Commande transmise pour la ${tableStr} !`;
    if (note) msg += ` (Note: ${note})`;

    const savedOrder = {
      ...orderSnapshot,
      orderId: data?.order_id ?? null,
      smsStatus: data?.sms_status || "sent",
      submittedAt: new Date().toISOString(),
    };
    saveLastOrder(savedOrder);
    renderOrderSummary(savedOrder);
    updateOrderLiveStrip(savedOrder);
    showToast(msg);
    cart = [];
    saveCart();
    renderCart();
    closeCart();
    if (noteInput) noteInput.value = "";
    openOrderSummary(savedOrder);

  } catch (err) {
    // ❌ Échec réseau ou erreur serveur — on garde le panier intact
    console.error("[app.js] Échec checkout:", err);
    showToast("Erreur lors de l'envoi de la commande. Réessaie.", true);
  } finally {
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.textContent = "Valider la commande";
    }
  }
}

/* -----------------------------------------------------------------
   10. INITIALISATION
   ----------------------------------------------------------------- */

function init() {
  if (!currentTable) {
    const overlay = document.getElementById("missingTableOverlay");
    if (overlay) overlay.style.display = "flex";
    return; // Stop initialization, the user can't do anything
  }

  updateTableDisplay();
  renderFilters();
  renderProducts();
  renderCart();
  updateOrderLiveStrip(lastOrder);

  // Recherche
  const searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", (e) => {
      currentSearch = e.target.value;
      renderProducts();
    });
  }

  const resetBtn = document.getElementById("resetSearchBtn");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      currentSearch = "";
      if (searchInput) searchInput.value = "";
      currentCategory = "tous";
      renderFilters();
      renderProducts();
    });
  }

  // Raccourcis d'aide rapide
  document.querySelectorAll(".quick-chip").forEach((chip) => {
    chip.addEventListener("click", () => {
      const cat = chip.dataset.quick;
      currentCategory = cat;
      renderFilters();
      renderProducts();
      document.querySelector(".products-section").scrollIntoView({ behavior: "smooth" });
    });
  });

  // Modal Table
  const tableBadgeBtn = document.getElementById("tableBadgeBtn");
  if (tableBadgeBtn) tableBadgeBtn.addEventListener("click", openTableModal);

  const orderSummaryToggle = document.getElementById("orderSummaryToggle");
  if (orderSummaryToggle) {
    orderSummaryToggle.addEventListener("click", () => openOrderSummary());
  }

  const forgetTableBtn = document.getElementById("forgetTableBtn");
  if (forgetTableBtn) forgetTableBtn.addEventListener("click", forgetCurrentTable);

  const tableCloseBtn = document.getElementById("tableModalClose");
  if (tableCloseBtn) tableCloseBtn.addEventListener("click", closeTableModal);

  const saveTableBtn = document.getElementById("saveTableBtn");
  if (saveTableBtn) {
    saveTableBtn.addEventListener("click", () => {
      const input = document.getElementById("tableNumberInput");
      const val = parseInt(input.value, 10);
      if (!isNaN(val) && val > 0) {
        saveTable(val);
        closeTableModal();
        showToast(`Table modifiée : N° ${val}`);
      }
    });
  }

  // Panier : ouvertures / fermetures
  document.getElementById("cartToggle").addEventListener("click", openCart);
  document.getElementById("cartCloseBtn").addEventListener("click", closeCart);
  document.getElementById("cartOverlay").addEventListener("click", closeCart);
  const clearLastOrderBtn = document.getElementById("clearLastOrderBtn");
  if (clearLastOrderBtn) clearLastOrderBtn.addEventListener("click", clearLastOrder);
  document.getElementById("orderSummaryClose").addEventListener("click", closeOrderSummary);
  document.getElementById("orderSummaryOverlay").addEventListener("click", (event) => {
    if (event.target && event.target.id === "orderSummaryOverlay") {
      closeOrderSummary();
    }
  });

  const orderSummaryAction = document.getElementById("orderSummaryAction");
  if (orderSummaryAction) {
    orderSummaryAction.addEventListener("click", () => {
      if (cart.length > 0) {
        closeOrderSummary();
        openCart();
      } else {
        closeOrderSummary();
      }
    });
  }

  // Barre flottante du bas
  const bottomTrigger = document.getElementById("bottomCartTrigger");
  if (bottomTrigger) bottomTrigger.addEventListener("click", openCart);

  const bottomCheckout = document.getElementById("bottomCheckoutBtn");
  if (bottomCheckout) bottomCheckout.addEventListener("click", openCart);

  renderOrderSummary();

  // Validation commande
  const clearCartBtn = document.getElementById("clearCartBtn");
  if (clearCartBtn) clearCartBtn.addEventListener("click", clearCart);

  const checkoutBtn = document.getElementById("checkoutBtn");
  if (checkoutBtn) checkoutBtn.addEventListener("click", checkout);

  // Touche Échap
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeCart();
      closeTableModal();
    }
  });
}

document.addEventListener("DOMContentLoaded", init);
