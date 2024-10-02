
***Folders and files roles ***
- Handler: Funciones específicas que procesan rutas.
- Controller: Agrupa la lógica de negocio y gestiona las operaciones sobre las entidades.
- Provider: Abstrae el acceso a datos o servicios externos, facilitando su uso en controllers.

***Errores handling:***

---

# Error Handling in the Application

This application implements a robust error-handling system designed to centralize error management and clearly separate operational errors (errors the user or application logic can handle) from unexpected errors (programming errors or internal failures).

## Features of the Error Handling System

### 1. **`AppError` Class**
The `AppError` class is a custom error handler used to manage **operational errors**, such as:
- Validation failures
- Resources not found
- Authentication issues

**Properties**:
- `message`: The error message sent to the client.
- `statusCode`: The corresponding HTTP status code (e.g., 400 for bad requests, 404 for not found).
- `isOperational`: Indicates if the error is operational (i.e., an expected error that should be handled by the client or application logic).
- `data` (optional): Additional information about the error, useful for things like validation error details.

### 2. **Global Error Handler**
The global error handler is middleware responsible for **capturing and managing all errors** in the application. It distinguishes between **operational errors** (which are reported to the client) and **unexpected programming errors**.

- **Winston** is used for logging errors to both a file and the console.
- Standard JSON error response format:
  ```json
  {
    "success": false,
    "message": "User not found",
    "statusCode": 404
  }
  ```
- The global handler also manages **uncaught exceptions** and **unhandled promise rejections**, shutting down the application safely if needed.

### 3. **Handling Uncaught Exceptions and Unhandled Rejections**
We added listeners using `process.on` to manage:
- **`uncaughtException`**: Captures synchronous errors that are not handled.
- **`unhandledRejection`**: Captures promise rejections that lack a `.catch()` handler.

**Example**:
```ts
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception!', { message: err.message, stack: err.stack });
    this.server.close(() => process.exit(1));
});

process.on('unhandledRejection', (reason: Error) => {
    logger.error('Unhandled Rejection!', { message: reason.message, stack: reason.stack });
    this.server.close(() => process.exit(1));
});
```

### 4. **Graceful Shutdown**
A method is implemented to **safely disconnect resources** (such as database connections) in case of critical errors.

**Example of graceful shutdown**:
```ts
private async shutdown(reason: string) {
    console.log(`Shutting down due to ${reason}`);

    this.server.close(async () => {
        console.log('HTTP server closed.');

        try {
            await closeDBConnection();  // Close the database connection
            console.log('Database connection closed.');
            process.exit(0);
        } catch (err) {
            logger.error('Error during shutdown', { message: err.message });
            process.exit(1);
        }
    });

    setTimeout(() => {
        console.error('Forced shutdown due to timeout.');
        process.exit(1);
    }, 10000);
}
```

### 5. **Differentiating Between Errors and Empty Responses (404 vs 200)**
We established conventions for when to return a **404 Not Found** versus a **200 OK with an empty array**, depending on the context of the request:
- **404 Not Found**: When requesting a specific resource (e.g., user by ID) that doesn't exist.
- **200 OK with an empty array**: When querying a list of resources with filters and finding no results (e.g., no users match the criteria).

---

## How It All Works

### 1. **Throwing Errors Using `AppError`**
At any point in the code where an operational error is identified (such as a resource not found or validation error), we throw an `AppError`:
```ts
const user = await User.findById(id);
if (!user) {
    throw new AppError('User not found', 404);
}
```

### 2. **Capturing Errors in the Global Error Handler**
All errors thrown by the application are captured by the **global error handler**, which logs them and returns a standardized JSON response to the client. If the error is unexpected, the client receives a generic message, while the details are logged for debugging.

### 3. **Handling Uncaught Exceptions**
If an error is not captured (e.g., a promise is rejected without `.catch()`), the system captures it, logs it, and safely shuts down the server to avoid an inconsistent state.

### 4. **Graceful Shutdown**
During a critical shutdown, such as an uncaught exception or `SIGTERM` signal, the application will close the database connections and the HTTP server properly, ensuring no open requests or resources are left hanging.

---

## Summary
This error-handling system ensures that:
- Errors are managed **consistently** and communicated clearly to the client.
- All errors are **logged** for later analysis.
- The application can handle **critical errors** like uncaught exceptions and promise rejections, preventing unexpected crashes.
- The server and database are safely shut down in the event of serious errors, avoiding data corruption or instability.

For any questions or more detailed explanations, feel free to ask!

--- 