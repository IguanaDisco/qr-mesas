import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, set, onValue, get } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

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
const videoContainer = document.getElementById("video-container");
const scanningIndicator = document.getElementById("scanning-indicator");
const overlay = document.getElementById("overlay");
const btnDetenerCamara = document.getElementById("btn-detener-camara");
const btnReiniciar = document.getElementById("btn-reiniciar");
const cameraError = document.getElementById("camera-error");

let isScanning = true; // Controla si se sigue escaneando
let mesaEscaneada = null; // Almacena la mesa escaneada

// Función para iniciar la cámara
function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(function(stream) {
            video.srcObject = stream;
            video.play();
            isScanning = true; // Habilitar el escaneo
            requestAnimationFrame(tick); // Reiniciar el bucle de escaneo
        })
        .catch(function(err) {
            console.error("Error al acceder a la cámara:", err);
            cameraError.style.display = "block"; // Mostrar mensaje de error
        });
}

// Función para detener la cámara
function stopCamera() {
    if (video.srcObject) {
        const stream = video.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop()); // Detener todas las pistas de la cámara
        video.srcObject = null; // Limpiar el objeto de la cámara
    }
}

// Función para escanear el QR
function tick() {
    if (!isScanning) {
        scanningIndicator.style.display = "none"; // Ocultar indicador si no se está escaneando
        return;
    }

    scanningIndicator.style.display = "block"; // Mostrar indicador mientras se escanea

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.height = video.videoHeight;
        canvas.width = video.videoWidth;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
        });

        if (code) {
            isScanning = false; // Detener el escaneo temporalmente
            const data = code.data;
            videoContainer.classList.add("detected");
            verificarExistenciaMesa(data);
        } else {
            videoContainer.classList.remove("detected");
        }
    }
    requestAnimationFrame(tick);
}

// Función para verificar si la mesa existe en la base de datos
function verificarExistenciaMesa(data) {
    result.innerText = "Procesando código QR..."; // Indicador visual

    try {
        const { numeroMesa, invitado } = JSON.parse(data);

        if (!numeroMesa || !invitado) {
            throw new Error("El código QR no contiene la información necesaria.");
        }

        const mesaRef = ref(database, `mesas/${numeroMesa}/invitados`);
        onValue(mesaRef, (snapshot) => {
            if (snapshot.exists()) {
                const invitados = snapshot.val();
                const invitadoEncontrado = invitados.find((inv) => inv.nombre === invitado);

                if (invitadoEncontrado) {
                    result.innerText = `Mesa escaneada: ${numeroMesa}\nInvitado: ${invitadoEncontrado.nombre}`;
                    alert("Código QR correcto");

                    if (!invitadoEncontrado.ocupada) {
                        actualizarEstadoMesa(numeroMesa, invitado, true);
                    } else {
                        result.innerText += "\nEl invitado ya está ocupado.";
                    }
                } else {
                    result.innerText = `Invitado no válido en la mesa ${numeroMesa}.`;
                }
            } else {
                result.innerText = `Mesa no válida: ${numeroMesa}`;
            }
        });
    } catch (error) {
        console.error("Error al decodificar el código QR:", error);
        result.innerText = "Código QR no válido o formato incorrecto.";
    } finally {
        isScanning = true; // Restablecer el escaneo
    }
}

// Función para actualizar el estado de la mesa
function actualizarEstadoMesa(numeroMesa, invitado, ocupada) {
    const mesaRef = ref(database, `mesas/${numeroMesa}/invitados`);
    get(mesaRef).then((snapshot) => {
        if (snapshot.exists()) {
            const invitados = snapshot.val();
            const invitadoIndex = invitados.findIndex((inv) => inv.nombre === invitado);

            if (invitadoIndex !== -1) {
                invitados[invitadoIndex].ocupada = ocupada;
                set(mesaRef, invitados)
                    .then(() => {
                        console.log(`Mesa ${numeroMesa} (${invitado}) marcada como ${ocupada ? "ocupada" : "disponible"}.`);
                        mostrarEstadoMesas();
                    })
                    .catch((error) => {
                        console.error("Error al actualizar la mesa:", error);
                    });
            }
        }
    });
}

// Botón para reiniciar el escaneo
btnReiniciar.addEventListener("click", () => {
    stopCamera(); // Detener la cámara
    startCamera(); // Reiniciar la cámara
    result.innerText = ""; // Limpiar el resultado anterior
    videoContainer.classList.remove("detected"); // Restablecer el borde
});

// Iniciar la cámara al cargar la página
startCamera();