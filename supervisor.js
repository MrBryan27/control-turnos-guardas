const tablaBody = document.querySelector("#tabla tbody");
const btnLogout = document.getElementById("btnLogout");

/* ================= CERRAR SESIÓN ================= */
btnLogout.addEventListener("click", async () => {
  await auth.signOut();
  window.location.href = "index.html";
});

/* ================= CONTROL DE SESIÓN ================= */
auth.onAuthStateChanged(async user => {
  if (!user) {
    window.location.href = "index.html";
    return;
  }

  const perfil = await db.collection("usuarios").doc(user.uid).get();

  if (!perfil.exists || perfil.data().rol !== "supervisor") {
    alert("Acceso no autorizado");
    window.location.href = "index.html";
    return;
  }

  cargarTurnosSupervisor();
});

/* ================= CARGAR TURNOS SUPERVISOR ================= */
async function cargarTurnosSupervisor() {
  tablaBody.innerHTML = "";

  const snap = await db.collection("turnos")
    .where("estado", "in", ["pendiente_supervisor", "rechazado_admin"])
    .orderBy("creado", "desc")
    .get();

  for (const doc of snap.docs) {
    const t = doc.data();

    const uDoc = await db.collection("usuarios").doc(t.uid).get();
    const u = uDoc.exists
      ? uDoc.data()
      : { nombreCompleto: "Desconocido", cedula: "" };

    /* ===== COMENTARIOS ===== */
    let comentarioGuardaHTML = "";
    if (t.comentarioGuarda) {
      comentarioGuardaHTML = `
        <div style="margin-top:5px;color:#2563eb">
          <strong>Guarda:</strong> ${t.comentarioGuarda}
        </div>
      `;
    }

    let comentarioAdminHTML = "";
    if (t.estado === "rechazado_admin" && t.comentarioAdmin) {
      comentarioAdminHTML = `
        <div style="margin-top:5px;color:#b91c1c">
          <strong>Admin:</strong> ${t.comentarioAdmin}
        </div>
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
        <td>
          ${comentarioGuardaHTML}
          ${comentarioAdminHTML}
          <input
            type="text"
            id="comentario-${doc.id}"
            placeholder="Comentario del supervisor"
            value="${t.comentarioSupervisor || ""}"
            style="margin-top:6px;width:100%;"
          >
        </td>
        <td>
          <button onclick="aprobarSupervisor('${doc.id}')">✔️</button>
          <button onclick="rechazarSupervisor('${doc.id}')">❌</button>
        </td>
      </tr>
    `;
  }
}

/* ================= APROBAR (AL ADMIN) ================= */
async function aprobarSupervisor(turnoId) {
  const comentario = document
    .getElementById(`comentario-${turnoId}`)
    .value
    .trim();

  await db.collection("turnos").doc(turnoId).update({
    estado: "aprobado_supervisor",
    comentarioSupervisor: comentario || "Turno validado por supervisor",
    fechaRevisionSupervisor: firebase.firestore.FieldValue.serverTimestamp()
  });

  cargarTurnosSupervisor();
}

/* ================= RECHAZAR (AL GUARDA) ================= */
async function rechazarSupervisor(turnoId) {
  const comentario = document
    .getElementById(`comentario-${turnoId}`)
    .value
    .trim();

  if (!comentario) {
    alert("Debe indicar el motivo del rechazo");
    return;
  }

  await db.collection("turnos").doc(turnoId).update({
    estado: "rechazado_supervisor",
    comentarioSupervisor: comentario,
    fechaRevisionSupervisor: firebase.firestore.FieldValue.serverTimestamp()
  });

  cargarTurnosSupervisor();
}
