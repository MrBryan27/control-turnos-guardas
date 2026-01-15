document.addEventListener("DOMContentLoaded", () => {

  /* ========= CONFIG ========= */
  const VALOR_HORA = 8775;
  let esAdmin = false;
  const usuariosCache = {};

  /* ========= ELEMENTOS ========= */
  const servicio = document.getElementById("servicio");
  const fi = document.getElementById("fi");
  const hi = document.getElementById("hi");
  const ff = document.getElementById("ff");
  const hf = document.getElementById("hf");
  const tablaBody = document.querySelector("#tabla tbody");

  const btnGuardar = document.getElementById("btnGuardar");
  const btnLogout = document.getElementById("btnLogout");

  const filtroAdmin = document.getElementById("filtroAdmin");
const filtroGuarda = document.getElementById("filtroGuarda");
const btnBorrarTodos = document.getElementById("btnBorrarTodos");
btnBorrarTodos.addEventListener("click", borrarTodosMisTurnos);



  /* ========= CERRAR SESIÓN ========= */
  btnLogout.addEventListener("click", async () => {
    await auth.signOut();
    window.location.href = "index.html";
  });

  /* ========= GUARDAR TURNO ========= */
  btnGuardar.addEventListener("click", async () => {
    const user = auth.currentUser;
    if (!user) return alert("No autenticado");

    if (!servicio.value || !fi.value || !hi.value || !ff.value || !hf.value) {
      return alert("Complete todos los campos");
    }

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
      creado: firebase.firestore.FieldValue.serverTimestamp()
    });

    servicio.value = fi.value = hi.value = ff.value = hf.value = "";
    cargarTurnos();
  });

  /* ========= OBTENER USUARIO SEGURO ========= */
  async function obtenerUsuario(uid) {
    if (usuariosCache[uid]) return usuariosCache[uid];

    const doc = await db.collection("usuarios").doc(uid).get();

    const usuario = doc.exists
      ? doc.data()
      : { nombreCompleto: "SIN PERFIL", cedula: "" };

    usuariosCache[uid] = usuario;
    return usuario;
  }

  /* ========= CARGAR TURNOS ========= */
 async function cargarTurnos() {
  const user = auth.currentUser;
  if (!user) return;

  tablaBody.innerHTML = "";

  let query = db.collection("turnos");

  // 👮 ADMIN
  if (esAdmin) {
    if (filtroGuarda.value) {
      query = query.where("uid", "==", filtroGuarda.value);
    }
  } 
  // 👷 GUARDA
  else {
    query = query.where("uid", "==", user.uid);
  }

  const snap = await query.orderBy("creado", "desc").get();

  for (const d of snap.docs) {
    const t = d.data();
    const u = await obtenerUsuario(t.uid);

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
        <td>
          <button onclick="borrarTurno('${d.id}')">🗑️</button>
        </td>
      </tr>
    `;
  }
}

  /* ========= BORRAR TURNO ========= */
  window.borrarTurno = async (id) => {
    if (!confirm("¿Eliminar turno?")) return;
    await db.collection("turnos").doc(id).delete();
    cargarTurnos();
  };

  async function cargarGuardas() {
  const snap = await db.collection("usuarios").get();

  filtroGuarda.innerHTML = `<option value="">Todos</option>`;

  snap.forEach(doc => {
    const u = doc.data();

    // solo mostrar guardas (no admins)
    if (u.rol === "guarda") {
      filtroGuarda.innerHTML += `
        <option value="${doc.id}">
          ${u.nombreCompleto} - ${u.cedula}
        </option>
      `;
    }
  });
}

async function borrarTodosMisTurnos() {
  const user = auth.currentUser;
  if (!user) return;

  const confirmar = confirm(
    "⚠️ Esta acción eliminará TODOS tus turnos.\n\n¿Deseas continuar?"
  );

  if (!confirmar) return;

  try {
    const snap = await db.collection("turnos")
      .where("uid", "==", user.uid)
      .get();

    if (snap.empty) {
      alert("No tienes turnos para borrar");
      return;
    }

    const batch = db.batch();

    snap.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    alert("✅ Todos tus turnos fueron eliminados");
    cargarTurnos();

  } catch (error) {
    console.error(error);
    alert("❌ Error al borrar los turnos");
  }
}



  /* ========= AUTH ========= */
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

  if (esAdmin) {
  btnBorrarTodos.style.display = "none";
}


    cargarTurnos();
  });

});



