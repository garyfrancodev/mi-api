// server-b.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const bcrypt = require("bcrypt");
const mysql = require("mysql2/promise");
const { body, param, validationResult } = require("express-validator");

const app = express();

/** ======= CONFIG ======= */
const PORT = process.env.PORT || 3000;

// Pool MySQL
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "app_db",
  port: Number(process.env.DB_PORT || 3306),
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

/** ======= MIDDLEWARES ======= */
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

/** ======= HELPERS ======= */
function validar(req) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const err = new Error("Validación fallida");
    err.status = 400;
    err.details = errors.array();
    throw err;
  }
}

/** ======= ROUTES ======= */
app.get("/health", async (req, res) => {
  // Chequeo rápido de conexión a DB
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, db: "connected" });
  } catch (e) {
    res.status(500).json({ ok: false, db: "error", message: e.message });
  }
});

// LISTAR
app.get("/api/usuarios", async (req, res, next) => {
  try {
    const [rows] = await pool.query(
        "SELECT id, nombre, email, rol, activo, created_at, updated_at FROM usuarios ORDER BY id DESC"
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
});

// OBTENER POR ID
app.get(
    "/api/usuarios/:id",
    [param("id").isInt({ min: 1 }).withMessage("id inválido")],
    async (req, res, next) => {
      try {
        validar(req);
        const { id } = req.params;

        const [rows] = await pool.query(
            "SELECT id, nombre, email, rol, activo, created_at, updated_at FROM usuarios WHERE id = ?",
            [id]
        );

        if (rows.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });

        res.json(rows[0]);
      } catch (e) {
        next(e);
      }
    }
);

//create
app.post("/api/task", [
  body("title").isString().isLength({ min: 2, max: 100 }),
], async (req, res, next) => {
  try {
    const { title } = req.body;

    const [result] = await pool.query(
        "INSERT INTO task (title, is_completed) VALUES (?, ?)",
        [title, 0]
    );

    const response = {
      id: result.insertId,
      title: title,
      is_completed: 0,
    };

    res.status(201).json(response);
  } catch (e) {
    next(e);
  }
});

// CREAR
app.post(
    "/api/usuarios",
    [
      body("nombre").isString().isLength({ min: 2, max: 100 }),
      body("email").isEmail().isLength({ max: 150 }),
      body("password").isString().isLength({ min: 6, max: 100 }),
      body("rol").optional().isIn(["admin", "user"]),
      body("activo").optional().isBoolean(),
    ],
    async (req, res, next) => {
      try {
        validar(req);

        const { nombre, email, password, rol = "user", activo = true } = req.body;

        // Email único
        const [existe] = await pool.query("SELECT id FROM usuarios WHERE email = ?", [email]);
        if (existe.length) return res.status(409).json({ message: "El email ya está registrado" });

        const password_hash = await bcrypt.hash(password, 10);

        const [result] = await pool.query(
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
        next(e);
      }
    }
);

//update
app.put("/api/task/:id", [
  param("id").isInt({ min: 1 }).withMessage("id inválido"),
], (req, res, next) => {

})

// ACTUALIZAR
app.put(
    "/api/usuarios/:id",
    [
      param("id").isInt({ min: 1 }).withMessage("id inválido"),
      body("nombre").optional().isString().isLength({ min: 2, max: 100 }),
      body("email").optional().isEmail().isLength({ max: 150 }),
      body("password").optional().isString().isLength({ min: 6, max: 100 }),
      body("rol").optional().isIn(["admin", "user"]),
      body("activo").optional().isBoolean(),
    ],
    async (req, res, next) => {
      try {
        validar(req);

        const { id } = req.params;
        const { nombre, email, password, rol, activo } = req.body;

        const [found] = await pool.query("SELECT id, email FROM usuarios WHERE id = ?", [id]);
        if (found.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });

        // Si cambia email, validar unique
        if (email && email !== found[0].email) {
          const [existe] = await pool.query("SELECT id FROM usuarios WHERE email = ?", [email]);
          if (existe.length) return res.status(409).json({ message: "El email ya está registrado" });
        }

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

        await pool.query(`UPDATE usuarios SET ${fields.join(", ")} WHERE id = ?`, values);

        res.json({ message: "Usuario actualizado" });
      } catch (e) {
        next(e);
      }
    }
);

// ELIMINAR
app.delete(
    "/api/usuarios/:id",
    [param("id").isInt({ min: 1 }).withMessage("id inválido")],
    async (req, res, next) => {
      try {
        validar(req);

        const { id } = req.params;

        const [result] = await pool.query("DELETE FROM usuarios WHERE id = ?", [id]);

        if (result.affectedRows === 0) return res.status(404).json({ message: "Usuario no encontrado" });

        res.json({ message: "Usuario eliminado" });
      } catch (e) {
        next(e);
      }
    }
);



//read
app.get("/api/task", (req, res, next) => {

})



//delete
app.delete("/api/task/:id", (req, res, next) => {

})

/** ======= ERROR HANDLER ======= */
app.use((err, req, res, next) => {
  console.error(err);

  // Si es validación
  if (err.details) {
    return res.status(err.status || 400).json({
      message: err.message || "Validación fallida",
      details: err.details,
    });
  }

  res.status(err.status || 500).json({
    message: err.message || "Error interno",
  });
});

/** ======= START ======= */
app.listen(PORT, () => {
  console.log(`API corriendo en http://localhost:${PORT} server-b.js`);
});
