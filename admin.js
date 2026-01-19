const tablaPendientes = document.getElementById("tablaPendientes");
const tablaNomina = document.getElementById("tablaNomina");
const filtroGuarda = document.getElementById("filtroGuarda");
const totalHorasEl = document.getElementById("totalHoras");
const totalBrutoEl = document.getElementById("totalBruto");
const totalNetoEl = document.getElementById("totalNeto");
const btnExcel = document.getElementById("btnExcel");
const btnCerrarPeriodo = document.getElementById("btnCerrarPeriodo");

let cacheNomina = [];

/* ================= CERRAR SESIÓN ================= */
btnLogout.addEventListener("click", async () => {
  await auth.signOut();
  location.href = "index.html";
});

/* ================= CONTROL SESIÓN ================= */
auth.onAuthStateChanged(async user => {
  if (!user) return location.href = "index.html";

  const perfil = (await db.collection("usuarios").doc(user.uid).get()).data();
  if (!perfil || perfil.rol !== "admin") {
    alert("Acceso no autorizado");
    return location.href = "index.html";
  }

  cargarPendientes();
  cargarNomina();
});

/* ================= FILTRO ================= */
filtroGuarda.addEventListener("change", () => mostrarNomina());

/* ================= PENDIENTES ================= */
async function cargarPendientes() {
  tablaPendientes.innerHTML = "";

  const snap = await db.collection("turnos")
    .where("estado", "==", "aprobado_supervisor")
    .get();

  for (const doc of snap.docs) {
    const t = doc.data();
    const u = (await db.collection("usuarios").doc(t.uid).get()).data();

    tablaPendientes.innerHTML += `
      <tr>
        <td>${u.nombreCompleto}</td>
        <td>${u.cedula}</td>
        <td>${t.servicio}</td>
        <td>${t.fi} ${t.hi}</td>
        <td>${t.ff} ${t.hf}</td>
        <td>${t.horas.toFixed(2)}</td>
        <td>$${t.bruto}</td>
        <td>$${t.neto}</td>
        <td><input id="c-${doc.id}" placeholder="Comentario admin"></td>
        <td>
          <button class="btn-aprobar" onclick="aprobar('${doc.id}')">✔</button>
          <button class="btn-rechazar" onclick="rechazar('${doc.id}')">✖</button>
        </td>
      </tr>
    `;
  }
}

/* ================= NÓMINA ================= */
async function cargarNomina() {
  cacheNomina = [];
  filtroGuarda.innerHTML = `<option value="">Todos</option>`;

  const snap = await db.collection("turnos")
    .where("estado", "==", "aprobado_admin")
    .get();

  for (const doc of snap.docs) {
    const t = doc.data();
    const u = (await db.collection("usuarios").doc(t.uid).get()).data();

    cacheNomina.push({ id: doc.id, ...t, ...u });

    if (![...filtroGuarda.options].some(o => o.value === t.uid)) {
      filtroGuarda.innerHTML += `<option value="${t.uid}">${u.nombreCompleto}</option>`;
    }
  }

  mostrarNomina();
}

/* ================= MOSTRAR + TOTALES ================= */
function mostrarNomina() {
  tablaNomina.innerHTML = "";

  let h = 0, b = 0, n = 0;
  const uid = filtroGuarda.value;

  cacheNomina
    .filter(t => !uid || t.uid === uid)
    .forEach(t => {
      h += t.horas;
      b += t.bruto;
      n += t.neto;

      tablaNomina.innerHTML += `
        <tr>
          <td>${t.nombreCompleto}</td>
          <td>${t.cedula}</td>
          <td>${t.servicio}</td>
          <td>${t.fi} ${t.hi}</td>
          <td>${t.ff} ${t.hf}</td>
          <td>${t.horas.toFixed(2)}</td>
          <td>$${t.bruto}</td>
          <td>$${t.neto}</td>
          <td>${t.comentarioAdmin || ""}</td>
        </tr>
      `;
    });

  totalHorasEl.textContent = h.toFixed(2);
  totalBrutoEl.textContent = b.toFixed(0);
  totalNetoEl.textContent = n.toFixed(0);
}

/* ================= ACCIONES ================= */
async function aprobar(id) {
  const c = document.getElementById(`c-${id}`).value || "Aprobado";
  await db.collection("turnos").doc(id).update({
    estado: "aprobado_admin",
    comentarioAdmin: c
  });
  cargarPendientes();
  cargarNomina();
}

async function rechazar(id) {
  const c = document.getElementById(`c-${id}`).value;
  if (!c) return alert("Debe indicar motivo");
  await db.collection("turnos").doc(id).update({
    estado: "rechazado_admin",
    comentarioAdmin: c
  });
  cargarPendientes();
}

/* ================= EXPORTAR EXCEL ================= */
btnExcel.addEventListener("click", () => {
  const uid = filtroGuarda.value;
  const datos = cacheNomina.filter(t => !uid || t.uid === uid);

  if (!datos.length) return alert("No hay datos");

  const hoja = [
    ["Guarda","Cédula","Servicio","Inicio","Fin","Horas","Bruto","Neto","Comentario"]
  ];

  datos.forEach(t => hoja.push([
    t.nombreCompleto, t.cedula, t.servicio,
    `${t.fi} ${t.hi}`, `${t.ff} ${t.hf}`,
    t.horas, t.bruto, t.neto, t.comentarioAdmin || ""
  ]));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(hoja), "Nomina");
  XLSX.writeFile(wb, "Nomina_Guardas.xlsx");
});

/* ================= CIERRE PERIODO ================= */
btnCerrarPeriodo.addEventListener("click", async () => {
  if (!confirm("¿Cerrar periodo actual?")) return;

  const snap = await db.collection("turnos")
    .where("estado", "==", "aprobado_admin")
    .get();

  const batch = db.batch();
  snap.forEach(d => batch.update(d.ref, { estadoPeriodo: "cerrado" }));
  await batch.commit();

  alert("Periodo cerrado");
});
