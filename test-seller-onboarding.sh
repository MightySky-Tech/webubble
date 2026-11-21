#!/bin/bash

# WB-008 Seller Onboarding E2E Test
# This script tests the complete informal seller onboarding flow

echo "=== WB-008 Seller Onboarding End-to-End Test ==="
echo ""

API_URL="http://localhost:8100/api/v1"
USER_EMAIL="test-seller-$(date +%s)@test.local"
USER_NAME="Test Seller $(date +%s)"

echo "1. Creating test user..."
# This would normally be done through signup, but for testing we'll use direct DB
USERID=$(docker exec webubble-postgres-1 psql -U webubble -d webubble -tc \
  "INSERT INTO users (name, email, email_verified_at, password, created_at, updated_at) 
   VALUES ('$USER_NAME', '$USER_EMAIL', now(), '', now(), now()) 
   RETURNING id;" | xargs)

echo "   ✓ User created: ID=$USERID"

echo ""
echo "2. Creating Sanctum token for authentication..."
TOKEN="test-token-$(date +%s)"
docker exec webubble-postgres-1 psql -U webubble -d webubble -q \
  "INSERT INTO personal_access_tokens (tokenable_type, tokenable_id, name, token, abilities, created_at, updated_at) 
   VALUES ('App\\\\Models\\\\User', $USERID, 'test', '$TOKEN', '[\"*\"]'::jsonb, now(), now());" 

echo "   ✓ Token created: $TOKEN"

echo ""
echo "3. Testing seller profile creation via API..."
curl -s -X POST "$API_URL/seller/onboarding" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "seller_type": "informal",
    "phone": "+234 701 234 5678",
    "trading_name": "Test Seller Kitchen"
  }' | jq '.' > /tmp/seller_response.json

echo "   Response:"
cat /tmp/seller_response.json | jq '.'

echo ""
echo "4. Retrieving seller profile..."
curl -s -X GET "$API_URL/seller/me" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/json" | jq '.data.seller'

echo ""
echo "5. Verifying database state..."
docker exec webubble-postgres-1 psql -U webubble -d webubble -c \
  "SELECT id, user_id, seller_type, trading_name, phone, status, created_at FROM seller_profiles WHERE user_id = $USERID;"

echo ""
echo "=== Test Complete ==="
