#!/bin/bash
# Script de setup automático para Smata
# Ejecutar con: bash setup.sh

echo "🚀 Iniciando setup de Smata..."
echo ""

# Paso 1: Instalar dependencias
echo "📦 Paso 1: Instalando dependencias..."
echo "   Ejecutando: npm install"
npm install
if [ $? -ne 0 ]; then
  echo "❌ Error al instalar dependencias"
  exit 1
fi
echo "✅ Dependencias instaladas"
echo ""

# Paso 2: Configurar base de datos
echo "🗄️  Paso 2: Configurando base de datos..."
echo "   Ejecutando: npm run db:push"
npm run db:push
if [ $? -ne 0 ]; then
  echo "❌ Error configurando base de datos"
  exit 1
fi
echo "✅ Base de datos configurada"
echo ""

# Paso 3: (Opcional) Ejecutar seed
echo "🌱 Paso 3: Inicializando datos por defecto..."
echo "   Ejecutando: npm run db:seed"
npm run db:seed
if [ $? -ne 0 ]; then
  echo "⚠️  Advertencia: No se pudieron cargar datos por defecto"
fi
echo "✅ Datos inicializados"
echo ""

# Paso 4: Mostrar instrucciones finales
echo "✨ ¡Setup completado!"
echo ""
echo "📝 Para iniciar la aplicación:"
echo "   npm run dev"
echo ""
echo "🌐 Abre: http://localhost:3000"
echo ""
echo "📚 Documentación:"
echo "   - SETUP.md        - Guía rápida"
echo "   - README.md       - Documentación completa"
echo "   - TECHNOLOGY.md   - Arquitectura técnica"
echo "   - MIGRATION.md    - Cambios desde HTML"
echo ""
