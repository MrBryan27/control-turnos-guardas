/******************** CONFIG ********************/
const VALOR_HORA = 8775;

/******************** ESTADO ********************/
let modoEdicion = false;
let turnoEditandoId = null;

let usuarioActual = null;
let perfilActual = null;

/******************** ELEMENTOS ********************/
const servicio = document.getElementById("servicio");
const fi = document.getElementById("fi");
const hi = document.getElementById("hi");
const ff = document.getElementById("ff");
const hf = document.getElementById("hf");
const obs = document.getElementById("obs");

const btnGuardar = document.getElementById("btnGuardar");
const btnLogout = document.getElementById("btnLogout");
const btnBorrarTodo = document.getElementById("btnBorrarTodo");
const btnExcel = document.getElementById("btnExcel");

const tablaBody = document.getElementById("tablaBody");

const totalBruto = document.getElementById("totalBruto");
const totalNeto = document.getElementById("totalNeto");
const totalBrutoPagar = document.getElementById("totalBrutoPagar");
const totalNetoPagar = document.getElementById("totalNetoPagar");

/******************** SESIÓN ********************/
auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  usuarioActual = user;

  const perfilDoc = await db.collection("usuarios").doc(user.uid).get();
  perfilActual = perfilDoc.data();

  cargarTurnosGuarda();
});

/******************** LOGOUT ********************/
btnLogout.addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "index.html";
});

/******************** GUARDAR / ACTUALIZAR TURNO ********************/
btnGuardar.addEventListener("click", async () => {
  if (!usuarioActual) return;

  if (!servicio.value || !fi.value || !hi.value || !ff.value || !hf.value) {
    alert("Complete todos los campos");
    return;
  }

  const inicio = new Date(`${fi.value}T${hi.value}`);
  const fin = new Date(`${ff.value}T${hf.value}`);
  const horas = (fin - inicio) / 3600000;

  if (horas <= 0) {
    alert("Horas inválidas");
    return;
  }

  if (modoEdicion && !obs.value.trim()) {
    alert("Debe indicar el motivo de la corrección");
    return;
  }

  const dataTurno = {
    servicio: servicio.value,
    fi: fi.value,
    hi: hi.value,
    ff: ff.value,
    hf: hf.value,
    horas,
    bruto: horas * VALOR_HORA,
    neto: horas * VALOR_HORA * 0.92,
    comentarioGuarda: obs.value.trim(),
    estado: "pendiente_supervisor",
    actualizado: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (modoEdicion) {
    await db.collection("turnos").doc(turnoEditandoId).update({
      ...dataTurno,
      comentarioSupervisor: "",
      comentarioAdmin: ""
    });

    modoEdicion = false;
    turnoEditandoId = null;
    btnGuardar.innerText = "Guardar turno";
  } else {
    await db.collection("turnos").add({
      uid: usuarioActual.uid,
      ...dataTurno,
      creado: firebase.firestore.FieldValue.serverTimestamp()
    });
  }

  limpiarFormulario();
  cargarTurnosGuarda();
});

/******************** CARGAR TURNOS ********************/
async function cargarTurnosGuarda() {
  tablaBody.innerHTML = "";

  let tBruto = 0;
  let tNeto = 0;
  let tBrutoPagar = 0;
  let tNetoPagar = 0;

  const snap = await db.collection("turnos")
    .where("uid", "==", usuarioActual.uid)
    .orderBy("creado", "desc")
    .get();

  snap.forEach(doc => {
    const t = doc.data();

    tBruto += t.bruto;
    tNeto += t.neto;

    if (t.estado === "aprobado_admin") {
      tBrutoPagar += t.bruto;
      tNetoPagar += t.neto;
    }

    let comentario = "";
    if (t.estado.includes("rechazado")) {
      comentario = t.comentarioSupervisor || t.comentarioAdmin || "";
    }

    let accion = "";
    if (t.estado === "rechazado_supervisor" || t.estado === "rechazado_admin") {
      accion = `<button class="btn-edit" onclick="editarTurno('${doc.id}')">✏️ Editar</button>`;
    }

    tablaBody.innerHTML += `
      <tr>
        <td>${perfilActual.nombreCompleto}</td>
        <td>${perfilActual.cedula}</td>
        <td>${t.servicio}</td>
        <td>${t.fi} ${t.hi}</td>
        <td>${t.ff} ${t.hf}</td>
        <td>${t.horas.toFixed(2)}</td>
        <td>$${t.bruto.toFixed(0)}</td>
        <td>$${t.neto.toFixed(0)}</td>
        <td>${t.estado}</td>
        <td>${comentario}</td>
        <td>${accion}</td>
      </tr>
    `;
  });

  totalBruto.innerText = `$${tBruto.toFixed(0)}`;
  totalNeto.innerText = `$${tNeto.toFixed(0)}`;
  totalBrutoPagar.innerText = `$${tBrutoPagar.toFixed(0)}`;
  totalNetoPagar.innerText = `$${tNetoPagar.toFixed(0)}`;
}

/******************** EDITAR TURNO ********************/
async function editarTurno(turnoId) {
  const doc = await db.collection("turnos").doc(turnoId).get();
  if (!doc.exists) return;

  const t = doc.data();

  servicio.value = t.servicio;
  fi.value = t.fi;
  hi.value = t.hi;
  ff.value = t.ff;
  hf.value = t.hf;
  obs.value = "";

  modoEdicion = true;
  turnoEditandoId = turnoId;
  btnGuardar.innerText = "Enviar corrección";
}

/******************** BORRAR TODOS ********************/
btnBorrarTodo.addEventListener("click", async () => {
  if (!confirm("¿Seguro que desea borrar TODOS sus turnos?")) return;

  const snap = await db.collection("turnos")
    .where("uid", "==", usuarioActual.uid)
    .get();

  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();

  cargarTurnosGuarda();
});

/******************** EXPORTAR EXCEL ********************/
btnExcel.addEventListener("click", () => {
  const tabla = document.getElementById("tabla");
  const wb = XLSX.utils.table_to_book(tabla);
  XLSX.writeFile(wb, "Mis_Turnos.xlsx");
});

/******************** LIMPIAR ********************/
function limpiarFormulario() {
  servicio.value = "";
  fi.value = "";
  hi.value = "";
  ff.value = "";
  hf.value = "";
  obs.value = "";
}
