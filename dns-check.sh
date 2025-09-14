#!/bin/bash
# DNS Configuration Checker for bharatkitchenware.store
# Run this script to verify DNS settings

echo "Checking DNS configuration for bharatkitchenware.store..."
echo "Expected IP: 194.238.17.11"
echo ""

# Check A record for main domain
echo "Checking A record for bharatkitchenware.store:"
dig +short bharatkitchenware.store A
echo ""

# Check A record for www subdomain
echo "Checking A record for www.bharatkitchenware.store:"
dig +short www.bharatkitchenware.store A
echo ""

# Check if domain resolves to correct IP
MAIN_IP=$(dig +short bharatkitchenware.store A)
WWW_IP=$(dig +short www.bharatkitchenware.store A)
EXPECTED_IP="194.238.17.11"

echo "DNS Resolution Results:"
echo "bharatkitchenware.store -> $MAIN_IP"
echo "www.bharatkitchenware.store -> $WWW_IP"
echo ""

if [ "$MAIN_IP" = "$EXPECTED_IP" ]; then
    echo "✅ Main domain DNS is correctly configured"
else
    echo "❌ Main domain DNS needs to be updated to point to $EXPECTED_IP"
fi

if [ "$WWW_IP" = "$EXPECTED_IP" ]; then
    echo "✅ WWW subdomain DNS is correctly configured"
else
    echo "❌ WWW subdomain DNS needs to be updated to point to $EXPECTED_IP"
fi

echo ""
echo "If DNS is not correct, update your domain's DNS settings:"
echo "1. Login to your domain registrar's control panel"
echo "2. Add/Update A records:"
echo "   - Name: @ (or blank) -> Value: 194.238.17.11"
echo "   - Name: www -> Value: 194.238.17.11"
echo "3. Wait for DNS propagation (can take up to 48 hours)"