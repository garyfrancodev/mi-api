const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const usuariosRoutes = require("./routes/usuarios.routes");

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ ok: true }));

app.use("/api/usuarios", usuariosRoutes);

// Manejo simple de errores
app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || "Error interno",
  });
});

module.exports = app;
