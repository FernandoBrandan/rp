# test2.sh

#!/bin/bash

# --- CONFIGURACIÓN ---
URL="http://localhost:3000"
USER_ID="user_$(date +%s)"
PRODUCT_SERIAL="PROD-$(date +%s)"
ORDER_ID=""

echo "🚀 Iniciando Test de Flujo Completo (Catalog → Cart → Order → Payment)"
echo "👤 User ID: $USER_ID"
echo "-----------------------------------------------"

# 1. CREAR PRODUCTO EN CATÁLOGO
echo "1️⃣  Creando producto..."
PRODUCT_RES=$(curl -s -X POST "$URL/products" \
  -H "Content-Type: application/json" \
  -d "{
    \"serial\": \"$PRODUCT_SERIAL\",
    \"name\": \"Teclado Mecánico RGB\",
    \"price\": 85.50,
    \"stock\": 10
  }")

PRODUCT_ID=$(echo $PRODUCT_RES | jq -r '.id')
if [ -z "$PRODUCT_ID" ] || [ "$PRODUCT_ID" = "null" ]; then
    echo "❌ Error al crear producto. Respuesta: $PRODUCT_RES"
    exit 1
fi
echo "✅ Producto creado ID: $PRODUCT_ID"
echo ""

# 2. AÑADIR PRODUCTO AL CARRITO
echo "2️⃣  Añadiendo producto al carrito..."
ADD_CART=$(curl -s -X POST "$URL/cart/$USER_ID" \
  -H "Content-Type: application/json" \
  -d "{
    \"item\": {
      \"productId\": \"$PRODUCT_ID\",
      \"quantity\": 2
    }
  }")
echo "$ADD_CART" | jq
echo ""

# 3. CONSULTAR CARRITO (verificar items)
echo "3️⃣  Consultando carrito..."
curl -s -X GET "$URL/cart/$USER_ID" | jq
echo ""

# 4. CREAR ORDEN a partir del carrito (necesitamos los items con precio)
# Primero obtenemos los items del carrito con precio
CART_ITEMS=$(curl -s -X GET "$URL/cart/$USER_ID" | jq -c '.items[] | {productId: .productId, quantity: .quantity, price: .price}')
# Construimos el array de items para la orden
ORDER_ITEMS=$(echo "$CART_ITEMS" | jq -s '.')

echo "4️⃣  Creando orden con los items del carrito..."
ORDER_RES=$(curl -s -X POST "$URL/orders" \
  -H "Content-Type: application/json" \
  -d "{
    \"userId\": \"$USER_ID\",
    \"idempotencyKey\": \"order_$(date +%s)\",
    \"items\": $ORDER_ITEMS
  }")
echo "$ORDER_RES" | jq
ORDER_ID=$(echo "$ORDER_RES" | jq -r '.id')
if [ -z "$ORDER_ID" ] || [ "$ORDER_ID" = "null" ]; then
    echo "❌ Error al crear orden. Respuesta: $ORDER_RES"
    exit 1
fi
echo "✅ Orden creada ID: $ORDER_ID"
echo ""

# 5. ESPERAR PROCESAMIENTO ASÍNCRONO (generación de link de pago)
echo "5️⃣  Esperando 3 segundos para que se genere el link de pago..."
sleep 3

# 6. CONSULTAR ORDEN para obtener paymentUrl (asumiendo GET /orders/:id)
echo "6️⃣  Consultando orden para obtener link de pago..."
ORDER_DETAIL=$(curl -s -X GET "$URL/orders/$ORDER_ID")
echo "$ORDER_DETAIL" | jq
PAYMENT_URL=$(echo "$ORDER_DETAIL" | jq -r '.paymentUrl')
if [ -z "$PAYMENT_URL" ] || [ "$PAYMENT_URL" = "null" ]; then
    echo "⚠️  No se encontró paymentUrl. Verifica que el listener haya actuado."
else
    echo "🔗 Link de pago: $PAYMENT_URL"
fi
echo ""

# 7. SIMULAR WEBHOOK DE PAGO (aprobado)
echo "7️⃣  Simulando webhook de pago aprobado..."
WEBHOOK_RES=$(curl -s -X POST "$URL/payments/webhook" \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"pay_$(date +%s)\",
    \"status\": \"approved\",
    \"metadata\": {
      \"orderId\": \"$ORDER_ID\"
    }
  }")
echo "$WEBHOOK_RES" | jq
echo ""

# 8. ESPERAR ACTUALIZACIÓN DE ESTADO
echo "8️⃣  Esperando 2 segundos para actualización de estado..."
sleep 2

# 9. CONSULTAR ORDEN FINAL (debe estar PAID)
echo "9️⃣  Consultando orden final (estado esperado: PAID)..."
curl -s -X GET "$URL/orders/$ORDER_ID" | jq
echo ""

echo "-----------------------------------------------"
echo "🏁 Test finalizado. Verifica que el estado de la orden sea PAID."