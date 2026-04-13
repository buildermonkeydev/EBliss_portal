import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { VncProxyService } from './console/vnc-proxy.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  

  app.enableCors();
  

  
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

 const httpServer = app.getHttpServer();
  const vncProxy = app.get(VncProxyService);
  vncProxy.attach(httpServer);

  console.log('NestJS running on :3001, VNC proxy on ws://localhost:3001/vnc-proxy');




}
bootstrap();