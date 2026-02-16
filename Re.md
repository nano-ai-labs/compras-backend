# Backend Architecture - NestJS + Prisma

## 📌 Principios Generales

- Arquitectura modular estricta.
- Prisma es la única capa de acceso a datos.
- Controllers no contienen lógica de negocio.
- Validación siempre mediante DTOs.
- schema.prisma es la fuente de verdad.

---

## 🧱 Capa de Datos (Prisma)

### schema.prisma
- Define todos los modelos.
- Cualquier cambio requiere migración.

### PrismaService
- Servicio global.
- Se inyecta en Services.
- Nunca se usa directamente en Controllers.

---

## 🧩 Estructura por Módulo

Ejemplo: trips/

- trips.module.ts → registra controller y service
- trips.controller.ts → define rutas y guards
- trips.service.ts → lógica de negocio y uso de Prisma
- dto/ → validación con class-validator

---

## 🔒 Reglas Estrictas

- No usar Prisma en Controllers.
- No acceder a base de datos fuera de Services.
- No saltarse DTOs.
- No duplicar lógica entre módulos.


## 🤖 Instrucciones para IA

Siempre:
- Indica qué archivos vas a modificar.
- Explica por qué.
- No rompas la separación por capas.