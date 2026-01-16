const VALOR_HORA = 8775;

const servicio = document.getElementById("servicio");
const fi = document.getElementById("fi");
const hi = document.getElementById("hi");
const ff = document.getElementById("ff");
const hf = document.getElementById("hf");
const obs = document.getElementById("obs");

const btnGuardar = document.getElementById("btnGuardar");
const btnLogout = document.getElementById("btnLogout");
const btnExcel = document.getElementById("btnExcel");
const btnBorrarTodo = document.getElementById("btnBorrarTodo");

const tablaBody = document.querySelector("#tabla tbody");

const filtroAdmin = document.getElementById("filtroAdmin");
const filtroGuarda = document.getElementById("filtroGuarda");
const busquedaNombre = document.getElementById("busquedaNombre");

const totalBruto = document.getElementById("totalBruto");
const totalNeto = document.getElementById("totalNeto");
const totalBrutoPagar = document.getElementById("totalBrutoPagar");
const totalNetoPagar = document.getElementById("totalNetoPagar");

let esAdmin = false;
let cacheUsuarios = {};
let turnoEditando = null;

/* ================= LOGOUT ================= */
btnLogout.onclick = async () => {
  await auth.signOut();
  window.location.href = "index.html";
};

/* ================= GUARDAR / CORREGIR ================= */
btnGuardar.onclick = async () => {
  const user = auth.currentUser;
  if (!user) return;

  const inicio = new Date(`${fi.value}T${hi.value}`);
  const fin = new Date(`${ff.value}T${hf.value}`);
  const horas = (fin - inicio) / 3600000;

  if (horas <= 0) {
    alert("Fechas u horas inválidas");
    return;
  }

  const data = {
    uid: user.uid,
    servicio: servicio.value,
    fi: fi.value,
    hi: hi.value,
    ff: ff.value,
    hf: hf.value,
    horas,
    bruto: horas * VALOR_HORA,
    neto: horas * VALOR_HORA * 0.92,
    estado: "pendiente",
    comentarioGuarda: "",
    comentarioAdmin: "",
    creado: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (turnoEditando) {
    data.estado = "corregido";
    data.comentarioGuarda = obs.value;

    await db.collection("turnos").doc(turnoEditando).update(data);
    turnoEditando = null;
  } else {
    await db.collection("turnos").add(data);
  }

  limpiarFormulario();
  cargarTurnos();
};

/* ================= CARGAR TURNOS ================= */
async function cargarTurnos() {
  tablaBody.innerHTML = "";

  let bruto = 0, neto = 0, brutoPagar = 0, netoPagar = 0;

  let query = db.collection("turnos");

  if (!esAdmin) {
    query = query.where("uid", "==", auth.currentUser.uid);
  } else if (filtroGuarda.value) {
    query = query.where("uid", "==", filtroGuarda.value);
  }

  const snap = await query.get();

  for (const doc of snap.docs) {
    const t = doc.data();
    const u = await obtenerUsuario(t.uid);

    if (
      busquedaNombre.value &&
      !u.nombreCompleto.toLowerCase().includes(busquedaNombre.value.toLowerCase())
    ) continue;

    bruto += t.bruto;
    neto += t.neto;

    if (t.estado === "aprobado") {
      brutoPagar += t.bruto;
      netoPagar += t.neto;
    }

    let acciones = "";

    /* ===== ACCIONES GUARDA ===== */
    if (!esAdmin && t.estado === "rechazado") {
      acciones = `
        <div class="comentario rojo">
          <strong>Admin:</strong> ${t.comentarioAdmin}
        </div>
        <button onclick="editarTurno('${doc.id}', '${t.servicio}', '${t.fi}', '${t.hi}', '${t.ff}', '${t.hf}')">
          ✏️ Corregir
        </button>
      `;
    }

    /* ===== ACCIONES ADMIN ===== */
    if (esAdmin) {
      acciones = `
        <button onclick="aprobar('${doc.id}')">✔</button>
        <button onclick="rechazar('${doc.id}')">✖</button>
        ${t.comentarioGuarda ? `<div class="comentario azul"><strong>Guarda:</strong> ${t.comentarioGuarda}</div>` : ""}
      `;
    }

    tablaBody.innerHTML += `
      <tr>
        <td>${u.nombreCompleto}</td>
        <td>${u.cedula}</td>
        <td>${t.servicio}</td>
        <td>${t.fi} ${t.hi}</td>
        <td>${t.ff} ${t.hf}</td>
        <td>${t.horas.toFixed(2)}</td>
        <td>$${t.bruto.toFixed(0)}</td>
        <td>$${t.neto.toFixed(0)}</td>
        <td>${t.estado}</td>
        <td>${acciones}</td>
      </tr>
    `;
  }

  totalBruto.innerText = `$${bruto.toFixed(0)}`;
  totalNeto.innerText = `$${neto.toFixed(0)}`;
  totalBrutoPagar.innerText = `$${brutoPagar.toFixed(0)}`;
  totalNetoPagar.innerText = `$${netoPagar.toFixed(0)}`;
}

/* ================= EDITAR ================= */
function editarTurno(id, s, fiV, hiV, ffV, hfV) {
  turnoEditando = id;
  servicio.value = s;
  fi.value = fiV;
  hi.value = hiV;
  ff.value = ffV;
  hf.value = hfV;
  obs.value = "";
}

/* ================= ADMIN ================= */
async function aprobar(id) {
  await db.collection("turnos").doc(id).update({
    estado: "aprobado",
    comentarioAdmin: ""
  });
  cargarTurnos();
}

async function rechazar(id) {
  const motivo = prompt("Motivo del rechazo:");
  if (!motivo) return;

  await db.collection("turnos").doc(id).update({
    estado: "rechazado",
    comentarioAdmin: motivo
  });
  cargarTurnos();
}

/* ================= UTIL ================= */
function limpiarFormulario() {
  servicio.value = fi.value = hi.value = ff.value = hf.value = obs.value = "";
}

async function obtenerUsuario(uid) {
  if (cacheUsuarios[uid]) return cacheUsuarios[uid];
  const doc = await db.collection("usuarios").doc(uid).get();
  cacheUsuarios[uid] = doc.data();
  return doc.data();
}

/* ================= BORRAR TODOS LOS TURNOS ================= */

if (btnBorrarTodo) {
  btnBorrarTodo.addEventListener("click", borrarTodosMisTurnos);
}

async function borrarTodosMisTurnos() {
  const user = auth.currentUser;
  if (!user) return;

  const confirmar = confirm(
    "⚠️ Esta acción eliminará TODOS tus turnos (aprobados, pendientes y rechazados).\n\n¿Deseas continuar?"
  );

  if (!confirmar) return;

  try {
    const snap = await db
      .collection("turnos")
      .where("uid", "==", user.uid)
      .get();

    if (snap.empty) {
      alert("No tienes turnos para borrar.");
      return;
    }

    const batch = db.batch();

    snap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    alert("✅ Todos tus turnos fueron eliminados correctamente.");
    cargarTurnos();

  } catch (error) {
    console.error(error);
    alert("❌ Error al borrar los turnos.");
  }
}

/* ================= EXCEL ================= */

if (btnExcel) {
  btnExcel.addEventListener("click", exportarExcel);
}

function exportarExcel() {
  const tabla = document.getElementById("tabla");

  if (!tabla || tabla.rows.length <= 1) {
    alert("No hay datos para exportar");
    return;
  }

  try {
    const wb = XLSX.utils.table_to_book(tabla, {
      sheet: "Turnos"
    });

    XLSX.writeFile(wb, "turnos.xlsx");
  } catch (error) {
    console.error(error);
    alert("Error al exportar el archivo Excel");
  }
}

/* ================= AUTH ================= */
auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const perfil = await db.collection("usuarios").doc(user.uid).get();
  esAdmin = perfil.data().rol === "admin";

  if (esAdmin) {
    filtroAdmin.style.display = "block";
    const snap = await db.collection("usuarios").get();
    snap.forEach(d => {
      filtroGuarda.innerHTML += `<option value="${d.id}">${d.data().nombreCompleto}</option>`;
    });
  }

  cargarTurnos();
});

filtroGuarda.onchange = cargarTurnos;
busquedaNombre.oninput = cargarTurnos;



