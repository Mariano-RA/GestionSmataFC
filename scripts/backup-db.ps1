# =============================================================================
# Script de Backup de Base de Datos PostgreSQL (PowerShell)
# =============================================================================
# Este script realiza backups automáticos de la base de datos PostgreSQL
# con compresión y retención de backups antiguos.
#
# Uso:
#   .\backup-db.ps1
#
# Variables de entorno requeridas:
#   DATABASE_URL - URL de conexión a PostgreSQL
#
# Opcional:
#   $env:BACKUP_DIR - Directorio donde guardar backups (default: .\backups)
#   $env:BACKUP_RETENTION_DAYS - Días de retención (default: 30)
# =============================================================================

param(
    [string]$BackupDir = ".\backups",
    [int]$RetentionDays = 30
)

# Usar variables de entorno si están definidas
if ($env:BACKUP_DIR) { $BackupDir = $env:BACKUP_DIR }
if ($env:BACKUP_RETENTION_DAYS) { $RetentionDays = $env:BACKUP_RETENTION_DAYS }

$ErrorActionPreference = "Stop"

# --- Funciones ---
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Green
}

function Write-Warn {
    param([string]$Message)
    Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Write-Err {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# --- Validaciones ---
if (-not $env:DATABASE_URL) {
    Write-Err "DATABASE_URL no está configurada"
    exit 1
}

# Crear directorio de backups si no existe
if (-not (Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir | Out-Null
    Write-Info "Directorio de backups creado: $BackupDir"
}

# --- Configuración ---
$Timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
$BackupFile = "db_backup_$Timestamp.sql"
$BackupPath = Join-Path $BackupDir $BackupFile
$CompressedPath = "$BackupPath.gz"

Write-Info "Iniciando backup de base de datos..."
Write-Info "Archivo: $BackupFile"

# --- Parsing de DATABASE_URL ---
# Formato: postgresql://user:password@host:port/database?params
$DatabaseUrl = $env:DATABASE_URL
$Pattern = 'postgresql://([^:]+):([^@]+)@([^:/]+)(?::(\d+))?/([^?]+)'

if ($DatabaseUrl -match $Pattern) {
    $DbUser = $Matches[1]
    $DbPass = $Matches[2]
    $DbHost = $Matches[3]
    $DbPort = if ($Matches[4]) { $Matches[4] } else { "5432" }
    $DbName = $Matches[5]
} else {
    Write-Err "DATABASE_URL tiene formato inválido"
    exit 1
}

# --- Verificar pg_dump ---
$pgDumpPath = Get-Command pg_dump -ErrorAction SilentlyContinue

if (-not $pgDumpPath) {
    Write-Err "pg_dump no está instalado o no está en PATH"
    Write-Info "Instala PostgreSQL client tools desde: https://www.postgresql.org/download/"
    exit 1
}

# --- Realizar Backup ---
try {
    $env:PGPASSWORD = $DbPass
    
    $arguments = @(
        "-h", $DbHost,
        "-p", $DbPort,
        "-U", $DbUser,
        "-d", $DbName,
        "--no-owner",
        "--no-acl",
        "--clean",
        "--if-exists",
        "-f", $BackupPath
    )
    
    & pg_dump @arguments
    
    if ($LASTEXITCODE -ne 0) {
        throw "pg_dump falló con código: $LASTEXITCODE"
    }
    
    # Comprimir con gzip (si está disponible) o con .NET
    if (Get-Command gzip -ErrorAction SilentlyContinue) {
        & gzip -f $BackupPath
        $BackupPath = $CompressedPath
    } else {
        # Comprimir con .NET si gzip no está disponible
        Write-Info "gzip no disponible, comprimiendo con .NET..."
        Add-Type -AssemblyName System.IO.Compression.FileSystem
        $source = $BackupPath
        $destination = "$BackupPath.zip"
        [System.IO.Compression.ZipFile]::CreateFromDirectory(
            (Split-Path $source),
            $destination,
            [System.IO.Compression.CompressionLevel]::Optimal,
            $false
        )
        Remove-Item $BackupPath
        $BackupPath = $destination
    }
    
    $BackupSize = (Get-Item $BackupPath).Length / 1MB
    Write-Info "✓ Backup completado exitosamente"
    Write-Info "  Tamaño: $([math]::Round($BackupSize, 2)) MB"
    Write-Info "  Ubicación: $BackupPath"
    
} catch {
    Write-Err "Falló el backup de la base de datos: $_"
    exit 1
} finally {
    Remove-Item Env:\PGPASSWORD -ErrorAction SilentlyContinue
}

# --- Limpiar backups antiguos ---
Write-Info "Limpiando backups antiguos (>$RetentionDays días)..."

$CutoffDate = (Get-Date).AddDays(-$RetentionDays)
$OldBackups = Get-ChildItem -Path $BackupDir -Filter "db_backup_*.sql*" |
    Where-Object { $_.LastWriteTime -lt $CutoffDate }

$DeletedCount = 0
foreach ($OldBackup in $OldBackups) {
    Remove-Item $OldBackup.FullName -Force
    Write-Info "  Eliminado: $($OldBackup.Name)"
    $DeletedCount++
}

if ($DeletedCount -eq 0) {
    Write-Info "  No hay backups antiguos para eliminar"
} else {
    Write-Info "✓ Eliminados $DeletedCount backup(s) antiguo(s)"
}

# --- Resumen ---
$TotalBackups = (Get-ChildItem -Path $BackupDir -Filter "db_backup_*.sql*").Count
$TotalSize = (Get-ChildItem -Path $BackupDir -Recurse | Measure-Object -Property Length -Sum).Sum / 1MB

Write-Info "========================================="
Write-Info "Backup completado"
Write-Info "Total de backups: $TotalBackups"
Write-Info "Espacio usado: $([math]::Round($TotalSize, 2)) MB"
Write-Info "========================================="

exit 0
