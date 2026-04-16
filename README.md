Hola querido/a desarrollador. 

Si quieres correr este proyecto, no es tan difícil

**1. Clonar el repositorio**

**2. Ingresar a la carpeta client y correr**

```
npm install
```

Esto instalará todas las dependencias necesarias

**3. Ingresar a la carpeta server y correr**

```
npm install
```

Esto instalará todas las dependencias necesarias

**4. Pidele el .env a uno de los administradores del proyecto y pégalo en el root del proyecto**

**5. En el root, corre este comando:**

```
docker compose up -d
```

Esto va a iniciar los contenedores de las bases de datos

**6. En la carpeta de server, correr este comando:**

```
npx prisma migrate dev --name init --config ./src/config/prisma.config.ts
```

Esto hará las migraciones a la base de datos de sql

**7. En la carpeta de server, correr este comando**

```
npx prisma generate --config src/config/prisma.config.ts
```

Además, si quieres ver la base de datos de manera visual, puedes entrar al gestor de base de datos de Primsa

```
npx prisma studio --config ./src/config/prisma.config.ts
```
**8. En la carpeta de routing_service cree un entorno virtual con el siguiente comando**

```
python -m venv routing-env
```

**9. En la carpeta de routing_service active el entorno virtual**

```
Mac/Linux: source routing-env/bin/activate
Windows: routing-env\Scripts\activate
```
**10. En la carpeta de routing_service ejecutar el servicio con el siguiente comando:**

```
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

---

Y listo, con esto podrás correr el proyecto en tu computador local. Si tienes algún problema, no dudes en contactar a los desarrolladores iniciales.
