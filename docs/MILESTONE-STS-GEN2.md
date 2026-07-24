# Hito: pedido omnicanal integrado a Oracle Simphony

## Objetivo alcanzado

Demostrar que una experiencia de autoservicio puede recibir un pedido por Web, WhatsApp simulado o voz, construir una orden unica y enviarla a Oracle Simphony a traves de STS Gen 2 Cloud.

## Capacidades validadas

| Capacidad | Resultado |
|---|---|
| Autenticacion | OIDC y Revenue Center validados desde la configuracion local. |
| Catalogo | Lectura de productos, imagenes, precios y modificadores del menu Simphony. |
| Alcance de catalogo | Catalogo completo o filtro por rango de `objNum` para curar el demo. |
| Experiencia | Busqueda, categorias, carrito, cantidades, modificadores, notas y nombre de orden. |
| Canales | Web, mensaje de WhatsApp simulado y texto/transcripcion de voz. |
| Pago | Efectivo genera check abierto; tarjeta aplica tender y genera check cerrado. |
| Operacion | Ordenes verificadas en KDS y POS. |
| Trazabilidad | Bitacora local con hora, accion, HTTP, duracion y mensaje sin credenciales. |

## Flujo demostrado

```text
Web / WhatsApp simulado / Voz
             |
             v
Seleccion de catalogo + personalizacion
             |
             v
Confirmacion y modalidad de pago
             |
             v
STS Gen 2 Cloud -> Simphony POS / KDS
```

## Salvaguardas del demo

- Las credenciales no se guardan en Git ni se muestran en pantalla.
- La configuracion, el catalogo y los logs viven unicamente durante la sesion local.
- No se capturan datos de tarjeta. La opcion tarjeta representa un tender configurado en Simphony.
- WhatsApp se modela como canal de entrada local; una integracion real debe usar WhatsApp Business Platform y un numero de negocio.
- No usar datos personales reales durante las pruebas.

## Leccion operativa

La sincronizacion del catalogo puede funcionar aunque el POS no este preparado para aceptar un check. Para crear ordenes, el POS Service Host y el workstation configurado deben estar disponibles. Un `503 User is not available` debe tratarse primero como una senal de disponibilidad operativa del CAP/POS antes de cambiar credenciales o empleados.

## Criterio de cierre

El hito se considera cerrado porque se verificaron ordenes abiertas y cerradas desde el e-commerce en los sistemas operativos de Simphony (KDS/POS), con productos, canales, nombre de cliente y notas de prueba.
