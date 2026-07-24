# Guía de QA funcional

## Datos de prueba

Usar únicamente nombres, teléfonos, direcciones y NIT ficticios. No introducir datos reales de clientes ni credenciales de proveedores.

## Casos prioritarios

| ID | Escenario | Resultado esperado |
|---|---|---|
| QA-01 | Crear pedido Web | Se asigna ID único, canal Web, estado Confirmada y evento de auditoría. |
| QA-02 | Crear pedido POS | Conserva el mismo contrato y llega al tablero unificado. |
| QA-03 | Mensaje de WhatsApp manual | Operador registra pedido y se etiqueta WhatsApp sin perder trazabilidad. |
| QA-04 | Audio: pedido entendible | Se identifican producto, cantidad y restricciones; se muestra resumen antes de confirmar. |
| QA-05 | Audio ambiguo | El asistente pregunta/solicita aclaración; no crea orden. |
| QA-06 | Sugerencia comercial | Sólo recomienda productos presentes en el catálogo aprobado. |
| QA-07 | No confirmación | La orden permanece en borrador y no se envía a operación/facturación. |
| QA-08 | Confirmación | Cambia a Confirmada y muestra emisión hacia ambos adaptadores demo. |
| QA-09 | Doble envío | La misma llave de idempotencia no crea dos órdenes. |
| QA-10 | Falla de integración | Orden queda recuperable, visible y sin duplicar factura. |

## Evidencia solicitada

Para cada caso: ID de prueba, fecha, navegador/dispositivo, datos ficticios usados, resultado, captura o grabación breve y defecto encontrado. Reportar defectos con severidad, pasos de reproducción y comportamiento esperado/actual.

## Criterios de salida del demo

- Todos los casos QA-01 a QA-08 aprobados.
- Ningún flujo crea una orden sin confirmación explícita.
- Ninguna pantalla expone secretos, tokens ni PII real.
- Los mensajes de integración se presentan claramente como simulados.
# Hito validado en laboratorio

Se aprobo conectividad STS Gen 2 Cloud, sincronizacion de catalogo, pedido Web/WhatsApp/voz, modificadores, notas y los dos desenlaces de pago: check abierto con efectivo y check cerrado con tarjeta. Las ordenes fueron verificadas en KDS y POS.

## Casos de regresion del hito

| ID | Escenario | Resultado esperado |
|---|---|---|
| INT-01 | Validar conexion | OIDC, Revenue Center y tenders responden correctamente. |
| INT-02 | Sincronizar catalogo | Se visualizan los productos del alcance configurado con imagenes, precios y modificadores. |
| INT-03 | Modificadores y notas | Las selecciones permitidas y `informationLines` llegan a Simphony. |
| INT-04 | Efectivo | Crea un check abierto visible en POS/KDS para cobrar al recoger. |
| INT-05 | Tarjeta | Aplica el tender configurado y crea un check cerrado. |
| INT-06 | Nombre de orden | Se muestra en POS/KDS. |
| INT-07 | Falla operativa | Ante un 4xx/5xx se informa el fallo y se registra Actividad sin credenciales. |

> Diagnostico: si el catalogo sincroniza pero el posteo devuelve `503 User is not available`, verificar primero POS Service Host y workstation en el CAP.
