# Arquitectura objetivo

## Contexto

OmniOrder Lab es un acelerador de demostración. Su siguiente etapa es una plataforma operable: recibe pedidos de varios canales, normaliza una orden, coordina la operación y emite la información necesaria para facturación.

## Diseño lógico

```text
Canales (web | POS | WhatsApp Business | voz)
                  ↓
         API de ingreso / autenticación
                  ↓
      Normalizador de orden canónica
                  ↓
    Servicio de órdenes + outbox transaccional
             ↓                    ↓
     Bus de eventos             Auditoría
             ↓
 Adaptador Simphony      Adaptador STS Gen 2
```

## Contrato de orden canónica

Cada petición debe incluir `orderId`, `idempotencyKey`, `channel`, `storeId`, `items`, `fulfillment`, `customer` y `consent`. Los adaptadores nunca reciben el formato de un canal directamente. El contrato se versiona (`v1`, `v2`) y se valida antes de persistir.

Estados permitidos: `DRAFT → CONFIRMED → SENT_TO_OPERATIONS → PREPARED → INVOICED`, con ramas controladas de `CANCELLED` y `FAILED_RETRYABLE`.

## Seguridad

- Autenticación de operadores con SSO/OIDC y MFA en ambientes no demo.
- Autorización RBAC: operador, supervisor, soporte e integrador; mínimo privilegio por defecto.
- Secretos exclusivamente en un gestor de secretos; nunca en el repositorio, front-end o trazas.
- TLS extremo a extremo; cifrado en reposo para datos operativos.
- PII minimizada y separada de eventos de negocio; retención y eliminación configurables.
- Firmar/verificar webhooks, limitar tasa, validar esquemas y aplicar protección contra replay.
- Llaves de idempotencia obligatorias para evitar doble cobro/doble factura.
- Registro de auditoría append-only con `correlationId`, actor, acción, resultado y marca de tiempo.
- La IA recibe sólo menú, contexto de pedido permitido y políticas; no accede a facturación ni confirma órdenes sin una herramienta autorizada y confirmación final.

## Integraciones

Cada integración tiene una interfaz propia, timeouts, reintentos con backoff, circuito abierto y cola de fallos. Ningún fallo de STS o Simphony bloquea permanentemente la captura: la orden queda en estado recuperable y visible para soporte.

Antes de integrar, se debe obtener: contrato/API, autenticación, catálogo/tiendas, manejo de impuestos, errores, idempotencia y ambiente sandbox de cada proveedor.

## Escalabilidad y operación

- API sin estado y consumidores de eventos escalables horizontalmente.
- Base de datos relacional para órdenes + outbox; cola gestionada para entrega de eventos.
- Observabilidad: logs estructurados, métricas de latencia/error por adaptador, trazas distribuidas y alertas por órdenes atascadas.
- Despliegue por ambientes (`dev`, `demo`, `staging`, `prod`) con configuración separada.
- Backups probados, plan de recuperación y pruebas de carga antes de producción.
