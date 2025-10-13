// backend/routes/productoRoutes.js
import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  crearProducto,
  obtenerProductos,
  actualizarProducto,
  eliminarProducto,
  generarPdfInventario,
} from "../controllers/productoController.js";

const router = express.Router();

// carpeta donde guardaremos (relativa a la raíz del proyecto backend)
const uploadDir = path.join(process.cwd(), "productos");

// crear carpeta si no existe
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// configurar multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  },
});
const upload = multer({ storage });

// rutas
router.get("/", obtenerProductos);
router.post("/", upload.single("foto"), crearProducto);
router.put("/:id", upload.single("foto"), actualizarProducto);
router.delete("/:id", eliminarProducto);
router.get("/pdf", generarPdfInventario);


export default router;
