#!/bin/bash

# =============================================================================
# Script de Backup de Base de Datos PostgreSQL
# =============================================================================
# Este script realiza backups automáticos de la base de datos PostgreSQL
# con compresión gzip y retención de backups antiguos.
#
# Uso:
#   bash backup-db.sh
#
# Variables de entorno requeridas:
#   DATABASE_URL - URL de conexión a PostgreSQL
#
# Opcional:
#   BACKUP_DIR - Directorio donde guardar backups (default: ./backups)
#   BACKUP_RETENTION_DAYS - Días de retención (default: 30)
#   S3_BUCKET - Bucket de S3 para subir backups (opcional)
# =============================================================================

set -e  # Exit on error

# --- Configuración ---
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="db_backup_${TIMESTAMP}.sql.gz"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_FILE}"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# --- Funciones ---
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# --- Validaciones ---
if [ -z "$DATABASE_URL" ]; then
    log_error "DATABASE_URL no está configurada"
    exit 1
fi

# Crear directorio de backups si no existe
mkdir -p "$BACKUP_DIR"

# --- Realizar Backup ---
log_info "Iniciando backup de base de datos..."
log_info "Archivo: $BACKUP_FILE"

# Extraer info de conexión de DATABASE_URL
# Formato: postgresql://user:password@host:port/database?params
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:\/]*\).*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Si no hay puerto, usar default
if [ -z "$DB_PORT" ]; then
    DB_PORT=5432
fi

# Realizar backup con pg_dump y comprimir
export PGPASSWORD="$DB_PASS"

if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    --no-owner --no-acl --clean --if-exists \
    | gzip > "$BACKUP_PATH"; then
    
    BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
    log_info "✓ Backup completado exitosamente"
    log_info "  Tamaño: $BACKUP_SIZE"
    log_info "  Ubicación: $BACKUP_PATH"
else
    log_error "Falló el backup de la base de datos"
    exit 1
fi

# --- Subir a S3 (opcional) ---
if [ -n "$S3_BUCKET" ]; then
    log_info "Subiendo backup a S3..."
    
    if command -v aws &> /dev/null; then
        if aws s3 cp "$BACKUP_PATH" "s3://${S3_BUCKET}/backups/${BACKUP_FILE}"; then
            log_info "✓ Backup subido a S3: s3://${S3_BUCKET}/backups/${BACKUP_FILE}"
        else
            log_warn "Falló la subida a S3"
        fi
    else
        log_warn "AWS CLI no instalado, saltando subida a S3"
    fi
fi

# --- Limpiar backups antiguos ---
log_info "Limpiando backups antiguos (>${RETENTION_DAYS} días)..."

DELETED_COUNT=0
while IFS= read -r old_backup; do
    rm -f "$old_backup"
    DELETED_COUNT=$((DELETED_COUNT + 1))
    log_info "  Eliminado: $(basename $old_backup)"
done < <(find "$BACKUP_DIR" -name "db_backup_*.sql.gz" -type f -mtime +${RETENTION_DAYS})

if [ $DELETED_COUNT -eq 0 ]; then
    log_info "  No hay backups antiguos para eliminar"
else
    log_info "✓ Eliminados $DELETED_COUNT backup(s) antiguo(s)"
fi

# --- Resumen ---
TOTAL_BACKUPS=$(ls -1 "$BACKUP_DIR"/db_backup_*.sql.gz 2>/dev/null | wc -l | tr -d ' ')
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)

log_info "========================================="
log_info "Backup completado"
log_info "Total de backups: $TOTAL_BACKUPS"
log_info "Espacio usado: $TOTAL_SIZE"
log_info "========================================="

exit 0
