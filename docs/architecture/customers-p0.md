# Clientes P0

## Alcance construido

- Registro administrativo de clientes.
- Registro rapido de clientes desde tienda.
- Busqueda por texto, telefono, codigo y estado.
- Consulta de detalle de cliente.
- Edicion de datos basicos y estado.
- Validacion de duplicados por telefono y correo.
- Generacion de codigo unico de cliente.
- Auditoria de creacion y edicion.

## Endpoints

```txt
GET   /api/customers
POST  /api/customers
POST  /api/customers/quick
GET   /api/customers/:id
PATCH /api/customers/:id
```

## Codigo unico

El codigo se genera en backend usando `CustomerCodeSequence`:

```txt
RMT-000001
RMT-000002
```

El frontend no envia ni decide el codigo.

## Registro rapido desde tienda

`POST /api/customers/quick` exige que el usuario tenga tienda activa en sesion.

El backend toma:

```txt
registrationStoreId = InternalSession.activeStoreId
createdByInternalUserId = usuario autenticado
registrationSource = STORE
```

La tienda no se recibe desde el formulario.

## Duplicidad

Antes de crear cliente se busca coincidencia por telefono o correo. Si existe coincidencia,
la API responde conflicto y devuelve datos resumidos del duplicado para que la interfaz pueda
orientar al usuario autorizado.
