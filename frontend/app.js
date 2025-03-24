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
const scanningIndicator = document.getElementById("scanning-indicator"); // Indicador de escaneo
const overlay = document.getElementById("overlay"); // Fondo oscuro para el popup
const btnDetenerCamara = document.getElementById("btn-detener-camara"); // Botón para detener la cámara
const btnReiniciar = document.getElementById("btn-reiniciar"); // Botón para reiniciar el escaneo
const cameraError = document.getElementById("camera-error"); // Mensaje de error de la cámara

let isScanning = true; // Controla si se sigue escaneando
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
        cameraError.style.display = "block"; // Mostrar mensaje de error
    });

// Función para escanear el QR
let animationFrameId = null; // Variable para almacenar el ID de la animación

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
    animationFrameId = requestAnimationFrame(tick); // Almacenar el ID de la animación
}

// Función para detener el bucle de escaneo
function stopScanning() {
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId); // Detener el bucle de escaneo
        animationFrameId = null;
    }
    isScanning = false; // Restablecer el estado de escaneo
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

                    // Mostrar la imagen del código QR si está disponible
                    const qrImage = document.getElementById("qr-image");
                    if (invitadoEncontrado.qrImageUrl) {
                        qrImage.src = invitadoEncontrado.qrImageUrl; // Establecer la URL de la imagen
                        qrImage.style.display = "block"; // Mostrar la imagen
                    } else {
                        qrImage.style.display = "none"; // Ocultar la imagen si no hay URL
                    }

                    if (!invitadoEncontrado.Escaneado) {
                        alert("Código QR correcto"); // Mensaje cuando se escanea por primera vez
                        actualizarEstadoMesa(numeroMesa, invitado, true); // Cambiar a "Escaneado: true"
                    } else {
                        alert("Código QR ya ha sido escaneado"); // Mensaje cuando ya está escaneado
                    }
                } else {
                    result.innerText = `Invitado no válido en la mesa ${numeroMesa}.`;
                    qrImage.style.display = "none"; // Ocultar la imagen si el invitado no es válido
                }
            } else {
                result.innerText = `Mesa no válida: ${numeroMesa}`;
                qrImage.style.display = "none"; // Ocultar la imagen si la mesa no es válida
            }
        }, { onlyOnce: true }); // Escuchar solo una vez para evitar múltiples alertas
    } catch (error) {
        console.error("Error al decodificar el código QR:", error);
        result.innerText = "Código QR no válido o formato incorrecto.";

        // Ocultar la imagen del código QR si hay un error
        const qrImage = document.getElementById("qr-image");
        qrImage.style.display = "none";
    } finally {
        isScanning = true; // Restablecer el escaneo
    }
}

// Función para actualizar el estado de la mesa
function actualizarEstadoMesa(numeroMesa, invitado, escaneado) {
    const mesaRef = ref(database, `mesas/${numeroMesa}/invitados`);
    get(mesaRef).then((snapshot) => {
        if (snapshot.exists()) {
            const invitados = snapshot.val();
            const invitadoIndex = invitados.findIndex((inv) => inv.nombre === invitado);

            if (invitadoIndex !== -1) {
                invitados[invitadoIndex].Escaneado = escaneado; // Actualizar el campo "Escaneado"
                set(mesaRef, invitados)
                    .then(() => {
                        console.log(`Mesa ${numeroMesa} (${invitado}) marcada como ${escaneado ? "escaneado" : "no escaneado"}.`);
                        mostrarEstadoMesas(); // Actualizar la lista de mesas
                    })
                    .catch((error) => {
                        console.error("Error al actualizar la mesa:", error);
                    });
            }
        }
    });
}

// Función para mostrar/ocultar el estado de las mesas
btnMostrarMesas.addEventListener("click", () => {
    if (mesasContainer.style.display === "none") {
        // Mostrar la lista de invitados
        mesasContainer.style.display = "block";
        btnMostrarMesas.innerText = "Ocultar Lista de Invitados"; // Cambiar el texto del botón
        mostrarEstadoMesas(); // Actualizar la lista de mesas
    } else {
        // Ocultar la lista de invitados
        mesasContainer.style.display = "none";
        btnMostrarMesas.innerText = "Mostrar Lista de Invitados"; // Cambiar el texto del botón
    }
});

// Botón para detener la cámara
btnDetenerCamara.addEventListener("click", () => {
    stopCamera(); // Detener la cámara
    btnDetenerCamara.disabled = true; // Deshabilitar el botón "Detener Cámara"
    scanningIndicator.innerText = "Cámara apagada, reinicia el escaneo"; // Cambiar el texto del indicador
    scanningIndicator.style.backgroundColor = "rgba(255, 0, 0, 0.5)"; // Cambiar el color de fondo a rojo

    // Ocultar la imagen del código QR
    const qrImage = document.getElementById("qr-image");
    qrImage.style.display = "none";

    // Limpiar el texto "Mesa escaneada:" e "Invitado:"
    result.innerText = "";
});

// Botón para reiniciar el escaneo
btnReiniciar.addEventListener("click", () => {
    stopCamera(); // Detener la cámara
    startCamera(); // Reiniciar la cámara
    btnDetenerCamara.disabled = false; // Habilitar el botón "Detener Cámara"
    result.innerText = ""; // Limpiar el resultado anterior
    videoContainer.classList.remove("detected"); // Restablecer el borde
    scanningIndicator.innerText = "Escaneando..."; // Restaurar el texto del indicador
    scanningIndicator.style.backgroundColor = "rgba(0, 0, 0, 0.5)"; // Restaurar el color de fondo

    // Ocultar la imagen del código QR
    const qrImage = document.getElementById("qr-image");
    qrImage.style.display = "none";
});

// Función para detener la cámara
function stopCamera() {
    if (video.srcObject) {
        const stream = video.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop()); // Detener todas las pistas de la cámara
        video.srcObject = null; // Limpiar el objeto de la cámara
    }
}

function startCamera() {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
        .then(function(stream) {
            video.srcObject = stream;
            video.play();
            isScanning = true; // Habilitar el escaneo
            tick(); // Iniciar el bucle de escaneo
        })
        .catch(function(err) {
            console.error("Error al acceder a la cámara:", err);
            cameraError.style.display = "block"; // Mostrar mensaje de error
        });
}

// Función para mostrar el estado de las mesas
function mostrarEstadoMesas() {
    const mesasRef = ref(database, "mesas");
    onValue(mesasRef, (snapshot) => {
        const mesas = snapshot.val();
        const tbody = mesasList.querySelector("tbody");
        tbody.innerHTML = ""; // Limpiar la tabla antes de agregar los nuevos datos

        if (mesas) {
            const mesasArray = Object.keys(mesas).map((mesa) => ({
                numeroMesa: mesa,
                invitados: mesas[mesa].invitados
            }));

            mesasArray.sort((a, b) => parseInt(a.numeroMesa, 10) - parseInt(b.numeroMesa, 10));

            mesasArray.forEach((mesa) => {
                if (mesa.invitados && mesa.invitados.length > 0) {
                    mesa.invitados.forEach((invitado) => {
                        // Usar el campo "Escaneado" en lugar de "ocupada"
                        const escaneado = invitado.Escaneado !== undefined ? invitado.Escaneado : false;
                        const estado = escaneado ? "Escaneado" : "No escaneado";
                        const color = escaneado ? "green" : "red"; // Cambiar colores según el estado

                        const row = document.createElement("tr");
                        row.innerHTML = `
                            <td style="border: 1px solid #ccc; padding: 10px;">${mesa.numeroMesa}</td>
                            <td style="border: 1px solid #ccc; padding: 10px;">${invitado.nombre}</td>
                            <td style="border: 1px solid #ccc; padding: 10px; background-color: ${color}; color: white;">${estado}</td>
                        `;
                        tbody.appendChild(row);
                    });
                } else {
                    // Si no hay invitados en la mesa
                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <td style="border: 1px solid #ccc; padding: 10px;">${mesa.numeroMesa}</td>
                        <td style="border: 1px solid #ccc; padding: 10px;">Sin invitados</td>
                        <td style="border: 1px solid #ccc; padding: 10px; background-color: gray; color: white;">No escaneado</td>
                    `;
                    tbody.appendChild(row);
                }
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align: center;">No hay mesas generadas.</td></tr>`;
        }
    });
}

// Iniciar la cámara al cargar la página
startCamera();
btnDetenerCamara.disabled = false; // Habilitar el botón "Detener Cámara"
scanningIndicator.innerText = "Escaneando..."; // Mostrar el texto inicial
scanningIndicator.style.backgroundColor = "rgba(0, 0, 0, 0.5)"; // Color de fondo inicial

// Detener el bucle de escaneo al recargar la página
window.addEventListener("beforeunload", () => {
    stopScanning(); // Detener el bucle de escaneo
    stopCamera(); // Detener la cámara
});