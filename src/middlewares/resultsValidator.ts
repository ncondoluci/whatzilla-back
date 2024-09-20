const { validationResult } = require('express-validator');

const resultsValidator = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const customErrors = errors.array().map(err => ({
      location: err.location,
      field: err.param, // Dónde ocurrió el error ('body', 'query', 'params')
      message: err.msg        // Cuál es el mensaje de error personalizado
    }));
    return res.status(400).json({
      success: false,
      errors: customErrors[0],
      message: "Hay errores de validación."
    });
  }

  next();
};

function onlyAllowedFields(allowedFields) {
  return function (req, res, next) {
    const updates = Object.keys(req.body);
    const isValidOperation = updates.every((update) => allowedFields.includes(update));

    if (!isValidOperation) {
      return res.status(400).json({
        success: false,
        message: "Se han proporcionado campos no permitidos en la solicitud."
      });
    }

    next();
  };
}



module.exports = { 
  resultsValidator,
  onlyAllowedFields
}
