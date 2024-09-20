const jwt = require('jsonwebtoken');
const { UsuarioAdmin, Usuario } = require('../models');

require('dotenv').config();

const JWTValidator = async (req, res, next) => {
  const token = req.header('x-token');

  if (!token) {
    return res.status(401).json({ error: 'No hay token en la petición' });
  }

  try {
    const { uid, rol } = jwt.verify(token, process.env.SECRETPRIVETEKEY);

    let usuario = await UsuarioAdmin.findById(uid);

    usuario ? null : (usuario = await Usuario.findById(uid));

    if (!usuario) {
      return res
        .status(401)
        .json({ error: 'Token no válido - usuario no existe en DB' });
    }

    req.usuario = usuario.JWTuser();
    
    next();
  } catch (error) {
    console.log(error);
    return res.status(401).json({ error: 'Token inválido' });
  }
};

module.exports = validarJWT;
