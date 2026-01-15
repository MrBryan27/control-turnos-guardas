// firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyBh5qVIjc2uubqnxwsq_-FEV339gN9l7jk",
  authDomain: "control-turnos-guardas.firebaseapp.com",
  projectId: "control-turnos-guardas"
};

// EVITA inicializar dos veces
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const auth = firebase.auth();
const db = firebase.firestore();
