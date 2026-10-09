# Guion de exposición de XRE Docs

Nueve diapositivas y ocho minutos en total

El guion distribuye 480 segundos exactos: Victor 2 minutos 55 segundos, Dino 2 minutos 40 segundos y Jorge 2 minutos 25 segundos. Ensayar con cronómetro y respetar la pausa de demostración. La lectura completa debe adaptarse al ritmo natural de cada integrante.

Preparación: iniciar Docker, abrir portal cliente con la cuenta Demo XRE y comprobar 300 puntos. Abrir facturas y el canje entregado. Las credenciales están fuera de la entrega pública, en el archivo privado local. Tener la presentación y su PDF disponibles si falla una recarga.

La evidencia de ejecución es local. No decir que existe un despliegue público certificado. Los avisos de dependencias y privilegios de base forman parte de los pendientes reales. No atribuir porcentajes de ahorro o ventas que no se midieron.

| N.º | Tema | Expone | Tiempo |

| --- | --- | --- | --- |

| 1 | Sistema de lealtad de XRE Docs | Victor | 0:00 a 0:30 |

| 2 | Empresa y proceso seleccionado | Victor | 0:30 a 1:25 |

| 3 | Solución y flujo de lealtad | Victor | 1:25 a 2:10 |

| 4 | Arquitectura de la aplicación | Dino | 2:10 a 3:00 |

| 5 | Funciones principales | Dino | 3:00 a 3:40 |

| 6 | Demostración de compra y canje | Jorge | 3:40 a 5:10 |

| 7 | Controles de seguridad comprobados | Dino | 5:10 a 6:20 |

| 8 | Resultados y pendientes de producción | Jorge | 6:20 a 7:15 |

| 9 | Aporte a la transformación digital | Victor | 7:15 a 8:00 |



# Intervenciones de las diapositivas 1 a 3

Texto sugerido y tiempo asignado

Diapositiva 1  Sistema de lealtad de XRE Docs  Victor Estuardo Florian  0:00 a 0:30

Buenas noches. Somos Victor Estuardo Florian, Dino Fiagioli y Jorge Otoniel Castillo Ortega. Presentamos el sistema de lealtad de XRE Docs. La aplicación registra compras, calcula puntos y controla la entrega de premios. Mostraremos el proceso, una demostración real y las evidencias de seguridad. La implementación que evaluamos funciona en Docker local.

Diapositiva 2  Empresa y proceso seleccionado  Victor Estuardo Florian  0:30 a 1:25

XRE Docs presenta un proyecto que automatiza la fidelización comercial. El proceso comienza cuando una tienda identifica al cliente y registra su factura. Después, el sistema acredita puntos y el cliente solicita un premio. Para justificar el cambio, tomamos como referencia un control manual con registros separados. Ese escenario puede duplicar facturas y dificultar la revisión de saldos o entregas. Nuestra solución busca un registro común, reglas consistentes y responsables identificables. No atribuimos porcentajes de ahorro o ventas porque aún no existe una medición empresarial antes y después del sistema.

Diapositiva 3  Solución y flujo de lealtad  Victor Estuardo Florian  1:25 a 2:10

La solución concentra las validaciones en la API. El personal utiliza su tienda asignada y registra una factura nueva. El servidor comprueba al cliente, calcula puntos y guarda el movimiento. El cliente consulta el saldo y elige un premio. La administración aprueba cuando el producto lo requiere y el personal de tienda prepara y entrega. Cada paso conserva su estado y responsable. Si ocurre una corrección, la cancelación o reversa crea el ajuste correspondiente y mantiene el historial.



# Intervenciones de las diapositivas 4 a 6

Texto sugerido y tiempo asignado

Diapositiva 4  Arquitectura de la aplicación  Dino Fiagioli  2:10 a 3:00

La aplicación utiliza un monorepositorio. Next.js implementa las interfaces administrativas y de clientes. También existe un portal de repartidores. NestJS y Fastify exponen la API que contiene las reglas de negocio. PostgreSQL conserva clientes, facturas, movimientos y canjes mediante Prisma. El navegador envía datos que el servidor debe validar. Docker ejecuta cinco servicios en el entorno evaluado. Para producción pública existe una configuración con Caddy y HTTPS, pero todavía falta validar un dominio público, aislar los servicios y completar el acceso seguro del portal repartidor.

Diapositiva 5  Funciones principales  Dino Fiagioli  3:00 a 3:40

El panel permite buscar clientes y revisar su actividad. La tienda registra facturas y consulta canjes. El cliente puede consultar puntos y nivel, explorar premios y revisar sus compras y solicitudes. La administración configura productos, reglas y usuarios. También hay módulos de comercio online y logística. En esta exposición nos concentramos en el ciclo de lealtad que verificamos completo. Las cuentas y tiendas con la palabra Demo distinguen las operaciones académicas.

Diapositiva 6  Demostración de compra y canje  Jorge Otoniel Castillo Ortega  3:40 a 5:10

Esta es la cuenta Cliente Demo XRE. La factura 8610080001 por Q500 generó 500 puntos con la regla vigente de un punto por quetzal. El cliente solicitó un premio de 200 puntos. El revisor aprobó, el operador preparó y entregó, y el saldo quedó en 300. Ahora mostramos el historial: también hay una solicitud cancelada que devolvió sus puntos y una factura de Q150 que se reversó. El sistema conservó las referencias originales. Si intentamos duplicar la factura o entregar otra vez el mismo canje, el servidor rechaza la operación.

Demostración: 0 a 20 s: abrir el cliente y mostrar 300 puntos. 20 a 45 s: Perfil, Historial de compras y factura de Q500. 45 a 70 s: Historial de canjes o detalle administrativo del entregado. 70 a 90 s: explicar saldo y rechazos. Si la página tarda, usar la evidencia incrustada.



# Intervenciones de las diapositivas 7 a 9

Texto sugerido y tiempo asignado

Diapositiva 7  Controles de seguridad comprobados  Dino Fiagioli  5:10 a 6:20

La seguridad tiene evidencia concreta. Argon2 protege contraseñas y hashes de renovación. Las cookies de acceso y refresh son HttpOnly. Probamos renovar la sesión, reutilizar un refresh antiguo y cerrar sesión: el servidor rechazó las sesiones invalidadas. El operador tiene siete permisos y una tienda. No pudo aprobar un premio ni consultar auditoría. Una solicitud sin CSRF y una tienda no asignada recibieron rechazo. La factura duplicada produjo un conflicto y el canje sin puntos falló. Los registros identifican actores y transiciones. Estos casos acreditan controles específicos. No reemplazan una prueba de penetración ni una prueba de carga.

Diapositiva 8  Resultados y pendientes de producción  Jorge Otoniel Castillo Ortega  6:20 a 7:15

Los resultados son verificables: treinta y siete casos de API aprobaron, las veintitrés pruebas automatizadas pasaron y restauramos la base en un entorno temporal con conteos iguales en cincuenta y tres tablas. El ciclo deja trescientos puntos al cliente y conserva su trazabilidad. También identificamos pendientes reales. La auditoría de dependencias reportó once avisos, uno crítico en Next.js. La conexión de base usa un usuario con privilegios excesivos. Debemos corregir esas condiciones, completar respaldos de archivos y validar HTTPS antes de presentar el sistema como producción pública segura.

Diapositiva 9  Aporte a la transformación digital  Victor Estuardo Florian  7:15 a 8:00

El aporte es un proceso que la empresa puede seguir de principio a fin. El cliente consulta sus beneficios, las tiendas aplican reglas comunes y la administración identifica quién realizó cada operación. Entregamos documentación, manual con capturas, código y evidencias de seguridad. La siguiente fase es remediar los pendientes técnicos y realizar un piloto. Allí se deben medir tiempo por factura, errores de saldo y recurrencia de compra para comprobar el beneficio empresarial. Con esto concluimos la presentación de ocho minutos. Gracias.

