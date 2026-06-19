import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    // Extract detailed errors if they are part of a class-validator BadRequestException
    let message = 'Internal Server Error';
    let errors = null;

    if (exception instanceof HttpException) {
      const responseBody: any = exception.getResponse();
      if (typeof responseBody === 'object' && responseBody !== null) {
        message = responseBody.message || exception.message;

        // Handle class-validator error array
        if (Array.isArray(responseBody.message)) {
          message = 'Validation failed';
          errors = responseBody.message.map((msg: string) => ({
            field: msg.split(' ')[0],
            message: msg,
          }));
        }
      } else {
        message = exception.message;
      }
    } else {
      // For unhandled exceptions like database errors
      message = exception?.message || message;
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      message: message,
      errors: errors,
    });
  }
}
