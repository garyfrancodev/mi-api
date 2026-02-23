const router = require("express").Router();
const { body, param } = require("express-validator");

const ctrl = require("../controllers/usuarios.controller");

const validarId = [
  param("id").isInt({ min: 1 }).withMessage("id inválido"),
];

router.get("/", ctrl.listar);
router.get("/:id", validarId, ctrl.obtenerPorId);

router.post(
    "/",
    [
      body("nombre").isString().isLength({ min: 2, max: 100 }),
      body("email").isEmail().isLength({ max: 150 }),
      body("password").isString().isLength({ min: 6, max: 100 }),
      body("rol").optional().isIn(["admin", "user"]),
      body("activo").optional().isBoolean(),
    ],
    ctrl.crear
);

router.put(
    "/:id",
    [
      ...validarId,
      body("nombre").optional().isString().isLength({ min: 2, max: 100 }),
      body("email").optional().isEmail().isLength({ max: 150 }),
      body("password").optional().isString().isLength({ min: 6, max: 100 }),
      body("rol").optional().isIn(["admin", "user"]),
      body("activo").optional().isBoolean(),
    ],
    ctrl.actualizar
);

router.delete("/:id", validarId, ctrl.eliminar);

module.exports = router;
