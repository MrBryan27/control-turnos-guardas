

/* ================= CONSTANTES ================= */
const VALOR_HORA = 8775;
let esAdmin = false;
const usuariosCache = {};
let filtroTimeout = null;

/* ================= ELEMENTOS ================= */
const servicio = document.getElementById("servicio");
const fi = document.getElementById("fi");
const hi = document.getElementById("hi");
const ff = document.getElementById("ff");
const hf = document.getElementById("hf");
const obs = document.getElementById("obs");

const btnGuardar = document.getElementById("btnGuardar");
const btnExcel = document.getElementById("btnExcel");
const btnLogout = document.getElementById("btnLogout");
const btnBorrarTodos = document.getElementById("btnBorrarTodos");

const tablaBody = document.querySelector("#tabla tbody");
const filtroAdmin = document.getElementById("filtroAdmin");
const filtroGuarda = document.getElementById("filtroGuarda");
const busquedaNombre = document.getElementById("busquedaNombre");

/* ================= EVENTOS ================= */
btnGuardar.addEventListener("click", guardarTurno);
btnExcel.addEventListener("click", exportarExcel);

btnLogout.addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "index.html";
});

if (btnBorrarTodos) {
  btnBorrarTodos.addEventListener("click", borrarTodosMisTurnos);
}

filtroGuarda.addEventListener("change", () => {
  busquedaNombre.value = "";
  cargarTurnos();
});

busquedaNombre.addEventListener("input", () => {
  clearTimeout(filtroTimeout);
  filtroTimeout = setTimeout(() => {
    filtroGuarda.value = "";
    cargarTurnos();
  }, 300);
});

/* ================= FUNCIONES ================= */

async function guardarTurno() {
  const user = auth.currentUser;
  if (!user) return alert("Debe iniciar sesión");

  if (!servicio.value.trim()) return alert("Ingrese el servicio");
  if (!fi.value || !hi.value || !ff.value || !hf.value)
    return alert("Complete fecha y hora");

  const inicio = new Date(`${fi.value}T${hi.value}`);
  const fin = new Date(`${ff.value}T${hf.value}`);
  const horas = (fin - inicio) / 3600000;

  if (horas <= 0) return alert("Horas inválidas");

  await db.collection("turnos").add({
    uid: user.uid,
    servicio: servicio.value.trim(),
    fi: fi.value,
    hi: hi.value,
    ff: ff.value,
    hf: hf.value,
    horas,
    bruto: horas * VALOR_HORA,
    neto: horas * VALOR_HORA * 0.92,
    observaciones: obs.value || "",
    creado: firebase.firestore.FieldValue.serverTimestamp()
  });

  limpiarFormulario();
  cargarTurnos();
}

async function obtenerUsuario(uid) {
  if (usuariosCache[uid]) return usuariosCache[uid];

  const doc = await db.collection("usuarios").doc(uid).get();
  if (!doc.exists) {
    usuariosCache[uid] = { nombreCompleto: "SIN PERFIL", cedula: "" };
    return usuariosCache[uid];
  }

  usuariosCache[uid] = doc.data();
  return doc.data();
}

async function cargarTurnos() {
  const user = auth.currentUser;
  if (!user) return;

  tablaBody.innerHTML = ""; // 🔥 CLAVE PARA NO DUPLICAR

  let query = db.collection("turnos").orderBy("creado", "desc");

  if (!esAdmin) {
    query = query.where("uid", "==", user.uid);
  } else if (filtroGuarda.value) {
    query = query.where("uid", "==", filtroGuarda.value);
  }

  const snapshot = await query.get();

  for (const doc of snapshot.docs) {
    const t = doc.data();
    const u = await obtenerUsuario(t.uid);

    if (
      busquedaNombre.value &&
      !u.nombreCompleto
        .toLowerCase()
        .includes(busquedaNombre.value.toLowerCase())
    ) continue;

    tablaBody.innerHTML += `
      <tr>
        <td>${u.nombreCompleto}</td>
        <td>${u.cedula}</td>
        <td>${t.servicio}</td>
        <td>${t.fi} ${t.hi}</td>
        <td>${t.ff} ${t.hf}</td>
        <td>${t.horas.toFixed(2)}</td>
        <td>${t.bruto.toFixed(0)}</td>
        <td>${t.neto.toFixed(0)}</td>
        <td>${t.observaciones || ""}</td>
        <td>
          <button class="btn-delete" onclick="borrarTurno('${doc.id}')">🗑️</button>
        </td>
      </tr>
    `;
  }
}

async function cargarGuardas() {
  filtroGuarda.innerHTML = `<option value="">Seleccionar guarda</option>`;

  const snap = await db.collection("usuarios").get();
  snap.forEach(doc => {
    const u = doc.data();
    if (u.nombreCompleto) {
      filtroGuarda.innerHTML += `
        <option value="${doc.id}">
          ${u.nombreCompleto} - ${u.cedula}
        </option>
      `;
    }
  });
}

async function borrarTurno(id) {
  if (!confirm("¿Eliminar este turno?")) return;
  await db.collection("turnos").doc(id).delete();
  tablaBody.innerHTML = "";
  cargarTurnos();
}

// async function borrarTodosMisTurnos() {
//   const user = auth.currentUser;
//   if (!user) return;

//   if (!confirm("¿Eliminar TODOS tus turnos?")) return;

//   const snap = await db.collection("turnos")
//     .where("uid", "==", user.uid)
//     .get();

//   const batch = db.batch();
//   snap.forEach(doc => batch.delete(doc.ref));
//   await batch.commit();

//   tablaBody.innerHTML = "";
//   cargarTurnos();
// }

// ================== BORRAR TODOS MIS TURNOS ==================
const btnBorrarTodo = document.getElementById("btnBorrarTodo");

btnBorrarTodo.addEventListener("click", async () => {
  const user = auth.currentUser;
  if (!user) return;

  if (!confirm("¿Seguro que deseas borrar TODOS tus turnos?")) return;

  try {
    const snap = await db
      .collection("turnos")
      .where("uid", "==", user.uid)
      .get();

    if (snap.empty) {
      alert("No tienes turnos para borrar");
      return;
    }

    const batch = db.batch();

    snap.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    alert("Todos tus turnos fueron eliminados");
    cargarTurnos();

  } catch (error) {
    console.error(error);
    alert("Error al borrar los turnos");
  }
});


function limpiarFormulario() {
  servicio.value = fi.value = hi.value = ff.value = hf.value = obs.value = "";
}

function exportarExcel() {
  const wb = XLSX.utils.table_to_book(document.getElementById("tabla"));
  XLSX.writeFile(wb, "Turnos.xlsx");
}

/* ================= AUTH ================= */
auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "control_turnos_login.html";
    return;
  }

  const perfil = await db.collection("usuarios").doc(user.uid).get();
  esAdmin = perfil.exists && perfil.data().rol === "admin";

  if (esAdmin) {
    filtroAdmin.style.display = "block";
    cargarGuardas();
  }

  cargarTurnos();
});
