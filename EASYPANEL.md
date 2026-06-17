# Guía de Implementación en Easypanel

Esta guía explica cómo desplegar la aplicación **AppraisalPro (Valuation Suite)**, junto con su base de datos PostgreSQL, utilizando **Easypanel**.

---

## Paso 1: Configurar la Base de Datos PostgreSQL

En tu panel de EasyPanel:
1. Haz clic en **Create Service** (Crear servicio) dentro de tu proyecto.
2. Selecciona **PostgreSQL** de la lista de servicios preestablecidos de bases de datos.
3. Configura los siguientes parámetros ambientales en la pestaña **Environment**:
   - `POSTGRES_DB`: `appraisalpro`
   - `POSTGRES_USER`: `postgres`
   - `POSTGRES_PASSWORD`: `TuClaveSegura123` (Elige una contraseña fuerte)
4. Presiona **Deploy** para iniciar el contenedor de base de datos.

### Cargar el Esquema
Para crear las tablas del archivo `postgres-schema.sql` en tu nueva base de datos, puedes usar la consola interactiva de EasyPanel o conectarte remotamente:
```bash
psql -h <IP_HOST_EASYPANEL> -p <PORT_POSTGRES> -U postgres -d appraisalpro -f postgres-schema.sql
```

---

## Paso 2: Configurar la API de PostgREST

PostgREST convierte automáticamente tu base de datos PostgreSQL en una API RESTful instantánea y de alto rendimiento.

1. En tu panel de EasyPanel, haz clic en **Create Service** y selecciona **App** (Servicio Genérico).
2. Nómbralo `postgrest-api`.
3. En la sección **Docker Image**, ingresa el repositorio oficial de PostgREST:
   - **Image**: `postgrest/postgrest:v12.0.2` (o la versión estable que desees)
4. En la pestaña **Environment Variables**, configura los enlaces hacia la base de datos PostgreSQL creada en el Paso 1:
   - `PGRST_DB_URI`: `postgres://postgres:TuClaveSegura123@postgresql:5432/appraisalpro`
   - `PGRST_DB_SCHEMA`: `public`
   - `PGRST_DB_ANON_ROLE`: `postgres` (Para entornos de desarrollo rápido, o un rol de solo lectura)
   - `PGRST_SERVER_PORT`: `3000`
5. En la pestaña **Domains**, expón un subdominio público para tu API, por ejemplo: `api.tasaciones.tuservicio.com`.
6. Presiona **Deploy**. ¡Tu API estará lista de inmediato!

---

## Paso 3: Desplegar el Dashboard Web (React / Node)

1. En EasyPanel, haz clic de nuevo en **Create Service** -> **App**.
2. Dale el nombre de `appraisalpro-web`.
3. En la sección **Source**, introduce tu repositorio Git donde has guardado este código (por ejemplo, GitHub) asignando las credenciales necesarias.
4. En la sección **Build Pack** o **Build settings**:
   - EasyPanel detectará automáticamente el archivo `package.json`.
   - Asegúrate de definir el comando de compilación: `npm run build`
   - Establece la carpeta de salida (Publish Directory) como: `dist`
5. En la sección de **Domains**, asigna un subdominio principal para tus tasadores, por ejemplo: `tasaciones.tuservicio.com`.
6. Presiona el botón **Deploy**. EasyPanel compilará y servirá la aplicación de forma segura detrás de un proxy inverso HTTPS automático con certificados SSL de Let's Encrypt.

---

## Esquema de Conectividad Estructural

```
  ┌─────────────────────────────────────────────────────────────┐
  │                 Navegación / Cliente Web                    │
  │                  (appraisalpro-web:80)                      │
  └──────────────────────────────┬──────────────────────────────┘
                                 │ Requerimientos HTTPS
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                        PostgREST API                        │
  │                     (postgrest-api:3000)                    │
  └──────────────────────────────┬──────────────────────────────┘
                                 │ Queries de SQL Directas
                                 ▼
  ┌─────────────────────────────────────────────────────────────┐
  │                PostgreSQL Relational DB                     │
  │                    (postgresql:5432)                        │
  └─────────────────────────────────────────────────────────────┘
```
