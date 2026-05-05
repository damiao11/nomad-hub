#!/bin/bash
# 证书续期主脚本，由 cron 每月1号凌晨3点执行

certbot renew \
  --manual \
  --preferred-challenges dns \
  --manual-auth-hook /root/nomad-map-project/scripts/cert-renewal.sh \
  --manual-cleanup-hook /root/nomad-map-project/scripts/cert-cleanup.sh \
  --deploy-hook "nginx -s reload" \
  --quiet

echo "$(date): cert renew attempt finished" >> /var/log/cert-renew.log
