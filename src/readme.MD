
***Folders and files roles ***
- Handler: Funciones específicas que procesan rutas.
- Controller: Agrupa la lógica de negocio y gestiona las operaciones sobre las entidades.
- Provider: Abstrae el acceso a datos o servicios externos, facilitando su uso en controllers.

***Errores handling:***
- Response Errors
We  Pass to globalErrorHandler a new Pass to global error handler a new AppError

- Local Errors
We use try/catch throwing a new AppError();