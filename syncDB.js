// 📁 /backend/syncDB.js
import mongoose from "mongoose";
import Producto from "./models/Producto.js";
import User from "./models/User.js";
import dotenv from "dotenv";
dotenv.config();

// ✅ Conexión rápida manual para Mongo Local
const LOCAL_URI = "mongodb://127.0.0.1:27017/jende_local";

export const syncData = async () => {
  try {
    console.log("🔁 Iniciando sincronización Atlas ➜ Local...");

    // 👉 1. Traer productos y usuarios desde Atlas
    const productosAtlas = await Producto.find();
    const usuariosAtlas = await User.find();

    // 👉 2. Conectar a Mongo Local
    const localConnection = await mongoose.createConnection(LOCAL_URI);

    const ProductoLocal = localConnection.model("Producto", Producto.schema);
    const UserLocal = localConnection.model("User", User.schema);

    // 👉 3. Vaciar la base local y volver a copiar los datos
    await ProductoLocal.deleteMany({});
    await UserLocal.deleteMany({});
    await ProductoLocal.insertMany(productosAtlas);
    await UserLocal.insertMany(usuariosAtlas);

    console.log("✅ Sincronizado correctamente con Mongo Local (jende_local)");

    await localConnection.close();
  } catch (error) {
    console.error("❌ Error en sincronización:", error);
  }
};
