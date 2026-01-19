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
    const cred = await auth.signInWithEmailAndPassword(
      loginEmail.value,
      loginPassword.value
    );

    const uid = cred.user.uid;

    const doc = await db.collection("usuarios").doc(uid).get();

    if (!doc.exists) {
      alert("Perfil no encontrado");
      return;
    }

    const rol = doc.data().rol;

    // 🔁 REDIRECCIÓN POR ROL
    if (rol === "admin") {
      window.location.href = "admin.html";
    } 
    else if (rol === "supervisor") {
      window.location.href = "supervisor.html";
    } 
    else {
      window.location.href = "turnos.html"; // guarda
    }

  } catch (error) {
    alert(error.message);
  }
};


// ================= REGISTRO =================
// btnRegistrar.onclick = async () => {
//   try {
//     // validar cédula única
//     const existe = await db
//       .collection("usuarios")
//       .where("cedula", "==", regCedula.value)
//       .get();

//     if (!existe.empty) {
//       alert("La cédula ya está registrada");
//       return;
//     }

//     // crear usuario auth
//     const cred = await auth.createUserWithEmailAndPassword(
//       regEmail.value,
//       regPassword.value
//     );

//     // ⬅️ ESPERAMOS a que auth esté listo
//     auth.onAuthStateChanged(async user => {
//       if (!user) return;

//       await db.collection("usuarios").doc(user.uid).set({
//         nombreCompleto: regNombre.value,
//         cedula: regCedula.value,
//         email: regEmail.value,
//         rol: "guarda",
//         creado: firebase.firestore.FieldValue.serverTimestamp()
//       });

//       alert("Registro exitoso");
//       registroBox.style.display = "none";
//       loginBox.style.display = "block";
//     });

//   } catch (e) {
//     alert(e.message);
//   }
// };
btnRegistrar.onclick = async () => {
  try {
    const nombre = regNombre.value.trim();
    const cedula = regCedula.value.trim();
    const email = regEmail.value.trim();
    const password = regPassword.value;

    if (!nombre || !cedula || !email || !password) {
      alert("Complete todos los campos");
      return;
    }

    // 1️⃣ Crear usuario en Auth
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    const uid = cred.user.uid;

    // 2️⃣ Crear perfil en Firestore (MISMO UID)
    await db.collection("usuarios").doc(uid).set({
      nombreCompleto: nombre,
      cedula,
      email,
      rol: "guarda", // o guarda / admin
      creado: firebase.firestore.FieldValue.serverTimestamp()
    });

    alert("Usuario registrado correctamente");
    window.location.href = "index.html";

  } catch (error) {
    console.error(error);
    alert(error.message);
  }
};
