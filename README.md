# Task Manager Simple - Versión JavaScript

Sistema de gestión de tareas simplificado en JavaScript plano, HTML básico y CSS mínimo. Usa localStorage como base de datos, sin necesidad de servidor ni configuración.

## Características

- **Sin dependencias**: Solo HTML, CSS y JavaScript puro
- **Sin servidor**: Funciona completamente en el navegador
- **Almacenamiento local**: Usa localStorage del navegador
- **Apariencia antigua**: Diseño minimalista estilo legacy
- **Funcionalidades completas**: Todas las características del sistema original

## Funcionalidades

1. **Autenticación**: Login básico con múltiples usuarios
2. **CRUD de Tareas**: Crear, leer, actualizar y eliminar tareas
3. **CRUD de Proyectos**: Gestión de proyectos
4. **Sistema de Comentarios**: Comentarios en tareas
5. **Historial y Auditoría**: Registro de cambios
6. **Notificaciones**: Sistema de notificaciones por usuario
7. **Búsqueda Avanzada**: Búsqueda con múltiples filtros
8. **Generación de Reportes**: Reportes de tareas, proyectos y usuarios
9. **Exportación CSV**: Exportar datos a CSV

## Uso

1. Abre `index.html` en cualquier navegador moderno
2. Usa las credenciales por defecto:
   - Usuario: `admin`
   - Contraseña: `admin`
3. Explora las diferentes pestañas para usar las funcionalidades

## Estructura

```
TaskManagerSimple/
├── index.html    # Interfaz HTML básica
├── style.css     # Estilos CSS mínimos (apariencia antigua)
├── app.js        # Lógica JavaScript con localStorage
└── README.md     # Este archivo
```

## Datos por Defecto

El sistema se inicializa con:
- **Usuarios**: admin/admin, user1/user1, user2/user2
- **Proyectos**: Proyecto Demo, Proyecto Alpha, Proyecto Beta

## Notas

- Todos los datos se guardan en localStorage del navegador
- Los datos persisten entre sesiones
- Para limpiar los datos, usa la consola del navegador: `localStorage.clear()`
- Compatible con cualquier navegador moderno (Chrome, Firefox, Safari, Edge)
