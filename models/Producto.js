import mongoose from "mongoose";

const productoSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true,
    trim: true
  },
  precio: {
    type: Number,
    required: true
  },
  descripcion: {
    type: String,
    trim: true
  },
  foto: {
    type: String, // puedes guardar una URL de imagen
    default: ""
  },
  stock: {
    type: Number,
    default: 0
  },
  sku: {
    type: String,
    unique: true,
    required: true
  }
}, {
  timestamps: true // agrega createdAt y updatedAt automáticamente
});

const Producto = mongoose.model("Producto", productoSchema);

export default Producto;
