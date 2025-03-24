const express = require("express");
const QRCode = require("qrcode");
const path = require("path");
const fs = require("fs");

const app = express();
const port = 3000;

// Crear la carpeta assets si no existe
const assetsPath = path.join(__dirname, "../frontend/assets");
if (!fs.existsSync(assetsPath)) {
    fs.mkdirSync(assetsPath, { recursive: true });
    console.log(`Carpeta 'assets' creada en: ${assetsPath}`);
} else {
    console.log(`La carpeta 'assets' ya existe en: ${assetsPath}`);
}

// Middleware para parsear JSON
app.use(express.json());

// Endpoint para generar el QR
app.post("/generar-qr", (req, res) => {
    const { numeroMesa } = req.body;

    // Validar que el número de mesa no esté vacío
    if (!numeroMesa || typeof numeroMesa !== "string") {
        return res.status(400).json({ error: "El número de mesa no es válido." });
    }

    const filePath = path.join(assetsPath, `mesa_${numeroMesa.replace(/ /g, "_")}.png`); // Reemplazar espacios con guiones bajos
    const qrOptions = {
        color: {
            dark: "#000000", // Color del código QR (negro)
            light: "#ffffff", // Color de fondo (blanco)
        },
        width: 500, // Ancho del código QR (500px)
        margin: 1, // Margen del código QR
    };

    QRCode.toFile(filePath, numeroMesa, qrOptions, (err) => {
        if (err) {
            console.error(`Error al generar el QR para ${numeroMesa}:`, err);
            return res.status(500).json({ error: "Error al generar el código QR." });
        } else {
            console.log(`Código QR generado para ${numeroMesa} en: ${filePath}`);
            return res.status(200).json({ message: `Código QR generado para ${numeroMesa}.` });
        }
    });
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor backend escuchando en http://localhost:${port}`);
});