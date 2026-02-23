const { validationResult } = require("express-validator");
const bcrypt = require("bcrypt");
const db = require("../db");

function validar(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new Error("Validación fallida");
    err.status = 400;
    err.details = errors.array();
    throw err;
  }
}

exports.listar = async (req, res, next) => {
  try {
    const [rows] = await db.query(
        "SELECT id, nombre, email, rol, activo, created_at, updated_at FROM usuarios ORDER BY id DESC"
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
};

exports.obtenerPorId = async (req, res, next) => {
  try {
    validar(req);
    const { id } = req.params;

    const [rows] = await db.query(
        "SELECT id, nombre, email, rol, activo, created_at, updated_at FROM usuarios WHERE id = ?",
        [id]
    );

    if (rows.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });

    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};

exports.crear = async (req, res, next) => {
  try {
    validar(req);
    const { nombre, email, password, rol = "user", activo = true } = req.body;

    // Validar email único
    const [existe] = await db.query("SELECT id FROM usuarios WHERE email = ?", [email]);
    if (existe.length) return res.status(409).json({ message: "El email ya está registrado" });

    const password_hash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
        "INSERT INTO usuarios (nombre, email, password_hash, rol, activo) VALUES (?, ?, ?, ?, ?)",
        [nombre, email, password_hash, rol, activo ? 1 : 0]
    );

    res.status(201).json({
      id: result.insertId,
      nombre,
      email,
      rol,
      activo: !!activo,
    });
  } catch (e) {
    // Adjuntar detalles de validación si existen
    if (e.details) return res.status(400).json({ message: e.message, details: e.details });
    next(e);
  }
};

exports.actualizar = async (req, res, next) => {
  try {
    validar(req);
    const { id } = req.params;
    const { nombre, email, password, rol, activo } = req.body;

    // Verificar existencia
    const [found] = await db.query("SELECT id, email FROM usuarios WHERE id = ?", [id]);
    if (found.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });

    // Si cambia email, validar unique
    if (email && email !== found[0].email) {
      const [existe] = await db.query("SELECT id FROM usuarios WHERE email = ?", [email]);
      if (existe.length) return res.status(409).json({ message: "El email ya está registrado" });
    }

    // Armar update dinámico
    const fields = [];
    const values = [];

    if (nombre !== undefined) { fields.push("nombre = ?"); values.push(nombre); }
    if (email !== undefined) { fields.push("email = ?"); values.push(email); }
    if (rol !== undefined) { fields.push("rol = ?"); values.push(rol); }
    if (activo !== undefined) { fields.push("activo = ?"); values.push(activo ? 1 : 0); }

    if (password !== undefined) {
      const password_hash = await bcrypt.hash(password, 10);
      fields.push("password_hash = ?");
      values.push(password_hash);
    }

    if (fields.length === 0) {
      return res.status(400).json({ message: "No hay campos para actualizar" });
    }

    values.push(id);

    await db.query(`UPDATE usuarios SET ${fields.join(", ")} WHERE id = ?`, values);

    res.json({ message: "Usuario actualizado" });
  } catch (e) {
    if (e.details) return res.status(400).json({ message: e.message, details: e.details });
    next(e);
  }
};

exports.eliminar = async (req, res, next) => {
  try {
    validar(req);
    const { id } = req.params;

    const [result] = await db.query("DELETE FROM usuarios WHERE id = ?", [id]);

    if (result.affectedRows === 0) return res.status(404).json({ message: "Usuario no encontrado" });

    res.json({ message: "Usuario eliminado" });
  } catch (e) {
    next(e);
  }
};
