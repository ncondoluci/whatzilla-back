
***Folders and files roles ***
- Handler: Funciones específicas que procesan rutas.
- Controller: Agrupa la lógica de negocio y gestiona las operaciones sobre las entidades.
- Provider: Abstrae el acceso a datos o servicios externos, facilitando su uso en controllers.


# Manejo de Errores en Aplicaciones Node.js

## Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Manejo de Errores en Requests](#manejo-de-errores-en-requests)
   - [Middleware Global de Errores](#middleware-global-de-errores)
   - [Uso en Controladores](#uso-en-controladores)
   - [Uso de la Clase AppError](#uso-de-la-clase-app-error)
3. [Manejo de Errores en Servicios](#manejo-de-errores-en-servicios)
   - [Captura de Errores en Servicios](#captura-de-errores-en-servicios)
   - [Uso de AppError en Servicios](#uso-de-app-error-en-servicios)
4. [Manejo de Errores en Trabajos Programados](#manejo-de-errores-en-trabajos-programados)
   - [Ejemplo con Cron](#ejemplo-con-cron)
   - [Uso con Bull (Sistema de Colas)](#uso-con-bull-sistema-de-colas)
5. [Errores No Capturados](#errores-no-capturados)
6. [Monitoreo y Alertas](#monitoreo-y-alertas)
7. [Interfaces para Tipos de Error](#interfaces-para-tipos-de-error)
   - [IAppError](#iapp-error)
   - [IServiceError](#iservice-error)
   - [IJobError](#ijob-error)
   - [IUnhandledError](#iunhandled-error)

---

## Descripción General

Este documento describe cómo implementar un manejo de errores profesional en aplicaciones Node.js utilizando `Express`, `winston` para logging, y la clase `AppError` para gestionar errores operacionales y no operacionales.

El manejo de errores está segmentado en tres partes principales:

1. **Errores en Requests**: Captura y manejo de errores generados por las rutas y controladores.
2. **Errores en Servicios**: Manejo de errores que ocurren en servicios de negocio que no están directamente ligados a una solicitud HTTP.
3. **Errores en Trabajos Programados**: Captura de errores en trabajos que se ejecutan en segundo plano, como cron jobs o colas de tareas.

---

## Manejo de Errores en Requests

### Middleware Global de Errores

Este middleware captura todos los errores que ocurren en las rutas de la aplicación y los gestiona adecuadamente según el entorno (desarrollo o producción).

```typescript
import { Request, Response, NextFunction } from 'express';
import { AppError } from '../providers/ErrorProvider';
import { sendResponse } from '../utils/customResponse';
import { logger } from '../utils/logger';

export const globalErrorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
    const statusCode = err.statusCode || 500;
    const isOperational = err.isOperational || false;

    // Log detallado del error
    logger.error(err.message, {
        statusCode,
        isOperational,
        stack: err.stack,
        originalError: err.data,
        method: req.method,
        url: req.url,
        params: req.params,
        query: req.query,
        body: req.body,
        headers: req.headers,
        userAgent: req.get('user-agent'),
        ip: req.ip
    });

    // Respuesta al cliente
    const errorResponse = {
        success: false,
        message: isOperational ? err.message : 'Algo salió mal!',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    };

    sendResponse(res, statusCode, errorResponse);
};
```

Este middleware debe registrarse al final de todas las rutas en `Express`.

### Uso en Controladores

Cuando ocurre un error en un controlador, se debe lanzar un `AppError` para que sea capturado por el middleware global.

```typescript
const { AppError } = require('../providers/ErrorProvider');

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return next(new AppError({
        message: 'Usuario no encontrado',
        statusCode: 404,
        isOperational: true
      }));
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};
```

### Uso de la Clase AppError

La clase `AppError` permite gestionar errores de forma profesional, diferenciando entre errores operacionales y errores inesperados.

```typescript
import { IAppError } from "../interfaces/Error";

class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;
    public data?: any;

    constructor({ message, statusCode, isOperational = true, data }: IAppError) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.data = data;
        Error.captureStackTrace(this, this.constructor);
    }
}

export { AppError, IAppError };
```

---

## Manejo de Errores en Servicios

En servicios, donde no interactúas directamente con el ciclo de vida de una solicitud HTTP, también puedes usar `AppError` para capturar y loggear errores de manera uniforme.

### Captura de Errores en Servicios

```typescript
const { AppError } = require('../providers/ErrorProvider');
const User = require('../models/User');

exports.getUserById = async (id) => {
  try {
    const user = await User.findById(id);
    
    if (!user) {
      throw new AppError({
        message: 'Usuario no encontrado',
        statusCode: 404,
        isOperational: true
      });
    }

    return user;
  } catch (error) {
    if (!(error instanceof AppError)) {
      throw new AppError({
        message: 'Error en el servicio de usuarios',
        statusCode: 500,
        isOperational: false,
        data: error.message
      });
    }
    throw error;
  }
};
```

### Uso de AppError en Servicios

Cuando ocurre un error en un servicio, lo envolvemos en una instancia de `AppError` si no lo es ya, para garantizar un manejo uniforme.

---

## Manejo de Errores en Trabajos Programados

En trabajos programados (cron jobs, colas de tareas, etc.), no existe una `request` que capture los errores. Por lo tanto, es esencial capturar y loggear los errores adecuadamente.

### Ejemplo con Cron

```typescript
const cron = require('node-cron');
const { AppError } = require('../providers/ErrorProvider');
const { logger } = require('../utils/logger');

// Trabajo programado
cron.schedule('0 8 * * *', async () => {
  try {
    const users = await getUsersForNewsletter();

    for (let user of users) {
      try {
        await sendEmail(user.email, 'Boletín Diario', 'Últimas noticias...');
        logger.info(`Correo enviado exitosamente a ${user.email}`);
      } catch (error) {
        logger.error('Error al enviar correo', {
          user: user.email,
          error: error.message,
          stack: error.stack
        });
      }
    }
  } catch (error) {
    logger.error('Error en el trabajo programado', {
      message: error.message,
      stack: error.stack
    });
    await sendAlertToAdmin(error);
  }
});
```

### Uso con Bull (Sistema de Colas)

Para trabajos en segundo plano, puedes utilizar `bull`, un sistema de colas para Node.js.

```typescript
const Queue = require('bull');
const { AppError } = require('../providers/ErrorProvider');
const { logger } = require('../utils/logger');

const emailQueue = new Queue('emailQueue', 'redis://127.0.0.1:6379');

emailQueue.process(async (job) => {
  try {
    const { email, subject, body } = job.data;
    await sendEmail(email, subject, body);
    logger.info(`Correo enviado a ${email}`);
  } catch (error) {
    logger.error('Error procesando trabajo de correo', {
      jobId: job.id,
      message: error.message,
      stack: error.stack
    });
    throw error;
  }
});
```

---

## Errores No Capturados

Es importante manejar los errores no capturados a nivel de proceso.

```typescript
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection:', { reason, promise });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', { message: error.message, stack: error.stack });
});
```

---

## Monitoreo y Alertas

Para errores críticos en trabajos programados o servicios, puedes implementar un sistema de alertas.

```typescript
async function sendAlertToAdmin(error) {
  await sendEmail('admin@example.com', 'Error Crítico', `Error: ${error.message}\nStack: ${error.stack}`);
}
```

---

## Interfaces para Tipos de Error

### IAppError

```typescript
export interface IAppError {
  message: string;
  statusCode: number;
  isOperational?: boolean;
  data?: any;
}
```

### IServiceError

```typescript
export interface IServiceError {
  message:

 string;
  statusCode: number;
  service: string;
  isOperational?: boolean;
  data?: any;
}
```

### IJobError

```typescript
export interface IJobError {
  message: string;
  jobId: string;
  isOperational?: boolean;
  data?: any;
}
```

### IUnhandledError

```typescript
export interface IUnhandledError {
  message: string;
  stack: string;
  context?: string;
}
```

---

```

### Puntos importantes:
- **Modularidad**: El manejo de errores está segmentado en varias partes: peticiones HTTP, servicios, trabajos programados.
- **Interfaces**: Cada tipo de error tiene una interfaz que define qué datos deben ser capturados.
- **Logging**: El uso de `winston` permite un registro adecuado de errores, tanto en consola (desarrollo) como en archivos (producción).
- **Alertas**: Se sugiere implementar un sistema de alertas para errores críticos en producción.
