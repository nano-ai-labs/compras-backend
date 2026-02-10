import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  console.log("ENV GOOGLE_CLIENT_ID:", process.env.GOOGLE_CLIENT_ID);

  app.setGlobalPrefix('api');
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));

  // 1. Cambiamos PORT_NUMBER por PORT (Google inyecta 'PORT' automáticamente)
  const port = process.env.PORT_NUMBER || 4000;

  // 2. IMPORTANTE: Agregamos '0.0.0.0' para que sea visible fuera del contenedor
  // Esto no afecta tu trabajo local, pero es VITAL para el despliegue.
  await app.listen(port, '0.0.0.0');

  // Ajustamos el log para que muestre la IP correcta
  console.log(`API corriendo en el puerto: ${port}`);
}
bootstrap();