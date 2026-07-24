# OmniOrder Lab

> Hito integrado: pedidos Web, WhatsApp simulado y voz llegan a Simphony por STS Gen 2 Cloud, con checks abiertos/cerrados verificados en KDS/POS. Consulta [el detalle del hito](docs/MILESTONE-STS-GEN2.md).

Laboratorio de comercio omnicanal para demostrar una orden única desde Web, POS, WhatsApp y audio, con trazabilidad hacia operación (Simphony) y facturación (STS Gen 2).

## Alcance de esta primera versión

- Interfaz demostrable de captura de pedidos por Web, POS y WhatsApp.
- Flujo de audio: transcripción del navegador o entrada manual, interpretación y sugerencia comercial.
- Lista unificada de órdenes, estados e indicadores de integración simulados.
- Sin conexión a cuentas personales de WhatsApp ni datos de clientes reales.

## Principios no negociables

1. **Una orden canónica:** todos los canales producen el mismo contrato de orden.
2. **Confirmación explícita:** la IA puede entender y sugerir; no crea una venta ni factura sin aprobación.
3. **Integraciones aisladas:** STS Gen 2 y Simphony se consumen únicamente mediante adaptadores versionados.
4. **Datos mínimos:** el demo no requiere PII real ni credenciales de producción.
5. **Trazabilidad:** cada transición debe emitir un evento auditable, con correlación e idempotencia.

## Documentación

- [Arquitectura y seguridad](docs/ARCHITECTURE.md)
- [Guía de QA funcional](docs/QA-FUNCTIONAL.md)
- [Backlog de evolución](docs/ROADMAP.md)

## Ejecución local

Este proyecto usa el runtime web incluido en su entorno. Una vez instaladas las dependencias:

```powershell
npm ci
npm run dev
```

## Admin local de Simphony

Con el proyecto corriendo, abre `/admin`. El panel solicita los valores de STS Gen2 Services URL, OpenID Provider URL, Client ID, cuenta API y el contexto `orgShortName`, `locRef` y `rvcRef`.

Las credenciales se usan sólo para la solicitud que ejecutas: no se persisten, no se muestran en el resultado y no se escriben en Git. El orden seguro de prueba es: validar autenticación/RVC, consultar el resumen de menús, sincronizar un menú, validar los `menuItemId` cuyo nombre contiene `hamburguesa` y, sólo entonces, crear un `isTrainingCheck`.

## Demo portable para Windows

El directorio `portable-template` contiene los scripts que se incluyen en la distribución autocontenida de Windows. El kit final se extrae en la VM y se inicia con `start-demo.ps1`; no requiere Git ni una instalación global de Node.js. La distribución no incluye credenciales.

## Límites del demo

WhatsApp personal puede utilizarse para enviar un mensaje real durante la presentación, pero se registra manualmente en el laboratorio. La automatización futura debe usar la plataforma oficial de WhatsApp Business con un número de negocio dedicado.
