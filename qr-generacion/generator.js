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

// Variables globales para paginación y búsqueda
let datosTabla = []; // Almacena todos los datos de la tabla
let paginaActual = 1;
const filasPorPagina = 10; // Número de filas por página

// Variables globales para la invitación actual
let invitadoActual = null; // Almacena el nombre del invitado actualmente visible
let botonActivo = null; // Almacena el botón que está actualmente activo

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

        alert("Invitación generada y guardada correctamente.");
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

// Función para eliminar un invitado de Firebase
function eliminarInvitado(numeroMesa, nombreInvitado) {
    if (confirm(`¿Estás seguro de que quieres eliminar a ${nombreInvitado} de la mesa ${numeroMesa}?`)) {
        const mesaRef = ref(database, `mesas/${numeroMesa}/invitados`);
        get(mesaRef).then((snapshot) => {
            if (snapshot.exists()) {
                let invitados = snapshot.val();
                // Filtrar el invitado que se desea eliminar
                invitados = invitados.filter((invitado) => invitado.nombre !== nombreInvitado);
                // Guardar la lista actualizada en Firebase
                set(mesaRef, invitados)
                    .then(() => {
                        console.log(`Invitado ${nombreInvitado} eliminado de la mesa ${numeroMesa}.`);
                        alert(`Invitado ${nombreInvitado} eliminado correctamente.`);
                    })
                    .catch((error) => {
                        console.error("Error al eliminar el invitado:", error);
                        alert("Hubo un error al eliminar el invitado. Inténtalo de nuevo.");
                    });
            }
        }).catch((error) => {
            console.error("Error al obtener los datos de Firebase:", error);
            alert("Hubo un error al obtener los datos de Firebase. Inténtalo de nuevo.");
        });
    }
}

// Función para mostrar los datos en la tabla
function mostrarDatosEnTabla(datos) {
    const tbody = document.querySelector("#mesas-table tbody");
    tbody.innerHTML = "";

    datos.forEach((fila) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${fila.numeroMesa}</td>
            <td>${fila.invitado}</td>
            <td>${fila.Escaneado ? "Escaneado ✅" : "No escaneado ❌"}</td>
            <td>
                <button class="boton-mostrar">MOSTRAR</button>
                <button class="boton-eliminar">Eliminar</button>
            </td>
        `;

        // Vincular el evento click al botón MOSTRAR
        const botonMostrar = tr.querySelector(".boton-mostrar");
        botonMostrar.addEventListener("click", () => {
            mostrarQR(fila.qrImageUrl, botonMostrar, {
                numeroMesa: fila.numeroMesa,
                invitado: fila.invitado,
                fechaFiesta: fila.fechaFiesta,
                horaFiesta: fila.horaFiesta
            });
        });

        // Vincular el evento click al botón Eliminar
        const botonEliminar = tr.querySelector(".boton-eliminar");
        botonEliminar.addEventListener("click", () => {
            eliminarInvitado(fila.numeroMesa, fila.invitado);
        });

        tbody.appendChild(tr);
    });
}

// Función para mostrar una página específica
function mostrarPagina(pagina, datos) {
    const inicio = (pagina - 1) * filasPorPagina;
    const fin = inicio + filasPorPagina;
    const datosPagina = datos.slice(inicio, fin);

    mostrarDatosEnTabla(datosPagina);
    actualizarControlesPaginacion(datos);
}

// Función para actualizar los controles de paginación
function actualizarControlesPaginacion(datos) {
    const totalPaginas = Math.ceil(datos.length / filasPorPagina);
    const controlesPaginacion = document.getElementById("controles-paginacion");

    controlesPaginacion.innerHTML = `
        <button onclick="cambiarPagina(${paginaActual - 1})" ${paginaActual === 1 ? "disabled" : ""}>Anterior</button>
        <button onclick="cambiarPagina(${paginaActual + 1})" ${paginaActual === totalPaginas ? "disabled" : ""}>Siguiente</button>
        <span>Página ${paginaActual} de ${totalPaginas}</span>
    `;
}

// Función para cambiar de página (global)
window.cambiarPagina = function (nuevaPagina) {
    if (nuevaPagina < 1 || nuevaPagina > Math.ceil(datosTabla.length / filasPorPagina)) return;
    paginaActual = nuevaPagina;
    mostrarPagina(paginaActual, datosTabla);
};

// Función para filtrar los datos de la tabla
function filtrarTabla(textoBusqueda) {
    const datosFiltrados = datosTabla.filter((fila) => {
        return (
            fila.numeroMesa.toString().includes(textoBusqueda) ||
            fila.invitado.toLowerCase().includes(textoBusqueda) ||
            (fila.Escaneado ? "escaneado" : "no escaneado").includes(textoBusqueda)
        );
    });

    // Mostrar la primera página de los resultados filtrados
    paginaActual = 1;
    mostrarPagina(paginaActual, datosFiltrados);
}

// Evento para el input de búsqueda
document.getElementById("input-busqueda").addEventListener("input", (e) => {
    const textoBusqueda = e.target.value.toLowerCase();
    filtrarTabla(textoBusqueda);
});

// Función para mostrar el código QR y la invitación
function mostrarQR(qrImageUrl, botonMostrar, datosMesa) {
    const qrContainer = document.getElementById("qr-code");
    const invitacionContainer = document.getElementById("invitacion-container");
    const invitacionTexto = document.getElementById("invitacion-texto");
    const enviarWhatsApp = document.getElementById("enviar-whatsapp");

    // Si se hace clic en el botón del invitado actual, ocultar el código QR y la invitación
    if (invitadoActual === datosMesa.invitado) {
        qrContainer.innerHTML = ""; // Limpiar el contenido
        qrContainer.classList.add("hidden"); // Ocultar el código QR
        invitacionContainer.style.display = "none"; // Ocultar la invitación

        // Cambiar el texto del botón a "MOSTRAR"
        botonMostrar.textContent = "MOSTRAR";

        // Limpiar el invitado actualmente visible y el botón activo
        invitadoActual = null;
        botonActivo = null;
        return; // Salir de la función
    }

    // Ocultar la información del invitado anterior (si hay uno)
    if (invitadoActual !== null) {
        qrContainer.innerHTML = ""; // Limpiar el contenido
        qrContainer.classList.add("hidden"); // Ocultar el código QR
        invitacionContainer.style.display = "none"; // Ocultar la invitación

        // Cambiar el texto del botón activo a "MOSTRAR"
        if (botonActivo) {
            botonActivo.textContent = "MOSTRAR";
        }
    }

    // Ocultar el código QR generado previamente
    qrContainer.innerHTML = "";

    // Mostrar la invitación existente
    invitacionTexto.innerHTML = `
        <p>
            Quiero invitarte a mi fiesta 🎉<br>
            Fecha: ${datosMesa.fechaFiesta}<br>
            Hora: ${datosMesa.horaFiesta}<br>
            Debe presentar este código QR en portería.<br>
            Mesa: ${datosMesa.numeroMesa}<br>
            Invitado: ${datosMesa.invitado}
        </p>
        <img src="${qrImageUrl}" alt="Código QR" style="max-width: 200px;">
    `;
    invitacionContainer.style.display = "block";

    // Actualizar el enlace de WhatsApp
    const mensajeWhatsApp = encodeURIComponent(`
        Quiero invitarte a mi fiesta 🎉
        Fecha: ${datosMesa.fechaFiesta}
        Hora: ${datosMesa.horaFiesta}
        Debe presentar este código QR en portería.

        Mesa: ${datosMesa.numeroMesa}
        Invitado: ${datosMesa.invitado}

        Ver el código QR: ${qrImageUrl}
    `);
    enviarWhatsApp.href = `https://wa.me/?text=${mensajeWhatsApp}`;

    // Cambiar el texto del botón a "OCULTAR"
    botonMostrar.textContent = "OCULTAR";

    // Actualizar el invitado actualmente visible y el botón activo
    invitadoActual = datosMesa.invitado;
    botonActivo = botonMostrar;
}

// Modificar la función mostrarMesas para usar la paginación
function mostrarMesas(mesas) {
    datosTabla = []; // Reiniciar los datos de la tabla

    // Convertir las claves de las mesas a números y ordenarlas
    const mesasOrdenadas = Object.entries(mesas)
        .map(([numeroMesa, datos]) => ({ numeroMesa: Number(numeroMesa), datos }))
        .sort((a, b) => a.numeroMesa - b.numeroMesa);

    // Llenar datosTabla con los datos de las mesas
    mesasOrdenadas.forEach(({ numeroMesa, datos }) => {
        if (datos.invitados && datos.invitados.length > 0) {
            datos.invitados.forEach((invitado) => {
                datosTabla.push({
                    numeroMesa,
                    invitado: invitado.nombre,
                    fechaFiesta: invitado.fechaFiesta,
                    horaFiesta: invitado.horaFiesta,
                    qrImageUrl: invitado.qrImageUrl,
                    Escaneado: invitado.Escaneado,
                });
            });
        }
    });

    // Mostrar la primera página
    mostrarPagina(paginaActual, datosTabla);
}

// Escuchar cambios en la lista de mesas
const mesasRef = ref(database, "mesas");
onValue(mesasRef, (snapshot) => {
    const mesas = snapshot.val();
    if (mesas) {
        mostrarMesas(mesas);
    } else {
        document.querySelector("#mesas-table tbody").innerHTML = "<tr><td colspan='4'>No hay mesas generadas.</td></tr>";
    }
});

// Agregar controles de paginación al HTML
document.addEventListener("DOMContentLoaded", () => {
    const controlesPaginacion = document.createElement("div");
    controlesPaginacion.id = "controles-paginacion";
    document.getElementById("lista-mesas").appendChild(controlesPaginacion);
});

// Manejar el envío del formulario qr-form
qrForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Evitar que el formulario se envíe

    // Obtener los valores del formulario
    const numeroMesa = numeroMesaInput.value.trim();
    const invitado = invitadoInput.value.trim();
    const fechaFiesta = fechaFiestaInput.value;
    const horaFiesta = horaFiestaInput.value;

    // Validar que todos los campos estén completos
    if (numeroMesa && invitado && fechaFiesta && horaFiesta) {
        // Guardar los datos en Firebase
        await generarQR(numeroMesa, invitado, fechaFiesta, horaFiesta);
    } else {
        alert("Por favor, completa todos los campos.");
    }
});

// Evento para el formulario de importación de Excel
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
    alert("Lista cargada correctamente.");
}