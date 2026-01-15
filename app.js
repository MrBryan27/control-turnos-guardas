// ================= ELEMENTOS =================
const loginBox = document.getElementById("loginBox");
const registroBox = document.getElementById("registroBox");

const loginEmail = document.getElementById("loginEmail");
const loginPassword = document.getElementById("loginPassword");

const regNombre = document.getElementById("regNombre");
const regCedula = document.getElementById("regCedula");
const regEmail = document.getElementById("regEmail");
const regPassword = document.getElementById("regPassword");

const btnLogin = document.getElementById("btnLogin");
const btnRegistrar = document.getElementById("btnRegistrar");
const btnMostrarRegistro = document.getElementById("btnMostrarRegistro");
const btnVolverLogin = document.getElementById("btnVolverLogin");

// ================= UI =================
btnMostrarRegistro.onclick = () => {
  loginBox.style.display = "none";
  registroBox.style.display = "block";
};

btnVolverLogin.onclick = () => {
  registroBox.style.display = "none";
  loginBox.style.display = "block";
};

// ================= LOGIN =================
btnLogin.onclick = async () => {
  try {
    await auth.signInWithEmailAndPassword(
      loginEmail.value,
      loginPassword.value
    );
    window.location.href = "turnos.html";
  } catch (e) {
    alert(e.message);
  }
};

// ================= REGISTRO =================
btnRegistrar.onclick = async () => {
  try {
    // validar cédula única
    const existe = await db
      .collection("usuarios")
      .where("cedula", "==", regCedula.value)
      .get();

    if (!existe.empty) {
      alert("La cédula ya está registrada");
      return;
    }

    // crear usuario auth
    const cred = await auth.createUserWithEmailAndPassword(
      regEmail.value,
      regPassword.value
    );

    // ⬅️ ESPERAMOS a que auth esté listo
    auth.onAuthStateChanged(async user => {
      if (!user) return;

      await db.collection("usuarios").doc(user.uid).set({
        nombreCompleto: regNombre.value,
        cedula: regCedula.value,
        email: regEmail.value,
        rol: "guarda",
        creado: firebase.firestore.FieldValue.serverTimestamp()
      });

      alert("Registro exitoso");
      registroBox.style.display = "none";
      loginBox.style.display = "block";
    });

  } catch (e) {
    alert(e.message);
  }
};
