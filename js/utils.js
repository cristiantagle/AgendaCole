export const $ = sel => document.querySelector(sel);
export const $$ = sel => Array.from(document.querySelectorAll(sel));

export const uid = () => Math.random().toString(36).slice(2, 10);

export const fmtDate = (dStr) => dStr || "";
export const fmtTime = (tStr) => tStr || "";

export const telHref = (tel) => tel ? `tel:${tel}` : "#";
export const mailHref = (mail) => mail ? `mailto:${mail}` : "#";
export const mapsHref = (addr) => addr ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}` : "#";

export const debounce = (fn, ms=250) => {
  let t; return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
};

export const withinTwoHours = (dateA, timeA, dateB, timeB) => {
  if (!dateA || !timeA || !dateB || !timeB) return false;
  const a = new Date(`${dateA}T${timeA}`);
  const b = new Date(`${dateB}T${timeB}`);
  const diff = Math.abs(a - b);
  return diff <= 2 * 60 * 60 * 1000; // 2h
};

export const confirmModal = (title, bodyHtml = "") => new Promise((resolve) => {
  const modal = $("#modal");
  $("#modalTitle").textContent = title;
  $("#modalBody").innerHTML = bodyHtml;
  modal.classList.remove("hidden");
  const ok = $("#modalOk");
  const cancel = $("#modalCancel");
  const onOk = () => { cleanup(); resolve(true); };
  const onCancel = () => { cleanup(); resolve(false); };
  function cleanup(){
    ok.removeEventListener("click", onOk);
    cancel.removeEventListener("click", onCancel);
    modal.classList.add("hidden");
  }
  ok.addEventListener("click", onOk);
  cancel.addEventListener("click", onCancel);
});

export const toast = (msg, ms=2200) => {
  const el = $("#toast");
  el.textContent = msg; el.classList.remove("hidden");
  setTimeout(() => el.classList.add("hidden"), ms);
};

export const icon = (name) => {
  const map = {
    phone: "📞", mail: "✉️", map: "🗺️", edit: "✏️", del: "🗑️", eye: "🔎", cal: "🗓️",
    back: "↩️", add: "➕", save: "💾", warn: "⚠️"
  };
  return map[name] || "";
};

export const csvSanitize = (v) => (v ?? "").toString().replaceAll("\n"," ").replaceAll(";",",");

