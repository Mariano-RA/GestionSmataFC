# ⚽ Smata FC - Gestor de Cuentas Compartidas

Aplicación web moderna para gestionar cuentas compartidas en grupos de fútbol. Construida con **Next.js**, **React**, **TypeScript** y **Prisma** sobre **PostgreSQL**.

---

## 🚀 Stack Tecnológico
- **Frontend:** React 18 + TypeScript + CSS
- **Backend:** Next.js API Routes
- **Base de Datos:** PostgreSQL (antes SQLite) + Prisma ORM
- **Gestor de paquetes:** npm

---

## 🧩 Funcionalidades
- Gestión de participantes
- Registro y seguimiento de pagos
- Control de gastos
- Cálculo automático de deudas
- Comparativas mensuales
- Exportación/importación de datos
- Interfaz responsive

---

## ⚙️ Instalación y Desarrollo

1. **Clona el repositorio:**
   ```bash
   git clone https://github.com/Mariano-RA/GestionSmataFC.git
   cd GestionSmataFC
   ```
2. **Instala dependencias:**
   ```bash
   npm install
   ```
3. **Configura la base de datos:**
   - Edita `.env` y coloca tu URL de PostgreSQL (Neon recomendado)
   - Aplica migraciones:
     ```bash
     npx prisma migrate deploy
     ```
   - (Opcional) Seed inicial:
     ```bash
     node prisma/addParticipants.js
     ```
4. **Inicia en modo desarrollo:**
   ```bash
   npm run dev
   ```
   Accede a `http://localhost:3000`

---

## 🗂️ Estructura del Proyecto
```
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── config/
│   │   │   ├── participants/
│   │   │   ├── payments/
│   │   │   └── expenses/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   ├── lib/
│   └── types/
├── prisma/
│   ├── schema.prisma
│   ├── addParticipants.js
│   └── seed.js
├── docs/
│   ├── SETUP.md
│   ├── TECHNOLOGY.md
│   ├── MIGRATION.md
│   └── FINISHED.md
├── .env
├── Dockerfile
└── README.md
```

---

## 🗄️ Modelos de Base de Datos
- **Participant:** id, name, phone, notes, active, joinDate
- **Payment:** id, participantId, date, amount, method, note
- **Expense:** id, name, amount, date
- **Config:** id, key, value

---

## 🔄 API Endpoints

### Participantes
- `GET /api/participants` — Listar todos
- `POST /api/participants` — Crear nuevo
- `GET /api/participants/[id]` — Obtener uno
- `PATCH /api/participants/[id]` — Actualizar
- `DELETE /api/participants/[id]` — Eliminar

### Pagos
- `GET /api/payments` — Listar todos
- `POST /api/payments` — Crear nuevo
- `DELETE /api/payments/[id]` — Eliminar

### Gastos
- `GET /api/expenses` — Listar todos
- `POST /api/expenses` — Crear nuevo
- `DELETE /api/expenses/[id]` — Eliminar

### Configuración
- `GET /api/config` — Obtener configuración
- `POST /api/config` — Guardar configuración

---

## 🚢 Despliegue

### Vercel (recomendado)
1. Conecta tu repo en [vercel.com](https://vercel.com)
2. Agrega la variable de entorno `DATABASE_URL`
3. Deploy automático

### Docker
```bash
docker build -t smata-app .
docker run -p 3000:3000 smata-app
```

---

## 📝 Configuración Inicial
- **Monto mensual:** $1,510,000
- **Alquiler:** $310,000
- **Máximo de participantes:** 25

Puedes modificar estos valores en la pestaña "Config" de la app.

---

## 💾 Backup y Restore
- Exporta todos tus datos en JSON desde la pestaña de Configuración
- Importa datos desde un archivo JSON

---

## 🤝 Soporte
¿Problemas o sugerencias? Abre un issue en GitHub.

---

## 📄 Licencia
MIT