import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, set, onValue } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA6FZFTvpxkrOrgw1Z0JEdmgrmvk90d6Uw",
    authDomain: "qr-invitacion.firebaseapp.com",
    databaseURL: "https://qr-invitacion-default-rtdb.firebaseio.com",
    projectId: "qr-invitacion",
    storageBucket: "qr-invitacion.firebasestorage.app",
    messagingSenderId: "124413297394",
    appId: "1:124413297394:web:ff5ff4d6f1fcc0a442466b",
    measurementId: "G-YTTBK2K02V"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Elementos del DOM
const video = document.getElementById("video");
const canvas = document.getElementById("canvas");
const context = canvas.getContext("2d");
const result = document.getElementById("result");
const popup = document.getElementById("popup");
const popupMesa = document.getElementById("popup-mesa");
const btnSi = document.getElementById("btn-si");
const btnNo = document.getElementById("btn-no");
const btnMostrarMesas = document.getElementById("btn-mostrar-mesas");
const mesasContainer = document.getElementById("mesas-container");
const mesasList = document.getElementById("mesas-list");
const videoContainer = document.getElementById("video-container"); // Contenedor de la cámara

let mesaEscaneada = null; // Almacena la mesa escaneada

// Acceder a la cámara
navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
    .then(function(stream) {
        video.srcObject = stream;
        video.play();
        requestAnimationFrame(tick);
    })
    .catch(function(err) {
        console.error("Error al acceder a la cámara:", err);
    });

// Función para escanear el QR
function tick() {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });

        if (code) {
            const data = code.data; // Obtener los datos del código QR
            // Cambiar el borde a verde cuando se detecta un código QR
            videoContainer.classList.add("detected");
            // Verificar si la mesa escaneada existe en la base de datos
            verificarExistenciaMesa(data);
        } else {
            // Cambiar el borde a rojo cuando no se detecta un código QR
            videoContainer.classList.remove("detected");
        }
    }
    requestAnimationFrame(tick);
}

// Función para verificar si la mesa existe en la base de datos
function verificarExistenciaMesa(data) {
    try {
        const { numeroMesa, invitado } = JSON.parse(data); // Decodificar los datos del QR

        const mesaRef = ref(database, `mesas/${numeroMesa}/invitados`);
        onValue(mesaRef, (snapshot) => {
            if (snapshot.exists()) { // Si la mesa existe
                const invitados = snapshot.val(); // Obtener los datos de Firebase
                const invitadoEncontrado = invitados.find((inv) => inv.nombre === invitado);

                if (invitadoEncontrado) {
                    console.log("Código QR válido. Mostrando alerta..."); // Depuración
                    result.innerText = `Mesa escaneada: ${numeroMesa}\nInvitado: ${invitadoEncontrado.nombre}`;

                    // Mostrar una alerta nativa
                    alert("Código QR correcto");

                    // Si el invitado no está ocupado, marcarlo como ocupado automáticamente
                    if (!invitadoEncontrado.ocupada) {
                        actualizarEstadoMesa(numeroMesa, invitado, true); // Cambiar a ocupada
                    } else {
                        result.innerText += "\nEl invitado ya está ocupado.";
                    }
                } else {
                    console.log("Invitado no válido."); // Depuración
                    result.innerText = `Invitado no válido en la mesa ${numeroMesa}.`;
                }
            } else {
                console.log("Mesa no válida."); // Depuración
                result.innerText = `Mesa no válida: ${numeroMesa}`;
            }
        });
    } catch (error) {
        console.error("Error al decodificar el código QR:", error);
        result.innerText = "Código QR no válido.";
    }
}

function actualizarEstadoMesa(numeroMesa, invitado, ocupada) {
    const mesaRef = ref(database, `mesas/${numeroMesa}/invitados`);
    onValue(mesaRef, (snapshot) => {
        if (snapshot.exists()) {
            const invitados = snapshot.val(); // Obtener la lista de invitados
            const invitadoIndex = invitados.findIndex((inv) => inv.nombre === invitado);

            if (invitadoIndex !== -1) {
                invitados[invitadoIndex].ocupada = ocupada; // Actualizar el estado del invitado
                set(mesaRef, invitados) // Guardar los cambios en Firebase
                    .then(() => {
                        console.log(`Mesa ${numeroMesa} (${invitado}) marcada como ${ocupada ? "ocupada" : "disponible"}.`);
                        mostrarEstadoMesas(); // Actualizar la lista de mesas
                    })
                    .catch((error) => {
                        console.error("Error al actualizar la mesa:", error);
                    });
            }
        }
    }, { onlyOnce: true }); // Escuchar solo una vez para evitar múltiples llamadas
}

// Función para mostrar/ocultar el estado de las mesas
btnMostrarMesas.addEventListener("click", () => {
    if (mesasContainer.style.display === "none") {
        mesasContainer.style.display = "block"; // Mostrar la lista
        mostrarEstadoMesas(); // Actualizar la lista
    } else {
        mesasContainer.style.display = "none"; // Ocultar la lista
    }
});

// Función para mostrar el estado de las mesas
function mostrarEstadoMesas() {
    const mesasRef = ref(database, "mesas");
    onValue(mesasRef, (snapshot) => {
        const mesas = snapshot.val(); // Obtener los datos de las mesas
        mesasList.innerHTML = ""; // Limpiar la lista antes de agregar los nuevos datos

        if (mesas) {
            // Convertir las mesas en un array y ordenarlas numéricamente
            const mesasArray = Object.keys(mesas).map((mesa) => ({
                numeroMesa: mesa,
                invitados: mesas[mesa].invitados
            }));

            // Ordenar las mesas numéricamente
            mesasArray.sort((a, b) => {
                const numeroA = parseInt(a.numeroMesa, 10);
                const numeroB = parseInt(b.numeroMesa, 10);
                return numeroA - numeroB;
            });

            // Mostrar las mesas ordenadas
            mesasArray.forEach((mesa) => {
                if (mesa.invitados && mesa.invitados.length > 0) {
                    mesa.invitados.forEach((invitado) => {
                        const estado = invitado.ocupada ? "Ocupada" : "Disponible";
                        const color = invitado.ocupada ? "red" : "green"; // Asignar color según el estado

                        // Crear un elemento para mostrar la mesa
                        const mesaElement = document.createElement("div");
                        mesaElement.innerHTML = `<strong>Mesa ${mesa.numeroMesa}:</strong> ${invitado.nombre} - ${estado}`;
                        mesaElement.style.color = "white"; // Texto en blanco para mejor contraste
                        mesaElement.style.backgroundColor = color; // Fondo rojo o verde
                        mesaElement.style.padding = "10px"; // Espaciado interno
                        mesaElement.style.marginBottom = "5px"; // Margen inferior
                        mesaElement.style.borderRadius = "5px"; // Bordes redondeados

                        mesasList.appendChild(mesaElement); // Agregar la mesa a la lista
                    });
                } else {
                    // Si no hay invitados en la mesa
                    const mesaElement = document.createElement("div");
                    mesaElement.innerHTML = `<strong>Mesa ${mesa.numeroMesa}:</strong> Sin invitados`;
                    mesaElement.style.color = "white";
                    mesaElement.style.backgroundColor = "gray"; // Fondo gris para mesas sin invitados
                    mesaElement.style.padding = "10px";
                    mesaElement.style.marginBottom = "5px";
                    mesaElement.style.borderRadius = "5px";

                    mesasList.appendChild(mesaElement);
                }
            });
        } else {
            mesasList.innerHTML = "<div>No hay mesas generadas.</div>";
        }
    });
}

// hola