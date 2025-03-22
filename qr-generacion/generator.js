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