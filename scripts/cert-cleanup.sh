#!/bin/bash
TOKEN="4cda8079-bbca-40af-bb85-d02a5d7678a4"
DOMAIN="nomadmap13"

# 清除 TXT 记录
curl -s "https://www.duckdns.org/update?domains=${DOMAIN}&token=${TOKEN}&txt=clear&clear=true" > /dev/null
echo "DuckDNS TXT record cleared"
