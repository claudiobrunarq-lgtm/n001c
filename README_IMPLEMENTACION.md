# Arquitectura del Encuentro — PWA v0.5

## Qué trae esta versión

- Firebase modular actual.
- Configuración separada en `firebase-config.js`.
- Casa compartida por código.
- Presencia en tiempo real.
- Feed compartido.
- Jardín compartido.
- Propuesta de actividad generada a partir de las últimas interacciones.
- Pedidos por WhatsApp para audios y fotos.
- Modo demo/local si Firebase todavía no está activo.

## Activar Firebase

1. Abrir `firebase-config.js`.
2. Pegar tu `apiKey` real.
3. Confirmar que `databaseURL` sea:

```js
"https://arquitectura-del-encuentro-default-rtdb.firebaseio.com"
```

4. Cambiar:

```js
demoMode: true
```

por:

```js
demoMode: false
```

## Reglas temporales de Realtime Database

Para pruebas iniciales:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

Estas reglas son abiertas. Sirven para probar. En una versión posterior deben cerrarse.

## Publicar en GitHub Pages

1. Descomprimir el ZIP.
2. Entrar a la carpeta `arquitectura_encuentro_v05`.
3. Subir todos los archivos sueltos al repositorio, reemplazando los anteriores.
4. Commit en `main`.
5. Esperar el deploy de GitHub Pages.
6. Abrir `https://claudiobrunarq-lgtm.github.io/n001c/`.

## Instalar

Android: Chrome → menú ⋮ → Instalar app.

iPhone: Safari → Compartir → Agregar a pantalla de inicio.

## Prueba real

1. Claudio entra como Claudio.
2. Noe entra como Noe.
3. Ambos usan el mismo código: `claudio-noe`.
4. Uno guarda una intervención.
5. El otro debe verla aparecer en el feed compartido.
