@echo off
REM Script de setup automático para Smata (Windows)
REM Ejecutar con: setup.bat

echo 🚀 Iniciando setup de Smata...
echo.

REM Paso 1: Instalar dependencias
echo 📦 Paso 1: Instalando dependencias...
echo    Ejecutando: npm install
call npm install
if %errorlevel% neq 0 (
  echo ❌ Error al instalar dependencias
  exit /b 1
)
echo ✅ Dependencias instaladas
echo.

REM Paso 2: Configurar base de datos
echo 🗄️  Paso 2: Configurando base de datos...
echo    Ejecutando: npm run db:push
call npm run db:push
if %errorlevel% neq 0 (
  echo ❌ Error configurando base de datos
  exit /b 1
)
echo ✅ Base de datos configurada
echo.

REM Paso 3: (Opcional) Ejecutar seed
echo 🌱 Paso 3: Inicializando datos por defecto...
echo    Ejecutando: npm run db:seed
call npm run db:seed
if %errorlevel% neq 0 (
  echo ⚠️  Advertencia: No se pudieron cargar datos por defecto
)
echo ✅ Datos inicializados
echo.

REM Paso 4: Mostrar instrucciones finales
echo ✨ ¡Setup completado!
echo.
echo 📝 Para iniciar la aplicación:
echo    npm run dev
echo.
echo 🌐 Abre: http://localhost:3000
echo.
echo 📚 Documentación:
echo    - SETUP.md        - Guía rápida
echo    - README.md       - Documentación completa
echo    - TECHNOLOGY.md   - Arquitectura técnica
echo    - MIGRATION.md    - Cambios desde HTML
echo.
pause
