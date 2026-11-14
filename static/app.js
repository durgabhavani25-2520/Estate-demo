"use strict";

const FAVORITES_KEY = "estatebridge-favourites-v1";
const TEAM_KEY = "estatebridge-team-session-v1";
const state = { purpose: "", propertyType: "", listings: [], currentListing: null, aiEnabled: false, adminEnabled: false, teamToken: sessionStorage.getItem(TEAM_KEY) || "", role: "", username: "" };
const byId = (id) => document.getElementById(id);
const listingGrid = byId("listing-grid");

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = String(text);
  return node;
}

function priceLabel(value, listingType) {
  const amount = Number(value) || 0;
  if (listingType === "rent") return "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(amount) + "<small> / month</small>";
  if (amount >= 10000000) return "₹" + (amount / 10000000).toLocaleString("en-IN", { maximumFractionDigits: 2 }) + "<small> Cr</small>";
  return "₹" + (amount / 100000).toLocaleString("en-IN", { maximumFractionDigits: 0 }) + "<small> L</small>";
}

function listingTypeLabel(value) {
  return ({ sale: "For sale", resale: "Resale", rent: "For rent" })[value] || value;
}

function propertyTypeLabel(value) {
  return ({ apartment: "Apartment", villa: "Villa", plot: "Land / plot", commercial: "Commercial" })[value] || value;
}

function getFavorites() {
  try { return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]"); }
  catch (error) { return []; }
}

function saveFavorites(values) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(values));
}

function toggleFavorite(id, button) {
  let values = getFavorites();
  if (values.indexOf(id) >= 0) values = values.filter((value) => value !== id);
  else values.push(id);
  saveFavorites(values);
  button.classList.toggle("saved", values.indexOf(id) >= 0);
  button.setAttribute("aria-pressed", values.indexOf(id) >= 0 ? "true" : "false");
  button.setAttribute("aria-label", values.indexOf(id) >= 0 ? "Remove from saved properties" : "Save property");
}

function buildPropertyCard(item) {
  const card = el("article", "property-card");
  const photoWrap = el("div", "property-photo-wrap");
  const image = document.createElement("img");
  image.className = "property-photo";
  image.src = (item.image_urls || [])[0] || "/icon.svg";
  image.alt = item.title + " sample property image";
  image.loading = "lazy";
  image.addEventListener("error", function () { image.src = "/icon.svg"; image.classList.add("image-fallback"); }, { once: true });
  photoWrap.appendChild(image);
  const badge = el("span", "listing-badge", listingTypeLabel(item.listing_type));
  photoWrap.appendChild(badge);
  if (item.is_sample) photoWrap.appendChild(el("span", "sample-badge", "SAMPLE"));
  if (item.status === "sold") photoWrap.appendChild(el("span", "sold-badge", "SOLD"));
  const favorite = el("button", "favorite-button", getFavorites().indexOf(item.id) >= 0 ? "♥" : "♡");
  favorite.type = "button";
  favorite.setAttribute("aria-label", getFavorites().indexOf(item.id) >= 0 ? "Remove from saved properties" : "Save property");
  favorite.setAttribute("aria-pressed", getFavorites().indexOf(item.id) >= 0 ? "true" : "false");
  if (getFavorites().indexOf(item.id) >= 0) favorite.classList.add("saved");
  favorite.addEventListener("click", function (event) { event.stopPropagation(); toggleFavorite(item.id, favorite); });
  photoWrap.appendChild(favorite);
  card.appendChild(photoWrap);
  const content = el("div", "property-card-content");
  const location = el("p", "property-location");
  location.appendChild(el("span", "location-pin", "⌖"));
  location.appendChild(document.createTextNode(item.locality + ", " + item.city));
  content.appendChild(location);
  if (item.venture_name) content.appendChild(el("p", "venture-name", item.venture_name));
  content.appendChild(el("h3", "property-title", item.title));
  const price = el("p", "property-price");
  price.innerHTML = priceLabel(item.price_inr, item.listing_type);
  content.appendChild(price);
  const stats = el("div", "property-stats");
  if (item.beds > 0) stats.appendChild(statItem("⌂", item.beds + " bed" + (item.beds === 1 ? "" : "s")));
  if (item.baths > 0) stats.appendChild(statItem("◌", item.baths + " bath" + (item.baths === 1 ? "" : "s")));
  stats.appendChild(statItem("▱", new Intl.NumberFormat("en-IN").format(item.area_sqft) + " sq ft"));
  content.appendChild(stats);
  const foot = el("div", "property-card-foot");
  foot.appendChild(el("span", "property-kind", propertyTypeLabel(item.property_type)));
  const view = el("button", "card-view", "View details →");
  view.type = "button";
  view.addEventListener("click", function (event) { event.stopPropagation(); openProperty(item); });
  foot.appendChild(view);
  content.appendChild(foot);
  card.appendChild(content);
  card.addEventListener("click", function () { openProperty(item); });
  return card;
}

function statItem(symbol, text) {
  const item = el("span", "property-stat");
  item.appendChild(el("span", "stat-symbol", symbol));
  item.appendChild(document.createTextNode(text));
  return item;
}

function renderListings(items) {
  state.listings = items;
  listingGrid.textContent = "";
  byId("count-all").textContent = String(items.length);
  byId("result-count").textContent = items.length + (items.length === 1 ? " property to explore" : " properties to explore");
  byId("empty-results").hidden = items.length > 0;
  items.forEach((item) => listingGrid.appendChild(buildPropertyCard(item)));
}

function currentFilterParams() {
  const params = new URLSearchParams();
  if (state.purpose) params.set("purpose", state.purpose);
  if (state.propertyType) params.set("property_type", state.propertyType);
  const city = byId("filter-city").value;
  const locality = byId("filter-locality").value.trim();
  const maxPrice = byId("filter-budget").value;
  const beds = byId("filter-beds").value;
  const sort = byId("filter-sort").value;
  if (city) params.set("city", city);
  if (locality) params.set("locality", locality);
  if (maxPrice) params.set("max_price", maxPrice);
  if (beds) params.set("min_beds", beds);
  if (sort) params.set("sort", sort);
  return params;
}

async function loadListings() {
  byId("result-count").textContent = "Finding properties…";
  try {
    const response = await fetch("/api/listings?" + currentFilterParams().toString(), { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Properties could not be loaded.");
    renderListings(data.listings || []);
  } catch (error) {
    listingGrid.textContent = "";
    byId("result-count").textContent = error.message || "Properties could not be loaded.";
    byId("empty-results").hidden = false;
  }
}

function openProperty(item) {
  state.currentListing = item;
  const body = byId("property-detail-body");
  body.textContent = "";
  const gallery = el("div", "detail-gallery");
  const photos = item.image_urls || [];
  const main = document.createElement("img");
  main.className = "detail-main-photo";
  main.src = photos[0] || "/icon.svg";
  main.alt = item.title + " illustrative image";
  gallery.appendChild(main);
  if (photos[1]) {
    const second = document.createElement("img");
    second.className = "detail-side-photo";
    second.src = photos[1];
    second.alt = "Another illustrative view of " + item.title;
    gallery.appendChild(second);
  }
  if (item.is_sample) gallery.appendChild(el("span", "sample-badge detail-sample", "SAMPLE PROPERTY"));
  body.appendChild(gallery);
  const intro = el("div", "detail-intro");
  intro.appendChild(el("p", "property-location", item.locality + ", " + item.city));
  if (item.status === "sold") intro.appendChild(el("span", "sold-detail", "SOLD"));
  if (item.venture_name) intro.appendChild(el("p", "venture-name", item.venture_name));
  intro.appendChild(el("h2", "", item.title));
  const price = el("p", "detail-price");
  price.innerHTML = priceLabel(item.price_inr, item.listing_type);
  intro.appendChild(price);
  intro.appendChild(el("p", "detail-description", item.description));
  const detailGrid = el("div", "detail-stats");
  detailGrid.appendChild(statItem("▱", new Intl.NumberFormat("en-IN").format(item.area_sqft) + " sq ft"));
  if (item.beds) detailGrid.appendChild(statItem("⌂", item.beds + " bedrooms"));
  if (item.baths) detailGrid.appendChild(statItem("◌", item.baths + " bathrooms"));
  detailGrid.appendChild(statItem("◇", listingTypeLabel(item.listing_type)));
  intro.appendChild(detailGrid);
  const features = el("div", "feature-chips");
  (item.features || []).forEach((feature) => features.appendChild(el("span", "feature-chip", feature)));
  intro.appendChild(features);
  if (item.layout) {
    intro.appendChild(el("h3", "detail-subheading", "Layout"));
    intro.appendChild(el("p", "detail-description", item.layout));
  }
  if ((item.location_highlights || []).length) {
    intro.appendChild(el("h3", "detail-subheading", "Nearby highlights"));
    const highlights = el("ul", "location-highlights");
    item.location_highlights.forEach((highlight) => highlights.appendChild(el("li", "", highlight)));
    intro.appendChild(highlights);
  }
  const verification = el("p", "verification-note", item.is_sample
    ? "Demo listing only. No title, RERA, seller, price, or availability verification has been performed."
    : "Verify the property identity, ownership, approvals, RERA details where applicable, price, and availability independently.");
  intro.appendChild(verification);
  body.appendChild(intro);
  byId("buyer-listing-id").value = String(item.id);
  byId("buyer-message").textContent = "";
  byId("buyer-form").reset();
  byId("buyer-message").classList.remove("success-message");
  byId("buyer-listing-id").value = String(item.id);
  byId("property-dialog").showModal();
}

function setupDialogClosers() {
  document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", function () { byId(button.dataset.close).close(); }));
  document.querySelectorAll("dialog.modal").forEach((dialog) => dialog.addEventListener("click", function (event) {
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  }));
}

function showInfo(title, copy, kicker) {
  byId("info-title").textContent = title;
  byId("info-kicker").textContent = kicker;
  const host = byId("info-copy");
  host.textContent = "";
  copy.forEach((paragraph) => host.appendChild(el("p", "", paragraph)));
  byId("info-dialog").showModal();
}

function clearAllFilters() {
  state.purpose = "";
  state.propertyType = "";
  byId("filter-city").value = "";
  byId("filter-type").value = "";
  byId("filter-locality").value = "";
  byId("filter-budget").value = "";
  byId("filter-beds").value = "0";
  byId("filter-sort").value = "featured";
  document.querySelectorAll(".category-tab").forEach((button, index) => button.classList.toggle("active", index === 0));
  loadListings();
}

function activateCategory(button) {
  state.purpose = button.dataset.purpose || "";
  state.propertyType = button.dataset.type || "";
  document.querySelectorAll(".category-tab").forEach((tab) => tab.classList.toggle("active", tab === button));
  byId("filter-type").value = state.propertyType;
  loadListings();
  byId("discover").scrollIntoView({ behavior: "smooth", block: "start" });
}

function applyIntent(filters) {
  state.purpose = "";
  state.propertyType = "";
  byId("filter-city").value = "";
  byId("filter-locality").value = "";
  byId("filter-budget").value = "";
  byId("filter-beds").value = "0";
  byId("filter-type").value = "";
  const city = (filters.city || "").toLowerCase();
  const canonicalCity = city.includes("bangalore") || city.includes("bengaluru") ? "Bengaluru" :
    city.includes("hyderabad") ? "Hyderabad" : city.includes("mumbai") || city.includes("bombay") ? "Mumbai" :
    city.includes("pune") ? "Pune" : city.includes("chennai") || city.includes("madras") ? "Chennai" : city.includes("delhi") || city.includes("gurgaon") || city.includes("noida") ? "Delhi NCR" : "";
  if (canonicalCity) byId("filter-city").value = canonicalCity;
  if (filters.locality) byId("filter-locality").value = filters.locality;
  if (filters.property_type && filters.property_type !== "any") {
    state.propertyType = filters.property_type;
    byId("filter-type").value = filters.property_type;
  }
  if (filters.purpose && filters.purpose !== "any") state.purpose = filters.purpose;
  if (filters.budget_max_inr > 0) byId("filter-budget").value = String(filters.budget_max_inr);
  if (filters.bedrooms_min > 0) byId("filter-beds").value = String(filters.bedrooms_min);
  document.querySelectorAll(".category-tab").forEach((button) => {
    const active = (button.dataset.purpose || "") === state.purpose && (button.dataset.type || "") === state.propertyType;
    button.classList.toggle("active", active);
  });
  if (!document.querySelector(".category-tab.active")) document.querySelectorAll(".category-tab")[0].classList.add("active");
}

byId("natural-search").addEventListener("submit", async function (event) {
  event.preventDefault();
  const query = byId("natural-query").value.trim();
  if (!query) { byId("natural-query").focus(); return; }
  const feedback = byId("search-feedback");
  feedback.textContent = state.aiEnabled ? "Understanding your search…" : "Finding filters from your search…";
  try {
    const response = await fetch("/api/ai-search", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: query }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Search could not be interpreted.");
    applyIntent(data.filters || {});
    await loadListings();
    feedback.textContent = data.mode === "ai" ? "AI search understood your request. Results are filtered from listed properties." : "Search interpreted locally. Add an OpenAI API key on the server for AI-powered search.";
    byId("discover").scrollIntoView({ behavior: "smooth", block: "start" });
  } catch (error) { feedback.textContent = error.message; }
});

byId("filters").addEventListener("change", function (event) {
  if (event.target.id === "filter-type") state.propertyType = event.target.value;
  loadListings();
});
byId("filter-locality").addEventListener("input", function () { window.clearTimeout(window.localityTimer); window.localityTimer = window.setTimeout(loadListings, 250); });
byId("filter-budget").addEventListener("change", loadListings);
byId("clear-filters").addEventListener("click", clearAllFilters);
byId("empty-clear").addEventListener("click", clearAllFilters);
document.querySelectorAll(".category-tab").forEach((button) => button.addEventListener("click", function () { activateCategory(button); }));
document.querySelectorAll("[data-nav-purpose]").forEach((link) => link.addEventListener("click", function () { state.purpose = link.dataset.navPurpose; state.propertyType = ""; byId("filter-type").value = ""; document.querySelectorAll(".category-tab").forEach((tab) => tab.classList.toggle("active", (tab.dataset.purpose || "") === state.purpose && !tab.dataset.type)); loadListings(); }));
document.querySelectorAll("[data-nav-type]").forEach((link) => link.addEventListener("click", function () { state.purpose = ""; state.propertyType = link.dataset.navType; byId("filter-type").value = state.propertyType; document.querySelectorAll(".category-tab").forEach((tab) => tab.classList.toggle("active", tab.dataset.type === state.propertyType)); loadListings(); }));

function openSellerForm() { byId("seller-message").textContent = ""; byId("seller-dialog").showModal(); }
byId("sell-open").addEventListener("click", openSellerForm);
byId("sell-banner-open").addEventListener("click", openSellerForm);

async function submitLead(form, messageId, basePayload) {
  const message = byId(messageId);
  message.textContent = "Sending enquiry…";
  const submit = form.querySelector('button[type="submit"]');
  if (submit) submit.disabled = true;
  const values = Object.fromEntries(new FormData(form).entries());
  const payload = Object.assign({}, basePayload, {
    name: values.name || "", phone: values.phone || "", email: values.email || "",
    whatsapp_number: values.whatsapp_number || "", contact_preference: values.contact_preference || "either",
    callback_availability: values.callback_availability || "",
    message: values.message || "", consent: form.elements.consent.checked,
    company_website: values.company_website || ""
  });
  try {
    const response = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "The enquiry could not be sent.");
    message.textContent = data.message || "Thanks. Your enquiry has been received.";
    message.classList.add("success-message");
    if (form.id === "buyer-form") {
      const listingId = byId("buyer-listing-id").value;
      form.reset();
      byId("buyer-listing-id").value = listingId;
    } else form.reset();
  } catch (error) { message.textContent = error.message || "The enquiry could not be sent."; message.classList.remove("success-message"); }
  finally { if (submit) submit.disabled = false; }
}

byId("buyer-form").addEventListener("submit", function (event) {
  event.preventDefault();
  const item = state.currentListing;
  submitLead(event.currentTarget, "buyer-message", { lead_type: "buyer", listing_id: item ? item.id : null, goal: "Property enquiry" });
});

byId("seller-form").addEventListener("submit", function (event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form).entries());
  const details = {
    property_title: values.property_title, city: values.city, locality: values.locality,
    property_type: values.property_type, purpose: values.purpose, price_inr: values.price_inr,
    area_sqft: values.area_sqft, beds: values.beds, rera_project_number: values.rera_project_number,
    photo_urls: values.photo_urls
  };
  submitLead(form, "seller-message", { lead_type: "seller", goal: "Submit a property listing enquiry", details: details });
});

function teamRequest(path, options) {
  const request = Object.assign({}, options || {});
  request.headers = Object.assign({}, request.headers || {}, { "Authorization": "Bearer " + state.teamToken });
  return fetch(path, request);
}

function toggleAdminOpen() {
  byId("admin-login-message").textContent = "";
  byId("admin-dialog").showModal();
  if (state.teamToken) restoreTeamSession();
}
byId("admin-open").addEventListener("click", toggleAdminOpen);
byId("admin-footer-open").addEventListener("click", toggleAdminOpen);

async function restoreTeamSession() {
  try {
    const response = await teamRequest("/api/auth/me", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Your team session expired.");
    state.role = data.role;
    state.username = data.username;
    await showTeamWorkspace();
  } catch (error) {
    state.teamToken = "";
    sessionStorage.removeItem(TEAM_KEY);
    byId("admin-login").hidden = false;
    byId("admin-workspace").hidden = true;
    byId("admin-login-message").textContent = error.message;
  }
}

async function showTeamWorkspace() {
  byId("admin-login").hidden = true;
  byId("admin-workspace").hidden = false;
  byId("team-role-label").textContent = state.username + " · " + (state.role === "admin" ? "Administrator" : "Agent / staff");
  if (state.role === "admin" && !byId("admin-password-open")) {
    const changePassword = document.createElement("button");
    changePassword.id = "admin-password-open";
    changePassword.className = "text-link";
    changePassword.type = "button";
    changePassword.textContent = "Change administrator password";
    changePassword.addEventListener("click", () => {
      byId("admin-password-form").reset();
      byId("admin-password-message").textContent = "";
      byId("password-change-dialog").showModal();
    });
    byId("admin-workspace").insertBefore(changePassword, byId("admin-logout"));
  }
  document.querySelectorAll("[data-admin-only]").forEach((item) => { item.hidden = state.role !== "admin"; });
  document.querySelectorAll("[data-team-tab]").forEach((button) => { button.hidden = button.dataset.adminOnly !== undefined && state.role !== "admin"; });
  document.querySelectorAll("[data-team-tab]").forEach((button) => button.classList.toggle("active", button.dataset.teamTab === "leads"));
  document.querySelectorAll("[data-team-panel]").forEach((panel) => { panel.hidden = panel.dataset.teamPanel !== "leads"; });
  await loadAdminLeads();
}

async function loadAdminLeads() {
  const message = byId("admin-login-message");
  message.textContent = "Loading private enquiries…";
  try {
    const response = await teamRequest("/api/admin/leads", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not open the enquiries.");
    message.textContent = "";
    renderAdminLeads(data.leads || []);
  } catch (error) {
    message.textContent = error.message;
    if (error.message.includes("sign in") || error.message.includes("expired")) {
      state.teamToken = "";
      sessionStorage.removeItem(TEAM_KEY);
      byId("admin-login").hidden = false;
      byId("admin-workspace").hidden = true;
    }
  }
}

function renderAdminLeads(leads) {
  byId("lead-summary").textContent = leads.length + (leads.length === 1 ? " enquiry" : " enquiries");
  const list = byId("lead-list");
  list.textContent = "";
  if (!leads.length) { list.appendChild(el("p", "no-leads", "No enquiries yet. Buyer and seller forms will appear here.")); return; }
  leads.forEach((lead) => {
    const card = el("article", "lead-card");
    const top = el("div", "lead-card-top");
    top.appendChild(el("span", "lead-type", lead.lead_type === "seller" ? "Seller" : "Buyer"));
    top.appendChild(el("time", "lead-date", new Date(lead.created_at).toLocaleString("en-IN")));
    const stage = document.createElement("select");
    stage.className = "lead-stage";
    ["new", "contacted", "qualified", "closed", "spam"].forEach((value) => { const option = document.createElement("option"); option.value = value; option.textContent = value; option.selected = lead.status === value; stage.appendChild(option); });
    stage.addEventListener("change", () => updateLeadStage(lead.id, stage.value));
    top.appendChild(stage);
    card.appendChild(top);
    card.appendChild(el("h3", "", lead.name));
    const contact = el("div", "lead-contact");
    const phone = document.createElement("a"); phone.href = "tel:" + String(lead.phone).replace(/[^0-9+]/g, ""); phone.textContent = lead.phone; contact.appendChild(phone);
    if (lead.email) { const email = document.createElement("a"); email.href = "mailto:" + lead.email; email.textContent = lead.email; contact.appendChild(email); }
    card.appendChild(contact);
    if (lead.whatsapp_number) {
      const whatsapp = document.createElement("a");
      whatsapp.href = "https://wa.me/" + String(lead.whatsapp_number).replace(/\D/g, "");
      whatsapp.target = "_blank";
      whatsapp.rel = "noopener noreferrer";
      whatsapp.textContent = "WhatsApp " + lead.whatsapp_number;
      contact.appendChild(whatsapp);
    }
    card.appendChild(el("p", "lead-property", "Prefers " + (lead.contact_preference || "either") + " · Available: " + (lead.callback_availability || "not specified")));
    if (lead.property_title) card.appendChild(el("p", "lead-property", lead.property_title + (lead.locality ? " · " + lead.locality + ", " + lead.city : "")));
    if (lead.goal) card.appendChild(el("p", "lead-property", lead.goal));
    if (lead.message) card.appendChild(el("p", "lead-message", lead.message));
    if (lead.details && Object.keys(lead.details).length) {
      const detailText = Object.entries(lead.details).map(([key, value]) => key.replaceAll("_", " ") + ": " + value).join(" · ");
      card.appendChild(el("p", "lead-detail", detailText));
    }
    list.appendChild(card);
  });
}

async function updateLeadStage(id, status) {
  try {
    const response = await teamRequest("/api/admin/leads/" + id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: status }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Status update failed.");
  } catch (error) { window.alert(error.message); }
}

byId("admin-login").addEventListener("submit", async function (event) {
  event.preventDefault();
  const values = Object.fromEntries(new FormData(event.currentTarget).entries());
  const message = byId("admin-login-message");
  message.textContent = "Signing in…";
  try {
    const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Sign-in failed.");
    state.teamToken = data.token;
    state.username = data.username;
    state.role = data.role;
    sessionStorage.setItem(TEAM_KEY, state.teamToken);
    message.textContent = "";
    await showTeamWorkspace();
  } catch (error) { message.textContent = error.message; }
});
byId("admin-password-form").addEventListener("submit", async function (event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form).entries());
  const message = byId("admin-password-message");
  if (values.new_password !== values.confirm_password) {
    message.textContent = "The new password and confirmation do not match.";
    return;
  }
  delete values.confirm_password;
  message.textContent = "Updating password…";
  try {
    const response = await teamRequest("/api/auth/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not update your password.");
    form.reset();
    byId("password-change-dialog").close();
    state.teamToken = "";
    state.role = "";
    state.username = "";
    sessionStorage.removeItem(TEAM_KEY);
    byId("admin-login").hidden = false;
    byId("admin-workspace").hidden = true;
    byId("admin-login-message").textContent = "Password updated. Sign in again with your new password.";
  } catch (error) { message.textContent = error.message; }
});
byId("admin-logout").addEventListener("click", async function () {
  try { await teamRequest("/api/auth/logout", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); }
  catch (error) { console.error("Team sign-out failed.", error); }
  state.teamToken = "";
  state.role = "";
  state.username = "";
  sessionStorage.removeItem(TEAM_KEY);
  byId("admin-login").reset();
  byId("admin-login").hidden = false;
  byId("admin-workspace").hidden = true;
  byId("admin-login-message").textContent = "You have signed out.";
});
byId("export-leads").addEventListener("click", async function () {
  try {
    const response = await teamRequest("/api/admin/leads.csv");
    if (!response.ok) throw new Error("Could not export the lead file.");
    const blob = await response.blob();
    const address = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = address; link.download = "estatebridge-leads.csv"; link.click();
    URL.revokeObjectURL(address);
  } catch (error) { window.alert(error.message); }
});

async function loadManagedListings() {
  const host = byId("managed-listings");
  host.textContent = "Loading properties…";
  try {
    const response = await teamRequest("/api/admin/listings", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load property inventory.");
    renderManagedListings(data.listings || []);
  } catch (error) { host.textContent = error.message; }
}

function renderManagedListings(items) {
  const host = byId("managed-listings");
  host.textContent = "";
  if (!items.length) { host.appendChild(el("p", "no-leads", "No properties in inventory yet.")); return; }
  items.forEach((item) => {
    const card = el("article", "managed-listing");
    const info = el("div", "managed-listing-info");
    info.appendChild(el("strong", "", item.title));
    info.appendChild(el("small", "", item.locality + ", " + item.city + " · " + priceLabel(item.price_inr, item.listing_type).replace(/<[^>]*>/g, "") + " · " + item.status));
    card.appendChild(info);
    const actions = el("div", "managed-listing-actions");
    const edit = el("button", "button-outline", "Edit");
    edit.type = "button";
    edit.addEventListener("click", () => openListingEditor(item));
    actions.appendChild(edit);
    if (item.status === "active") {
      const sold = el("button", "button-outline", "Mark sold");
      sold.type = "button";
      sold.addEventListener("click", () => saveListingStatus(item, "sold"));
      actions.appendChild(sold);
    }
    if (item.status !== "archived") {
      const archive = el("button", "button-outline", "Archive");
      archive.type = "button";
      archive.addEventListener("click", () => archiveListing(item.id));
      actions.appendChild(archive);
    }
    card.appendChild(actions);
    host.appendChild(card);
  });
}

function openListingEditor(item) {
  const form = byId("listing-form");
  form.reset();
  const listing = item || { status: "active", property_type: "apartment", listing_type: "sale", beds: 0, baths: 0, parking: 0 };
  byId("listing-form-title").innerHTML = item ? "Edit <em>property.</em>" : "Add a <em>property.</em>";
  Object.entries(listing).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (!field) return;
    if (field.type === "checkbox") field.checked = Boolean(value);
    else if (Array.isArray(value)) field.value = value.join("\n");
    else field.value = value === null || value === undefined ? "" : String(value);
  });
  form.elements.id.value = item ? String(item.id) : "";
  byId("listing-message").textContent = "";
  byId("listing-edit-dialog").showModal();
}

byId("add-listing").addEventListener("click", () => openListingEditor(null));
byId("listing-form").addEventListener("submit", async function (event) {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form).entries());
  const id = values.id;
  const payload = {
    ...values,
    beds: Number(values.beds || 0), baths: Number(values.baths || 0), parking: Number(values.parking || 0),
    price_inr: Number(values.price_inr), area_sqft: Number(values.area_sqft),
    featured: form.elements.featured.checked,
    features: values.features.split("\n").map((value) => value.trim()).filter(Boolean),
    location_highlights: values.location_highlights.split("\n").map((value) => value.trim()).filter(Boolean),
    image_urls: values.image_urls.split("\n").map((value) => value.trim()).filter(Boolean)
  };
  delete payload.id;
  const message = byId("listing-message");
  message.textContent = "Saving property…";
  try {
    const response = await teamRequest(id ? "/api/admin/listings/" + id : "/api/admin/listings", {
      method: id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not save this property.");
    byId("listing-edit-dialog").close();
    await loadManagedListings();
    await loadListings();
  } catch (error) { message.textContent = error.message; }
});

async function saveListingStatus(item, status) {
  try {
    const response = await teamRequest("/api/admin/listings/" + item.id, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: status }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not update property status.");
    await loadManagedListings();
    await loadListings();
  } catch (error) { window.alert(error.message); }
}

async function archiveListing(id) {
  if (!window.confirm("Archive this property? It will no longer appear in public search.")) return;
  try {
    const response = await teamRequest("/api/admin/listings/" + id, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not archive property.");
    await loadManagedListings();
    await loadListings();
  } catch (error) { window.alert(error.message); }
}

async function loadStaffAccounts() {
  const host = byId("staff-list");
  host.textContent = "Loading team accounts…";
  try {
    const response = await teamRequest("/api/admin/staff", { cache: "no-store" });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not load agent accounts.");
    host.textContent = "";
    (data.staff || []).forEach((staff) => {
      const card = el("div", "staff-account");
      card.appendChild(el("span", "", staff.username + " · Agent · " + (staff.active ? "Active" : "Disabled")));
      const action = el("button", "button-outline", staff.active ? "Disable" : "Enable");
      action.type = "button";
      action.addEventListener("click", () => setStaffActive(staff.username, !staff.active));
      card.appendChild(action);
      host.appendChild(card);
    });
    if (!data.staff || !data.staff.length) host.appendChild(el("p", "no-leads", "No agent accounts registered yet."));
  } catch (error) { host.textContent = error.message; }
}

async function setStaffActive(username, active) {
  const action = active ? "enable" : "disable";
  if (!window.confirm("Are you sure you want to " + action + " agent " + username + "?")) return;
  try {
    const response = await teamRequest("/api/admin/staff/" + encodeURIComponent(username), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: active })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not update this agent.");
    await loadStaffAccounts();
  } catch (error) { window.alert(error.message); }
}

byId("staff-form").addEventListener("submit", async function (event) {
  event.preventDefault();
  const form = event.currentTarget;
  const message = byId("staff-message");
  message.textContent = "Registering agent…";
  try {
    const response = await teamRequest("/api/admin/staff", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(Object.fromEntries(new FormData(form).entries())) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not register this agent.");
    form.reset();
    message.textContent = "Agent account registered.";
    message.classList.add("success-message");
    await loadStaffAccounts();
  } catch (error) { message.textContent = error.message; message.classList.remove("success-message"); }
});

document.querySelectorAll("[data-team-tab]").forEach((button) => button.addEventListener("click", async function () {
  if (button.hidden) return;
  document.querySelectorAll("[data-team-tab]").forEach((tab) => tab.classList.toggle("active", tab === button));
  document.querySelectorAll("[data-team-panel]").forEach((panel) => { panel.hidden = panel.dataset.teamPanel !== button.dataset.teamTab; });
  if (button.dataset.teamTab === "listings") await loadManagedListings();
  if (button.dataset.teamTab === "staff") await loadStaffAccounts();
}));

document.querySelectorAll("[data-copy-phone]").forEach((toggle) => toggle.addEventListener("change", function () {
  const form = toggle.closest("form");
  const mobile = form.elements.phone;
  const whatsapp = form.elements.whatsapp_number;
  if (toggle.checked) whatsapp.value = mobile.value;
}));
document.querySelectorAll('input[name="phone"]').forEach((mobile) => mobile.addEventListener("input", function () {
  const form = mobile.closest("form");
  const toggle = form.querySelector("[data-copy-phone]");
  if (toggle && toggle.checked) form.elements.whatsapp_number.value = mobile.value;
}));

byId("privacy-open").addEventListener("click", () => showInfo("Privacy & data", ["EstateBridge stores enquiry details in the application database so the site team can respond. The local demo runs on your computer. A public deployment must use a secure database, HTTPS, access controls, a retention policy, and a privacy notice that matches the operator's actual practices.", "If AI search is enabled, only the text typed into the property search bar is sent to the configured AI provider to extract filters. Buyer and seller contact details are never sent to AI search.", "Before launch, configure consent language, retention and deletion workflows, contact details, and applicable India privacy requirements with qualified advice."], "PRIVACY NOTE"));
byId("rera-open").addEventListener("click", () => showInfo("Listing standards", ["Every property currently shown is fictional sample inventory with illustrative imagery. The site does not verify ownership, title, project approvals, RERA registration, price, availability, or agent credentials.", "Before publishing real listings, check the applicable state or union-territory requirements, verify the project and agent information, and show required registration details where applicable. This demo is not legal advice."], "LISTING STANDARDS"));
byId("privacy-inline").addEventListener("click", () => { byId("property-dialog").close(); showInfo("Privacy & data", ["Buyer enquiry details are stored in the app database for the team to respond. On a public deployment, use HTTPS, access controls, a retention policy, and an accurate privacy notice.", "AI search only receives the text typed into the property search bar. Buyer contact details are not sent to AI."], "PRIVACY NOTE"); });
byId("privacy-inline-seller").addEventListener("click", () => { byId("seller-dialog").close(); showInfo("Privacy & data", ["Seller enquiry details are stored in the app database for the team to respond. On a public deployment, use HTTPS, access controls, a retention policy, and an accurate privacy notice."], "PRIVACY NOTE"); });

byId("mobile-menu").addEventListener("click", () => document.querySelector(".main-nav").classList.toggle("nav-open"));
document.querySelectorAll(".main-nav a").forEach((link) => link.addEventListener("click", () => document.querySelector(".main-nav").classList.remove("nav-open")));
byId("sell-open").addEventListener("click", () => document.querySelector(".main-nav").classList.remove("nav-open"));
setupDialogClosers();

async function initialize() {
  try {
    const response = await fetch("/api/config", { cache: "no-store" });
    const config = await response.json();
    state.aiEnabled = Boolean(config.ai_enabled);
    state.adminEnabled = Boolean(config.admin_enabled);
    byId("admin-setup-note").hidden = state.adminEnabled;
    byId("admin-open").hidden = false;
    byId("admin-footer-open").hidden = false;
    if (state.aiEnabled) byId("search-feedback").textContent = "AI search is ready. Describe the kind of home or land you want.";
    else byId("search-feedback").textContent = "Search with everyday words. AI filter extraction is optional; this demo also works without an API key.";
  } catch (error) {
    byId("search-feedback").textContent = "The local app server is unavailable. Start server.py to browse the demo.";
  }
  await loadListings();
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/service-worker.js").catch(() => {});
}

initialize();
