import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import transporter from "../utils/mailer.js";

export const registerUser = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "El usuario ya existe" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
    });

    await newUser.save();

    res.status(201).json({ message: "Usuario registrado correctamente" });
  } catch (error) {
    res.status(500).json({ message: "Error al registrar usuario", error });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Contraseña incorrecta" });

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.json({ message: "Inicio de sesión exitoso", token });
  } catch (error) {
    res.status(500).json({ message: "Error al iniciar sesión", error });
  }
};

export const recuperarPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "Usuario no encontrado" });

    // Generar código de verificación temporal
    const codigo = Math.floor(100000 + Math.random() * 900000); // 6 dígitos

    // Guardarlo temporalmente en la base de datos
    user.resetCode = codigo;
    user.resetCodeExpire = Date.now() + 10 * 60 * 1000; // 10 minutos válido
    await user.save();

    // ✅ Enviar correo
    await transporter.sendMail({
      from: `"Soporte Jende" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Recuperación de contraseña",
      html: `
        <h2>Solicitud de recuperación</h2>
        <p>Tu código de recuperación es:</p>
        <h3>${codigo}</h3>
        <p>Este código expirará en <b>10 minutos</b>.</p>
      `,
    });

    res.json({ message: "Correo enviado correctamente", email });
  } catch (error) {
    console.error("❌ Error enviando correo:", error);
    res.status(500).json({ message: "Error enviando correo", error });
  }
};
