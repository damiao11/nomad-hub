#!/bin/bash
# DuckDNS + Certbot 自动续期脚本
# 用法: certbot renew --manual-auth-hook /root/scripts/cert-renewal.sh --manual-cleanup-hook /root/scripts/cert-cleanup.sh

TOKEN="4cda8079-bbca-40af-bb85-d02a5d7678a4"
DOMAIN="nomadmap13"

# 设置 TXT 记录
curl -s "https://www.duckdns.org/update?domains=${DOMAIN}&token=${TOKEN}&txt=${CERTBOT_VALIDATION}" > /dev/null
echo "DuckDNS TXT record set: _acme-challenge.${DOMAIN}.duckdns.org = ${CERTBOT_VALIDATION}"

# 等待 DNS 传播
sleep 60
