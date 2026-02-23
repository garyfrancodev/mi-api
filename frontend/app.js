// Cambia esto si tu API está en otro host/puerto
const API_BASE = "http://localhost:3000/api/usuarios";

const els = {
  btnRefresh: document.getElementById("btnRefresh"),
  form: document.getElementById("userForm"),
  formTitle: document.getElementById("formTitle"),
  formHint: document.getElementById("formHint"),
  btnSubmit: document.getElementById("btnSubmit"),
  btnCancel: document.getElementById("btnCancel"),
  userId: document.getElementById("userId"),
  nombre: document.getElementById("nombre"),
  email: document.getElementById("email"),
  password: document.getElementById("password"),
  rol: document.getElementById("rol"),
  activo: document.getElementById("activo"),
  tbody: document.getElementById("usersTbody"),
  search: document.getElementById("search"),
  countInfo: document.getElementById("countInfo"),
  toast: document.getElementById("toast"),
  modal: document.getElementById("modal"),
  modalText: document.getElementById("modalText"),
  btnConfirmDelete: document.getElementById("btnConfirmDelete"),
};

let state = {
  users: [],
  deleteId: null,
};

function showToast(msg) {
  els.toast.textContent = msg;
  els.toast.classList.add("show");
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => els.toast.classList.remove("show"), 2400);
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const contentType = res.headers.get("content-type") || "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
        (data && data.message) ||
        (typeof data === "string" ? data : "Error en la petición");
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

function badgeActivo(val) {
  return val
      ? `<span class="badge badge--ok">● Activo</span>`
      : `<span class="badge badge--off">○ Inactivo</span>`;
}

function escapeHtml(s) {
  return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
}

function render(users) {
  const q = els.search.value.trim().toLowerCase();
  const filtered = !q
      ? users
      : users.filter(u =>
          (u.nombre || "").toLowerCase().includes(q) ||
          (u.email || "").toLowerCase().includes(q)
      );

  els.tbody.innerHTML = filtered
      .map(u => `
      <tr>
        <td><code>${u.id}</code></td>
        <td>${escapeHtml(u.nombre)}</td>
        <td>${escapeHtml(u.email)}</td>
        <td>${escapeHtml(u.rol)}</td>
        <td>${badgeActivo(!!u.activo)}</td>
        <td class="muted">${formatDate(u.created_at)}</td>
        <td>
          <div class="actions">
            <button class="btn btn--ghost" data-edit="${u.id}" type="button">Editar</button>
            <button class="btn btn--danger" data-del="${u.id}" type="button">Eliminar</button>
          </div>
        </td>
      </tr>
    `)
      .join("");

  els.countInfo.textContent = `${filtered.length} usuario(s) mostrado(s) / ${users.length} total.`;
}

function setFormMode(mode) {
  if (mode === "create") {
    els.formTitle.textContent = "Crear usuario";
    els.formHint.textContent = "Completa los campos y guarda.";
    els.btnSubmit.textContent = "Guardar";
    els.btnCancel.hidden = true;
    els.userId.value = "";
  } else {
    els.formTitle.textContent = "Editar usuario";
    els.formHint.textContent = "Modifica los campos. Password es opcional.";
    els.btnSubmit.textContent = "Actualizar";
    els.btnCancel.hidden = false;
  }
}

function resetForm() {
  els.form.reset();
  els.userId.value = "";
  els.activo.checked = true;
  els.rol.value = "user";
  setFormMode("create");
}

async function loadUsers() {
  const users = await api(API_BASE);
  state.users = users.map(u => ({ ...u, activo: !!u.activo }));
  render(state.users);
}

/* ========= MODAL (CORREGIDO) ========= */
function openModalDelete(id) {
  state.deleteId = id;

  const u = state.users.find(x => String(x.id) === String(id));
  els.modalText.textContent = u
      ? `¿Seguro que deseas eliminar a "${u.nombre}" (${u.email})?`
      : "¿Seguro que deseas eliminar este usuario?";

  els.modal.hidden = false;
}

function closeModal() {
  state.deleteId = null;
  els.modal.hidden = true;
}

function setupModalClose() {
  // 1) Click en backdrop o en botones con data-close (incluye clicks en hijos)
  els.modal.addEventListener("click", (ev) => {
    const closeEl = ev.target.closest("[data-close]");
    if (closeEl) closeModal();
  });

  // 2) Evitar que click dentro del contenido cierre accidentalmente
  const content = els.modal.querySelector("[data-modal-content]");
  if (content) content.addEventListener("click", (ev) => ev.stopPropagation());

  // 3) Cerrar con tecla ESC
  document.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !els.modal.hidden) closeModal();
  });
}
/* =================================== */

async function createUser(payload) {
  return api(API_BASE, { method: "POST", body: JSON.stringify(payload) });
}

async function updateUser(id, payload) {
  return api(`${API_BASE}/${id}`, { method: "PUT", body: JSON.stringify(payload) });
}

async function deleteUser(id) {
  return api(`${API_BASE}/${id}`, { method: "DELETE" });
}

async function handleEdit(id) {
  const u = state.users.find(x => String(x.id) === String(id));
  if (!u) {
    showToast("No se encontró el usuario en la lista.");
    return;
  }

  els.userId.value = u.id;
  els.nombre.value = u.nombre ?? "";
  els.email.value = u.email ?? "";
  els.rol.value = u.rol ?? "user";
  els.activo.checked = !!u.activo;
  els.password.value = "";

  setFormMode("edit");
  els.nombre.focus();
}

els.btnRefresh.addEventListener("click", async () => {
  try {
    await loadUsers();
    showToast("Lista actualizada");
  } catch (e) {
    showToast(`Error: ${e.message}`);
  }
});

els.search.addEventListener("input", () => render(state.users));

els.btnCancel.addEventListener("click", () => resetForm());

els.form.addEventListener("submit", async (ev) => {
  ev.preventDefault();

  const id = els.userId.value.trim();

  const payload = {
    nombre: els.nombre.value.trim(),
    email: els.email.value.trim(),
    rol: els.rol.value,
    activo: els.activo.checked,
  };

  const password = els.password.value;

  if (!id) {
    if (!password || password.length < 6) {
      showToast("Password requerido (mínimo 6).");
      return;
    }
    payload.password = password;
  } else {
    if (password && password.length >= 6) payload.password = password;
  }

  try {
    if (!id) {
      await createUser(payload);
      showToast("Usuario creado");
    } else {
      await updateUser(id, payload);
      showToast("Usuario actualizado");
    }

    resetForm();
    await loadUsers();
  } catch (e) {
    if (e.data?.details) {
      const msg = e.data.details.map(d => `${d.path ?? d.param}: ${d.msg}`).join(" | ");
      showToast(`Validación: ${msg}`);
    } else {
      showToast(`Error: ${e.message}`);
    }
  }
});

document.addEventListener("click", async (ev) => {
  const btn = ev.target.closest("button");
  if (!btn) return;

  const editId = btn.dataset.edit;
  const delId = btn.dataset.del;

  try {
    if (editId) await handleEdit(editId);
    if (delId) openModalDelete(delId);
  } catch (e) {
    showToast(`Error: ${e.message}`);
  }
});

els.btnConfirmDelete.addEventListener("click", async () => {
  if (!state.deleteId) return;

  try {
    await deleteUser(state.deleteId);
    showToast("Usuario eliminado");
    closeModal();
    resetForm();
    await loadUsers();
  } catch (e) {
    showToast(`Error: ${e.message}`);
  }
});

// Init
(async function init() {
  setupModalClose();
  try {
    await loadUsers();
    showToast("Conectado a la API");
  } catch (e) {
    showToast(`No se pudo conectar: ${e.message}`);
  }
})();
