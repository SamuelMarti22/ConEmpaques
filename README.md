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
npx prisma migrate dev --name init
```

Esto hará las migraciones a la base de datos de sql

**7. En la carpeta de server, correr este comando**

```
npx prisma generate
```

¡Importante! Por organización del proyecto, mueve esta carpeta "generated"

---

Y listo, con esto podrás correr el proyecto en tu computador local. Si tienes algún problema, no dudes en contactar a los desarrolladores iniciales.