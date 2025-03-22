import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getDatabase, ref, set, onValue, remove, get } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-database.js";

// Configuración de Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA6FZFTvpxkrOrgw1Z0JEdmgrmvk90d6Uw",
    authDomain: "qr-invitacion.firebaseapp.com",
    databaseURL: "https://qr-invitacion-default-rtdb.firebaseio.com",
    projectId: "qr-invitacion",
    storageBucket: "qr-invitacion.appspot.com",
    messagingSenderId: "124413297394",
    appId: "1:124413297394:web:ff5ff4d6f1fcc0a442466b",
    measurementId: "G-YTTBK2K02V"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Elementos del DOM
const qrForm = document.getElementById("qr-form");
const numeroMesaInput = document.getElementById("numero-mesa");
const invitadoInput = document.getElementById("invitado");
const fechaFiestaInput = document.getElementById("fecha-fiesta");
const horaFiestaInput = document.getElementById("hora-fiesta");
const qrCodeDiv = document.getElementById("qr-code");
const invitacionContainer = document.getElementById("invitacion-container");
const invitacionTexto = document.getElementById("invitacion-texto");
const enviarWhatsApp = document.getElementById("enviar-whatsapp");
const mesasTable = document.getElementById("mesas-table");

// Función para subir la imagen a ImgBB
async function subirImagenABb(blob) {
    const apiKey = "d21141fdef835475e74983b1b28829df"; // Reemplaza con tu API Key de ImgBB
    const formData = new FormData();
    formData.append("image", blob);

    try {
        const response = await fetch(`https://api.imgbb.com/1/upload?key=${apiKey}`, {
            method: "POST",
            body: formData,
        });

        if (!response.ok) {
            throw new Error(`Error al subir la imagen: ${response.statusText}`);
        }

        const data = await response.json();
        return data.data.url; // URL pública de la imagen
    } catch (error) {
        console.error("Error en subirImagenABb:", error);
        alert("Hubo un error al subir la imagen. Inténtalo de nuevo.");
        return null;
    }
}

// Función para generar el código QR y la invitación
async function generarQR(numeroMesa, invitado, fechaFiesta, horaFiesta) {
    try {
        console.log("Datos para el código QR:", { numeroMesa, invitado, fechaFiesta, horaFiesta });

        // Generar y subir el código QR
        const qrImageUrl = await generarYSubirQR(numeroMesa, invitado, fechaFiesta, horaFiesta);

        // Guardar los datos en Firebase, incluyendo la URL del código QR
        await guardarMesa(numeroMesa, invitado, qrImageUrl, fechaFiesta, horaFiesta);

        alert("Invitación generada y guardada en Firebase correctamente.");
    } catch (error) {
        console.error("Error en generarQR:", error);
        alert("Hubo un error al generar la invitación. Inténtalo de nuevo.");
    }
}

// Función para generar un código QR y subirlo a ImgBB
async function generarYSubirQR(numeroMesa, invitado, fechaFiesta, horaFiesta) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ numeroMesa, invitado, fechaFiesta, horaFiesta });

        QRCode.toCanvas(data, { width: 200 }, async (err, canvas) => {
            if (err) {
                reject(err);
                return;
            }

            // Convertir el canvas a un blob
            canvas.toBlob(async (blob) => {
                if (!blob) {
                    reject(new Error("No se pudo convertir el canvas a blob."));
                    return;
                }

                // Subir la imagen a ImgBB
                const qrImageUrl = await subirImagenABb(blob);
                if (!qrImageUrl) {
                    reject(new Error("No se pudo subir la imagen a ImgBB."));
                    return;
                }

                resolve(qrImageUrl);
            }, "image/png");
        });
    });
}

// Función para guardar la mesa, el invitado y la URL del QR en Firebase
function guardarMesa(numeroMesa, invitado, qrImageUrl, fechaFiesta, horaFiesta) {
    const mesaRef = ref(database, `mesas/${numeroMesa}/invitados`);
    const nuevoInvitado = {
        nombre: invitado,
        qrImageUrl, // Aquí se guarda la URL del código QR
        fechaFiesta,
        horaFiesta,
        Escaneado: false
    };

    // Obtener la lista actual de invitados
    get(mesaRef).then((snapshot) => {
        let invitados = [];
        if (snapshot.exists()) {
            invitados = snapshot.val();
        }
        invitados.push(nuevoInvitado); // Agregar el nuevo invitado

        // Guardar la lista actualizada en Firebase
        set(mesaRef, invitados)
            .then(() => {
                console.log(`Invitado agregado a la mesa ${numeroMesa}.`);
            })
            .catch((error) => {
                console.error("Error al guardar la mesa:", error);
                alert("Hubo un error al guardar la mesa en Firebase. Inténtalo de nuevo.");
            });
    }).catch((error) => {
        console.error("Error al obtener los datos de Firebase:", error);
        alert("Hubo un error al obtener los datos de Firebase. Inténtalo de nuevo.");
    });
}

// Función para leer el archivo Excel
function leerArchivoExcel(archivo) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array' });
            const primeraHoja = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(primeraHoja, { header: 1 });
            resolve(jsonData);
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(archivo);
    });
}

// Función para procesar los datos del archivo Excel
function procesarDatosExcel(datosExcel) {
    const datosProcesados = [];
    for (let i = 1; i < datosExcel.length; i++) { // Ignorar la primera fila (encabezados)
        const [numeroMesa, invitado] = datosExcel[i];
        if (numeroMesa && invitado) {
            datosProcesados.push({
                numeroMesa,
                invitado,
                Escaneado: false // Agregar el campo "Escaneado"
            });
        }
    }
    return datosProcesados;
}

// Función para cargar los datos en Firebase
async function cargarDatosEnFirebase(datos, fechaFiesta, horaFiesta) {
    for (const { numeroMesa, invitado } of datos) {
        try {
            // Generar y subir el código QR
            const qrImageUrl = await generarYSubirQR(numeroMesa, invitado, fechaFiesta, horaFiesta);

            // Guardar los datos en Firebase
            await guardarMesa(numeroMesa, invitado, qrImageUrl, fechaFiesta, horaFiesta);
            console.log(`Invitado ${invitado} guardado en Firebase.`);
        } catch (error) {
            console.error(`Error al procesar al invitado ${invitado}:`, error);
        }
    }
    alert("Datos cargados correctamente en Firebase.");
}

// Evento para el nuevo formulario de importación de Excel
document.getElementById('form-importar-excel').addEventListener('submit', async (e) => {
    e.preventDefault();

    const archivo = document.getElementById('archivo-excel').files[0];
    const fechaFiesta = document.getElementById('fecha-fiesta-importar').value;
    const horaFiesta = document.getElementById('hora-fiesta-importar').value;

    if (!archivo || !fechaFiesta || !horaFiesta) {
        alert("Por favor, completa todos los campos.");
        return;
    }

    try {
        const datosExcel = await leerArchivoExcel(archivo);
        const datosProcesados = procesarDatosExcel(datosExcel);
        console.log("Datos procesados:", datosProcesados);

        await cargarDatosEnFirebase(datosProcesados, fechaFiesta, horaFiesta);
    } catch (error) {
        console.error("Error al procesar el archivo Excel:", error);
        alert("Hubo un error al procesar el archivo. Inténtalo de nuevo.");
    }
});

// Mostrar el nombre del archivo seleccionado
document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById('archivo-excel');
    const fileNameSpan = document.getElementById('file-name');

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0]; // Obtener el archivo seleccionado
        if (file) {
            fileNameSpan.textContent = file.name; // Mostrar el nombre del archivo
        } else {
            fileNameSpan.textContent = ''; // Limpiar el nombre si no hay archivo
        }
    });
});

// Variables globales para la paginación
let paginaActual = 1;
const registrosPorPagina = 50; // Mostrar 50 registros por página

// Función para mostrar las mesas con paginación
function mostrarMesas(mesas, pagina = 1) {
    const tbody = document.querySelector("#mesas-table tbody");
    tbody.innerHTML = ""; // Limpiar la tabla antes de actualizarla

    // Convertir las claves de las mesas a números y ordenarlas
    const mesasOrdenadas = Object.entries(mesas)
        .map(([numeroMesa, datos]) => ({ numeroMesa: Number(numeroMesa), datos }))
        .sort((a, b) => a.numeroMesa - b.numeroMesa); // Ordenar por número de mesa

    // Calcular el índice de inicio y fin para la paginación
    const inicio = (pagina - 1) * registrosPorPagina;
    const fin = inicio + registrosPorPagina;
    const mesasPaginadas = mesasOrdenadas.slice(inicio, fin);

    // Recorrer las mesas de la página actual
    mesasPaginadas.forEach(({ numeroMesa, datos }) => {
        if (datos.invitados && datos.invitados.length > 0) {
            datos.invitados.forEach((invitado) => {
                const fila = document.createElement("tr");

                // Celda para el número de mesa
                const celdaNumeroMesa = document.createElement("td");
                celdaNumeroMesa.textContent = numeroMesa;
                fila.appendChild(celdaNumeroMesa);

                // Celda para el invitado
                const celdaInvitado = document.createElement("td");
                celdaInvitado.textContent = invitado.nombre;
                fila.appendChild(celdaInvitado);

                // Celda para el estado de escaneado
                const celdaEscaneado = document.createElement("td");
                celdaEscaneado.textContent = invitado.Escaneado ? "Escaneado ✅" : "No escaneado ❌";
                fila.appendChild(celdaEscaneado);

                // Celda para las acciones (MOSTRAR y ELIMINAR)
                const celdaAcciones = document.createElement("td");

                // Botón MOSTRAR
                const botonMostrar = document.createElement("button");
                botonMostrar.textContent = "MOSTRAR";
                botonMostrar.classList.add("boton-mostrar");
                botonMostrar.addEventListener("click", () => {
                    mostrarQR(invitado.qrImageUrl, botonMostrar, {
                        numeroMesa: numeroMesa,
                        invitado: invitado.nombre,
                        fechaFiesta: invitado.fechaFiesta,
                        horaFiesta: invitado.horaFiesta
                    });
                });
                celdaAcciones.appendChild(botonMostrar);

                // Botón ELIMINAR
                const botonEliminar = document.createElement("button");
                botonEliminar.textContent = "Eliminar";
                botonEliminar.classList.add("boton-eliminar");
                botonEliminar.addEventListener("click", () => eliminarInvitado(numeroMesa, invitado.nombre));
                celdaAcciones.appendChild(botonEliminar);

                // Agregar la celda de acciones a la fila
                fila.appendChild(celdaAcciones);

                // Agregar la fila a la tabla
                tbody.appendChild(fila);
            });
        }
    });

    // Actualizar los controles de paginación
    actualizarPaginacion(mesasOrdenadas.length, pagina);
}

// Función para actualizar los controles de paginación
function actualizarPaginacion(totalRegistros, paginaActual) {
    const totalPaginas = Math.ceil(totalRegistros / registrosPorPagina);
    const paginacionContainer = document.getElementById("paginacion-container");

    if (!paginacionContainer) {
        console.error("El contenedor de paginación no existe en el DOM.");
        return;
    }

    // Limpiar los controles de paginación anteriores
    paginacionContainer.innerHTML = "";

    // Botón "Anterior"
    const botonAnterior = document.createElement("button");
    botonAnterior.textContent = "Anterior";
    botonAnterior.disabled = paginaActual === 1;
    botonAnterior.addEventListener("click", () => {
        if (paginaActual > 1) {
            paginaActual--;
            mostrarMesas(mesasGlobales, paginaActual); // mesasGlobales se define más abajo
        }
    });
    paginacionContainer.appendChild(botonAnterior);

    // Botón "Siguiente"
    const botonSiguiente = document.createElement("button");
    botonSiguiente.textContent = "Siguiente";
    botonSiguiente.disabled = paginaActual === totalPaginas;
    botonSiguiente.addEventListener("click", () => {
        if (paginaActual < totalPaginas) {
            paginaActual++;
            mostrarMesas(mesasGlobales, paginaActual); // mesasGlobales se define más abajo
        }
    });
    paginacionContainer.appendChild(botonSiguiente);

    // Mostrar el número de página actual
    const paginaInfo = document.createElement("span");
    paginaInfo.textContent = `Página ${paginaActual} de ${totalPaginas}`;
    paginacionContainer.appendChild(paginaInfo);
}

// Variable global para almacenar los datos de las mesas
let mesasGlobales = null;

// Escuchar cambios en la lista de mesas
const mesasRef = ref(database, "mesas");
onValue(mesasRef, (snapshot) => {
    mesasGlobales = snapshot.val(); // Almacenar los datos globalmente
    if (mesasGlobales) {
        mostrarMesas(mesasGlobales, paginaActual); // Mostrar la primera página
    } else {
        document.querySelector("#mesas-table tbody").innerHTML = "<tr><td colspan='3'>No hay mesas generadas.</td></tr>";
    }
});