#!/bin/bash

# --- CONFIGURACIÓN ---
URL="http://localhost:3000"
USER_ID="user_$(date +%s)" # Genera un ID de usuario único por cada corrida
PRODUCT_SERIAL="PROD-$(date +%s)"

echo "🚀 Iniciando Test de Flujo Completo (Cart + Catalog)"
echo "👤 User ID: $USER_ID"
echo "-----------------------------------------------"

# 1. CREAR PRODUCTO EN CATÁLOGO
echo "1️⃣  Creando producto en catálogo..."
PRODUCT_RES=$(curl -s -X POST "$URL/products" \
  -H "Content-Type: application/json" \
  -d "{
    \"serial\": \"$PRODUCT_SERIAL\",
    \"name\": \"Teclado Mecánico RGB\",
    \"price\": 85.50,
    \"stock\": 10
  }")

# Extraer el ID del producto (asumiendo que viene en el JSON de respuesta)
PRODUCT_ID=$(echo $PRODUCT_RES | grep -oP '(?<="id":")[^"]+')

if [ -z "$PRODUCT_ID" ]; then
    echo "❌ Error al crear producto. Respuesta: $PRODUCT_RES"
    exit 1
fi

echo "✅ Producto creado con ID: $PRODUCT_ID"
echo ""

# 2. VERIFICAR QUE EL CARRITO ESTÉ VACÍO
echo "2️⃣  Consultando carrito inicial (debe estar vacío)..."
curl -s -X GET "$URL/cart/$USER_ID" | jq 2>/dev/null || echo "🛒 Carrito vacío (OK)"
echo ""

# 3. AÑADIR PRODUCTO AL CARRITO
echo "3️⃣  Añadiendo producto al carrito..."
curl -s -X POST "$URL/cart/$USER_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"item\": {
      \"productId\": \"$PRODUCT_ID\",
      \"quantity\": 2
    }
  }" | jq
echo ""

# 4. CONSULTAR CARRITO ENRIQUECIDO
echo "4️⃣  Consultando carrito enriquecido (Debe mostrar nombre y precio del catálogo)..."
GET_RES=$(curl -s -X GET "$URL/cart/$USER_ID")
echo $GET_RES | jq
echo ""

# 5. ACTUALIZAR CANTIDAD
echo "5️⃣  Actualizando cantidad a 5..."
curl -s -X PUT "$URL/cart/$USER_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"productId\": \"$PRODUCT_ID\",
    \"quantity\": 5
  }" | jq
echo ""

# 6. INTENTAR AÑADIR PRODUCTO QUE NO EXISTE (Validación)
echo "6️⃣  Testeando validación: Añadir producto inexistente..."
curl -s -i -X POST "$URL/cart/$USER_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"item\": {
      \"productId\": \"ccbf4592-cdf3-4eb9-b24e-572cb9b196f1\",
      \"quantity\": 1
    }
  }" | grep "HTTP/"
echo ""

# 7. ELIMINAR PRODUCTO
echo "7️⃣  Eliminando producto del carrito..."
curl -s -X DELETE "$URL/cart/$USER_ID/$PRODUCT_ID" | jq
echo ""

echo "-----------------------------------------------"
echo "🏁 Test finalizado."
