export class ApiResponse {
    constructor(success, message, data) {
        this.success = success;
        this.message = message;
        this.data = data;
    }

    static success(message, data) {
        return new ApiResponse(true, message, data);
    }

    static error(message, data) {
        return new ApiResponse(false, message, data);
    }
}

export class AppError extends Error {
    constructor(message, arg2, arg3) {
        super(message);
        
        // Handle (message, statusCode) for backward compatibility
        if (typeof arg2 === 'number') {
            this.statusCode = arg2;
            this.data = arg3 || null;
        } else {
            // Handle (message, data, statusCode) format
            this.data = arg2 || null;
            this.statusCode = arg3 || 500;
        }
        
        this.status = `${this.statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;

        Error.captureStackTrace(this, this.constructor);
    }
}
