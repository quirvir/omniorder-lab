# OmniOrder Demo Portable

## Arranque

1. Extrae el ZIP completo en una carpeta local de Windows.
2. Haz clic derecho en `start-demo.ps1` y selecciona **Run with PowerShell**.
3. El navegador abrirá `http://127.0.0.1:3000`.
4. Para conectar Simphony Cloud abre `http://127.0.0.1:3000/admin`.

No necesitas instalar Git, Node.js ni herramientas de desarrollo.

## Uso seguro

- El kit se enlaza a STS Gen2 Cloud desde el Admin local.
- Las credenciales se usan únicamente para la solicitud actual; nunca se guardan en el kit.
- Primero prueba autenticación, después menú y finalmente crea sólo un `training check`.
- No copies certificados, contraseñas, tokens ni archivos `.env` dentro del ZIP.

## Detener

Ejecuta `stop-demo.ps1`.
