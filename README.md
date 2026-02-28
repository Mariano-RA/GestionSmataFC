# Smata - Gestor de Cuentas Compartidas

Aplicación web moderna construida con **Next.js + React + TypeScript + Prisma + SQLite** para gestionar cuentas compartidas en grupos de fútbol.

## 🚀 Stack Tecnológico

> 📁 **Documentación adicional**
> Los archivos de configuración y de seguimiento (SETUP, TECHNOLOGY, MIGRATION, FINISHED) se han movido a la carpeta `docs/` para mantener el directorio raíz libre de ruido.
> 
> Consulta esos documentos si necesitas información histórica o detalles internos.

## 🚀 Stack Tecnológico

- **Frontend**: React 18 + TypeScript + CSS puro
- **Backend**: Next.js API Routes
- **Base de Datos**: SQLite con Prisma ORM
- **Package Manager**: npm

## 📋 Funcionalidades

- ✅ Gestión de participantes
- ✅ Registro de pagos
- ✅ Seguimiento de gastos
- ✅ Cálculo automático de deudas
- ✅ Análisis y comparativas mensuales
- ✅ Exportación de datos
- ✅ Interfaz responsive para móviles

## ⚙️ Instalación

### 1. Clonar o copiar el proyecto

```bash
cd smata-app
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar la base de datos

```bash
# Crear y migrar la base de datos
npm run db:push

# Inicializar con datos por defecto (opcional)
npm run db:seed
```

### 4. Iniciar en modo desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`

## 📁 Estructura del Proyecto

```
src/
├── app/
│   ├── api/                    # API Routes
│   │   ├── config/            # Configuración
│   │   ├── participants/       # Gestión de participantes
│   │   ├── payments/          # Gestión de pagos
│   │   └── expenses/          # Gestión de gastos
│   ├── layout.tsx             # Layout principal
│   ├── page.tsx               # Página principal
│   └── globals.css            # Estilos globales
├── components/                 # Componentes React
│   ├── Header.tsx
│   ├── Nav.tsx
│   ├── Tabs.tsx
│   ├── Dashboard.tsx
│   ├── Participants.tsx
│   ├── Payments.tsx
│   ├── Expenses.tsx
│   ├── Debtors.tsx
│   ├── Comparison.tsx
│   ├── Settings.tsx
│   └── HistoryModal.tsx
├── lib/
│   ├── db.ts                  # Instancia de Prisma
│   └── utils.ts               # Funciones utilitarias
└── types/
    └── index.ts               # TypeScript interfaces
prisma/
├── schema.prisma              # Esquema de base de datos
└── seed.js                    # Script para inicializar BD

docs/                         # Documentación adicional (migración, tecnología, etc.)
```

## 🗄️ Modelos de Base de Datos

### Participant
- ID, Nombre, Teléfono, Notas, Estado (activo/inactivo), Fecha de unión

### Payment
- ID, Participante, Fecha, Monto, Método, Nota, Registro

### Expense
- ID, Nombre, Monto, Fecha, Registro

### Config
- ID, Clave, Valor (para configuración de la app)

## 🔄 APIs Disponibles

### Participantes
- `GET /api/participants` - Listar todos
- `POST /api/participants` - Crear nuevo
- `GET /api/participants/[id]` - Obtener uno
- `PATCH /api/participants/[id]` - Actualizar
- `DELETE /api/participants/[id]` - Eliminar

### Pagos
- `GET /api/payments` - Listar todos
- `POST /api/payments` - Crear nuevo
- `DELETE /api/payments/[id]` - Eliminar

### Gastos
- `GET /api/expenses` - Listar todos
- `POST /api/expenses` - Crear nuevo
- `DELETE /api/expenses/[id]` - Eliminar

### Configuración
- `GET /api/config` - Obtener configuración
- `POST /api/config` - Guardar configuración

## 🚢 Desplegar a Producción

### Con Vercel (recomendado)

```bash
npm install -g vercel
vercel
```

### Con Docker

```bash
docker build -t smata-app .
docker run -p 3000:3000 smata-app
```

## 📝 Configuración Inicial

La aplicación viene con una configuración por defecto:
- **Monto mensual**: $1,510,000
- **Alquiler**: $310,000
- **Máximo de participantes**: 25

Puedes modificar estos valores en la pestaña "Config" de la aplicación.

## 💾 Respaldar Datos

En la pestaña de Configuración puedes:
- **Descargar BD**: Exporta todos tus datos en formato JSON
- **Importar BD**: Restaura datos desde un archivo JSON previamente descargado

## 🤝 Soporte

Si encuentras problemas o tienes sugerencias, por favor abre un issue en el repositorio.

## 📄 Licencia

MIT