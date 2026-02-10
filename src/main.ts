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

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`API: http://localhost:${port}/api`);
}
bootstrap();
