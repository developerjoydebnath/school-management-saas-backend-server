import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ApiKeyGuard } from './cores/api-key/guards/api-key.guard';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });

  // Serve static files from the 'public' directory
  app.useStaticAssets(join(process.cwd(), 'public'), {
    prefix: '/public/',
  });

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('EduCore API')
    .setDescription('The EduCore Backend Server API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
      },
      'x-api-key',
    )
    .build();

  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: false,
  });

  // Only applying ApiKeyGuard for now.
  // JwtAuthGuard and RolesGuard can be added later if needed globally.
  app.useGlobalGuards(app.get(ApiKeyGuard));

  // Apply Global Response Interceptor and Exception Filter
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.useGlobalFilters(new GlobalExceptionFilter());

  // Apply Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  app.setGlobalPrefix('api/v1');

  const document = SwaggerModule.createDocument(app, config);

  // Apply security globally to all endpoints in Swagger UI
  document.paths = Object.fromEntries(
    Object.entries(document.paths).map(([path, pathItem]) => [
      path,
      Object.fromEntries(
        Object.entries(pathItem).map(([method, operation]) => {
          const existingSecurity = operation.security || [];

          // We want to add 'x-api-key' to all endpoints.
          // If the endpoint already requires 'bearer', we combine them so both are sent.
          // Otherwise, we just require 'x-api-key'.
          let newSecurity;
          if (existingSecurity.length > 0) {
            newSecurity = existingSecurity.map((sec: any) => ({
              ...sec,
              'x-api-key': [],
            }));
          } else {
            newSecurity = [{ 'x-api-key': [] }];
          }

          return [
            method,
            {
              ...operation,
              security: newSecurity,
            },
          ];
        }),
      ),
    ]),
  );
  SwaggerModule.setup('api-docs', app, document);

  const PORT = process.env.PORT ?? 5000;
  await app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
bootstrap();
