#!/bin/bash
# FoodExpress API - Quick Test Script
# Usage: Run commands individually or copy them to test API

BASE_URL="https://localhost:7280/api"

echo "========================================="
echo "FoodExpress API - Quick Testing Commands"
echo "========================================="
echo ""

# 1. Register a new user
echo "1. Register new user:"
echo "POST $BASE_URL/auth/register"
curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
	"userName": "testuser1",
	"email": "testuser1@gmail.com",
	"password": "TestPass123!"
  }' \
  --insecure

echo -e "\n\n"

# 2. Login to get token
echo "2. Login with customer account (customer@gmail.com):"
echo "POST $BASE_URL/auth/login"
curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
	"email": "customer@gmail.com",
	"password": "Customer123!"
  }' \
  --insecure

echo -e "\n\n"

# 3. Get all restaurants
echo "3. Get all restaurants:"
echo "GET $BASE_URL/Restaurants"
curl -X GET "$BASE_URL/Restaurants" \
  -H "Accept: application/json" \
  --insecure

echo -e "\n\n"

# 4. Get restaurant by ID
echo "4. Get restaurant by ID (1):"
echo "GET $BASE_URL/Restaurants/1"
curl -X GET "$BASE_URL/Restaurants/1" \
  -H "Accept: application/json" \
  --insecure

echo -e "\n\n"

# 5. Get menu items
echo "5. Get menu items for restaurant (1):"
echo "GET $BASE_URL/Menu/restaurant/1"
curl -X GET "$BASE_URL/Menu/restaurant/1" \
  -H "Accept: application/json" \
  --insecure

echo -e "\n\n"

# 6. Search restaurants
echo "6. Search restaurants:"
echo "GET $BASE_URL/Restaurants/search?searchTerm=Pizza"
curl -X GET "$BASE_URL/Restaurants/search?searchTerm=Pizza" \
  -H "Accept: application/json" \
  --insecure

echo -e "\n\n========================================="
echo "NOTE: For authenticated endpoints, you need a token:"
echo "1. Run login command above and copy the 'token' value"
echo "2. Replace TOKEN_HERE in the commands below"
echo "========================================="
echo ""

TOKEN_HERE="YOUR_TOKEN_FROM_LOGIN_RESPONSE"

# 7. View cart
echo "7. View cart (requires auth):"
echo "GET $BASE_URL/cart"
echo "Authorization: Bearer $TOKEN_HERE"
curl -X GET "$BASE_URL/cart" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN_HERE" \
  --insecure

echo -e "\n\n"

# 8. Add item to cart
echo "8. Add item to cart (requires auth):"
echo "POST $BASE_URL/cart/items"
curl -X POST "$BASE_URL/cart/items" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_HERE" \
  -d '{
	"menuItemId": 2,
	"quantity": 1
  }' \
  --insecure

echo -e "\n\n"

# 9. Create order
echo "9. Create order (requires auth):"
echo "POST $BASE_URL/orders"
curl -X POST "$BASE_URL/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_HERE" \
  -d '{
	"restaurantId": 1,
	"addressId": 1
  }' \
  --insecure

echo -e "\n\n"

# 10. Get my orders
echo "10. Get my orders (requires auth):"
echo "GET $BASE_URL/orders/my"
curl -X GET "$BASE_URL/orders/my" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer $TOKEN_HERE" \
  --insecure

echo -e "\n\n========================================="
echo "Testing Complete!"
echo "========================================="
