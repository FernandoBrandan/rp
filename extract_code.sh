#!/bin/bash

# ============================================================
# extract_code.sh
# Busca la carpeta 'src' y genera:
#   - structure.txt : árbol de directorios
#   - fullCode.txt  : todo el código separado por archivo
# ============================================================

set -e

# --- Configuración -------------------------------------------------
SRC_DIR_NAME="src"
STRUCTURE_FILE="structure.txt"
FULLCODE_FILE="fullCode.txt"
SEPARATOR="________"

# Extensiones/archivos a ignorar (binarios, imágenes, etc.)
EXCLUDE_PATTERNS=(
  "*.png" "*.jpg" "*.jpeg" "*.gif" "*.bmp" "*.ico" "*.svg"
  "*.pdf" "*.zip" "*.tar" "*.gz" "*.rar" "*.7z"
  "*.exe" "*.dll" "*.so" "*.dylib" "*.bin" "*.class" "*.o"
  "*.mp3" "*.mp4" "*.mov" "*.avi" "*.wav"
  "*.lock"
)

# --- 1. Localizar la carpeta 'src' ---------------------------------
echo "🔍 Buscando carpeta '$SRC_DIR_NAME'..."

SRC_PATH=$(find . -type d -name "$SRC_DIR_NAME" -not -path '*/node_modules/*' -not -path '*/.git/*' 2>/dev/null | head -n 1)

if [ -z "$SRC_PATH" ]; then
    echo "❌ No se encontró ninguna carpeta '$SRC_DIR_NAME'."
    exit 1
fi

echo "✅ Carpeta encontrada en: $SRC_PATH"

# --- 2. Generar structure.txt con 'tree' ---------------------------
echo "🌳 Generando $STRUCTURE_FILE..."
if command -v tree &> /dev/null; then
    tree "$SRC_PATH" > "$STRUCTURE_FILE"
else
    # Fallback si no hay 'tree' instalado
    find "$SRC_PATH" | sed -e "s/[^-][^\/]*\// |/g" -e "s/|\([^ ]\)/|-\1/" > "$STRUCTURE_FILE"
    echo "⚠️  'tree' no instalado, se usó 'find' como fallback."
fi
echo "✅ $STRUCTURE_FILE creado."

# --- 3. Generar fullCode.txt ---------------------------------------
echo "📝 Generando $FULLCODE_FILE..."
> "$FULLCODE_FILE"   # Limpiar/crear archivo

# Construir expresión de exclusión para find
EXCLUDE_EXPR=()
for pat in "${EXCLUDE_PATTERNS[@]}"; do
    EXCLUDE_EXPR+=( -not -name "$pat" )
done

# Recorrer archivos ordenados
find "$SRC_PATH" -type f "${EXCLUDE_EXPR[@]}" | sort | while read -r file; do
    # Ruta relativa al directorio actual
    rel_path="${file#./}"

    {
        echo "$rel_path"
        echo ""
        cat "$file"
        echo ""
        echo "$SEPARATOR"
        echo ""
    } >> "$FULLCODE_FILE"
done

echo "✅ $FULLCODE_FILE creado."
echo ""
echo "🎉 Listo. Archivos generados:"
echo "   - $STRUCTURE_FILE"
echo "   - $FULLCODE_FILE"