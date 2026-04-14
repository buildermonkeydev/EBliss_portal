import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { VncProxyService } from './console/vnc-proxy.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Configure CORS with specific allowed origins
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3002',
      'https://admin.buildermonkey.com',
      'https://nexus.buildermonkey.com',
      'https://buildermonkey.com',
      'https://www.buildermonkey.com',
      // Add any other domains you need
    ],
    credentials: true, // Allow cookies and authentication headers
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
      'User-Agent',
      'Referer',
    ],
    exposedHeaders: ['Content-Disposition', 'X-Total-Count'],
    maxAge: 86400, // Cache preflight requests for 24 hours
  });
  
  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('Ebliss Cloud API')
    .setDescription('Ebliss Cloud Infrastructure Management API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`Ebliss backend is running on http://localhost:${port}`);
  console.log(`CORS enabled for: https://admin.buildermonkey.com, https://nexus.buildermonkey.com`);

  const httpServer = app.getHttpServer();
  const vncProxy = app.get(VncProxyService);
  vncProxy.attach(httpServer);

  console.log('NestJS running on :3001, VNC proxy on ws://localhost:3001/vnc-proxy');
}

bootstrap();