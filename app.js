const STORAGE_KEY = "solicitud_empleo_confidencial";
const FOTO_MAX_MB = 8;
const FOTO_MAX_ANCHO = 400;
const FOTO_MAX_ALTO = 500;

const form = document.getElementById("solicitud");
const toast = document.getElementById("toast");
const fotoBox = document.getElementById("fotoBox");
const fotoPreview = document.getElementById("fotoPreview");
const fotoInput = document.getElementById("fotoInput");
const btnQuitarFoto = document.getElementById("btnQuitarFoto");

let fotoDataUrl = "";

function showToast(msg, isError = false) {
  toast.textContent = msg;
  toast.className = `toast show${isError ? " error" : ""}`;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.remove("show"), 3200);
}

function setFoto(dataUrl) {
  fotoDataUrl = dataUrl || "";
  if (fotoDataUrl) {
    fotoPreview.src = fotoDataUrl;
    fotoPreview.hidden = false;
    fotoBox.classList.add("tiene-foto");
    btnQuitarFoto.hidden = false;
  } else {
    fotoPreview.removeAttribute("src");
    fotoPreview.hidden = true;
    fotoBox.classList.remove("tiene-foto");
    btnQuitarFoto.hidden = true;
  }
}

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        const ratio = Math.min(FOTO_MAX_ANCHO / width, FOTO_MAX_ALTO / height, 1);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => reject(new Error("img"));
      img.src = e.target.result;
    };
    reader.onerror = () => reject(new Error("read"));
    reader.readAsDataURL(file);
  });
}

async function handleFotoSeleccionada(file) {
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("Use una imagen JPG, PNG o similar.", true);
    return;
  }
  if (file.size > FOTO_MAX_MB * 1024 * 1024) {
    showToast(`Máximo ${FOTO_MAX_MB} MB por imagen.`, true);
    return;
  }
  try {
    setFoto(await compressImage(file));
    showToast("Foto cargada. Guarde el borrador para conservarla.");
  } catch {
    showToast("No se pudo cargar la imagen.", true);
  }
  fotoInput.value = "";
}

fotoInput?.addEventListener("change", (e) => handleFotoSeleccionada(e.target.files?.[0]));
btnQuitarFoto?.addEventListener("click", () => {
  setFoto("");
  fotoInput.value = "";
  showToast("Foto eliminada.");
});

function collectFormData() {
  const data = {};
  form.querySelectorAll("input, textarea, select").forEach((el) => {
    const { name, type } = el;
    if (!name || type === "file") return;
    if (type === "radio") {
      if (el.checked) data[name] = el.value;
    } else if (type === "checkbox") {
      data[name] = el.checked;
    } else {
      data[name] = el.value;
    }
  });
  if (fotoDataUrl) data.foto = fotoDataUrl;
  return data;
}

function restoreFormData(data) {
  form.querySelectorAll("input, textarea, select").forEach((el) => {
    const { name, type } = el;
    if (!name || type === "file" || !(name in data)) return;
    if (type === "radio") el.checked = el.value === data[name];
    else if (type === "checkbox") el.checked = !!data[name];
    else el.value = data[name] ?? "";
  });
  setFoto(data.foto || "");
}

function calcularEdad() {
  const fn = document.getElementById("fechaNacimiento");
  const edad = document.getElementById("edad");
  if (!fn?.value || !edad) return;
  const n = new Date(fn.value);
  const hoy = new Date();
  let e = hoy.getFullYear() - n.getFullYear();
  const m = hoy.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < n.getDate())) e--;
  if (e > 0) edad.value = e;
}

document.getElementById("fechaNacimiento")?.addEventListener("change", calcularEdad);

document.getElementById("btnGuardar")?.addEventListener("click", () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(collectFormData()));
    showToast("Borrador guardado correctamente.");
  } catch (err) {
    showToast(
      err.name === "QuotaExceededError"
        ? "Espacio lleno. Quite la foto o use una más pequeña."
        : "No se pudo guardar.",
      true
    );
  }
});

document.getElementById("btnCargar")?.addEventListener("click", () => {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    showToast("No hay borrador guardado.", true);
    return;
  }
  try {
    restoreFormData(JSON.parse(raw));
    showToast("Borrador cargado.");
  } catch {
    showToast("El borrador está dañado.", true);
  }
});

document.getElementById("btnLimpiar")?.addEventListener("click", () => {
  if (!confirm("¿Borrar todos los datos del formulario?")) return;
  form.reset();
  setFoto("");
  fotoInput.value = "";
  const fecha = document.getElementById("fecha");
  if (fecha) fecha.valueAsDate = new Date();
  document.querySelector('[name="nacionalidad"]').value = "Mexicana";
  showToast("Formulario limpiado.");
});

document.getElementById("btnImprimir")?.addEventListener("click", () => window.print());

form.addEventListener("submit", (e) => e.preventDefault());

const fecha = document.getElementById("fecha");
if (fecha && !fecha.value) fecha.valueAsDate = new Date();

const saved = localStorage.getItem(STORAGE_KEY);
if (saved) {
  try {
    restoreFormData(JSON.parse(saved));
  } catch {
    /* ignore */
  }
}
