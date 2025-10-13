import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import transporter from "../utils/mailer.js"; // Asegúrate que existe utils/mailer.js

const router = express.Router();

// 🔹 REGISTRO
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: "Todos los campos son obligatorios" });

    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "El usuario ya existe" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({ name, email, password: hashedPassword });

    await newUser.save();
    res.status(201).json({ message: "Usuario registrado exitosamente" });
  } catch (error) {
    console.error("❌ Error en registro:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});

// 🔹 LOGIN
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(400).json({ message: "Usuario no encontrado" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Contraseña incorrecta" });

    const token = jwt.sign(
      { id: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({ message: "Inicio de sesión exitoso", token });
  } catch (error) {
    console.error("❌ Error en login:", error);
    res.status(500).json({ message: "Error en el servidor" });
  }
});

// 🔹 ENVIAR ENLACE DE RECUPERACIÓN
router.post("/recuperar", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    // 🔐 Generar token válido por 20 minutos
    const resetToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "20m" }
    );

    // 🎯 URL que llegará al correo
    const link = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

    // 📩 Enviar correo
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "🔐 Recuperación de contraseña - Café Jende",
      html: `
        <h2>Restablecer tu contraseña</h2>
        <p>Haz clic en el siguiente enlace para cambiar tu contraseña:</p>
        <a href="${link}" target="_blank">${link}</a>
        <p><b>Este enlace expirará en 20 minutos.</b></p>
      `,
    });

    res.json({ message: "✅ Correo enviado con enlace de recuperación" });
  } catch (error) {
    console.error("❌ Error enviando correo:", error);
    res.status(500).json({ message: "Error al enviar correo" });
  }
});

// 🔹 RESET PASSWORD (usuario envía nueva contraseña desde el enlace con token)
router.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword)
      return res.status(400).json({ message: "Token y nueva contraseña son requeridos" });

    // ✅ Verificar token JWT
    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      return res.status(400).json({ message: "Token inválido o expirado" });
    }

    // 🔍 Buscar usuario
    const user = await User.findById(payload.id);
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    // 🔐 Hashear nueva contraseña
    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    return res.json({ message: "✅ Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("❌ Error en reset-password:", error);
    return res.status(500).json({ message: "Error en el servidor" });
  }
});

export default router;
