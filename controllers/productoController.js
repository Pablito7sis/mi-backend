import Producto from "../models/Producto.js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";
import axios from "axios";

// 🟢 Crear nuevo producto con imagen y SKU incremental
export const crearProducto = async (req, res) => {
  try {
    const { nombre, precio, descripcion, stock } = req.body;
    
    if (!nombre || !precio) {
      return res.status(400).json({ mensaje: "Nombre y precio son obligatorios" });
    }

    const ultimoProducto = await Producto.findOne().sort({ sku: -1 });
    const nuevoSKU = ultimoProducto ? ultimoProducto.sku + 1 : 1;

    const rutaFoto = req.file ? `/productos/${req.file.filename}` : "";

    const nuevoProducto = new Producto({
      nombre,
      precio,
      descripcion,
      stock,
      foto: rutaFoto,
      sku: nuevoSKU
    });

    await nuevoProducto.save();
    res.status(201).json(nuevoProducto);
  } catch (error) {
    console.error("Error al crear producto:", error);
    res.status(500).json({ mensaje: "Error al crear el producto", error });
  }
};

// 🟡 Obtener todos los productos
export const obtenerProductos = async (req, res) => {
  try {
    const productos = await Producto.find();
    res.json(productos);
  } catch (error) {
    res.status(500).json({ mensaje: "Error al obtener productos", error });
  }
};

// 🔵 Actualizar producto
export const actualizarProducto = async (req, res) => {
  try {
    const id = req.params.id;
    const { nombre, precio, descripcion, stock } = req.body;

    const updateData = { nombre, precio, descripcion, stock };

    if (req.file) {
      updateData.foto = `/productos/${req.file.filename}`;
    }

    const productoActualizado = await Producto.findByIdAndUpdate(id, updateData, { new: true });

    if (!productoActualizado) {
      return res.status(404).json({ mensaje: "Producto no encontrado" });
    }

    res.json(productoActualizado);
  } catch (error) {
    console.error("Error al actualizar producto:", error);
    res.status(500).json({ mensaje: "Error al actualizar producto", error });
  }
};

// 🔴 Eliminar producto
export const eliminarProducto = async (req, res) => {
  try {
    await Producto.findByIdAndDelete(req.params.id);
    res.json({ mensaje: "Producto eliminado correctamente" });
  } catch (error) {
    res.status(500).json({ mensaje: "Error al eliminar producto", error });
  }
};

// 📄 GENERAR PDF — Jende Inventario (con imágenes)
export const generarPdfInventario = async (req, res) => {
  try {
    const productos = await Producto.find().sort({ sku: 1, nombre: 1 });

    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 40 });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "attachment; filename=jende_inventario.pdf");
    doc.pipe(res);

    // Título
    doc.fontSize(20).text("Jende - Inventario de productos", { align: "center" });
    doc.moveDown(1);

    // Columnas
    const startX = doc.page.margins.left;
    const tableTop = doc.y + 10;
    const colImage = startX;
    const colSku = colImage + 90;
    const colNombre = colSku + 90;
    const colPrecio = colNombre + 220;
    const colStock = colPrecio + 80;
    const colDesc = colStock + 60;
    const rowHeight = 80;

    // Cabecera
    doc.fontSize(10).font("Helvetica-Bold");
    doc.text("Imagen", colImage, tableTop);
    doc.text("SKU", colSku, tableTop);
    doc.text("Nombre", colNombre, tableTop);
    doc.text("Precio", colPrecio, tableTop);
    doc.text("Stock", colStock, tableTop);
    doc.text("Descripción", colDesc, tableTop);
    doc.moveDown(0.5);
    doc.strokeColor("#aaaaaa").moveTo(startX, tableTop + 18).lineTo(doc.page.width - doc.page.margins.right, tableTop + 18).stroke();

    let y = tableTop + 25;
    doc.font("Helvetica").fontSize(9);

    for (const p of productos) {
      if (y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage({ layout: "landscape", size: "A4" });
        y = doc.page.margins.top;
      }

      try {
        let imagePlaced = false;

        if (p.foto) {
          if (String(p.foto).startsWith("http")) {
            const resp = await axios.get(p.foto, { responseType: "arraybuffer", timeout: 5000 });
            const imgBuffer = Buffer.from(resp.data, "binary");
            doc.image(imgBuffer, colImage, y, { width: 70, height: 70, fit: [70, 70] });
            imagePlaced = true;
          } else {
            let rel = String(p.foto);
            if (rel.startsWith("/")) rel = rel.slice(1);
            const localPath = path.join(process.cwd(), rel);
            if (fs.existsSync(localPath)) {
              doc.image(localPath, colImage, y, { width: 70, height: 70, fit: [70, 70] });
              imagePlaced = true;
            }
          }
        }

        if (!imagePlaced) {
          doc.rect(colImage, y, 70, 70).strokeColor("#cccccc").stroke();
          doc.fillColor("#666666").fontSize(8).text("Sin imagen", colImage + 5, y + 28);
          doc.fillColor("#000000").fontSize(9);
        }
      } catch (errImg) {
        doc.rect(colImage, y, 70, 70).strokeColor("#cccccc").stroke();
        doc.fillColor("#666666").fontSize(8).text("Error imagen", colImage + 5, y + 28);
        doc.fillColor("#000000").fontSize(9);
      }

      doc.font("Helvetica").fontSize(10);
      doc.text(p.sku || "", colSku, y + 6, { width: 90 });
      doc.text(p.nombre || "", colNombre, y + 6, { width: 220 });
      doc.text(`$${p.precio}`, colPrecio, y + 6, { width: 70 });
      doc.text(String(p.stock ?? ""), colStock, y + 6, { width: 60 });
      doc.text(String(p.descripcion || ""), colDesc, y + 6, {
        width: doc.page.width - colDesc - doc.page.margins.right,
      });

      y += rowHeight;
      doc.moveTo(startX, y - 10).lineTo(doc.page.width - doc.page.margins.right, y - 10).strokeColor("#eeeeee").stroke();
    }

    doc.end();
  } catch (error) {
    console.error("❌ Error generando PDF:", error);
    res.status(500).json({ mensaje: "Error generando PDF", error: String(error) });
  }
};
