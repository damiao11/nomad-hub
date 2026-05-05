#!/bin/bash
# MySQL 数据库备份脚本
# 用法: ./db-backup.sh 或通过 cron 每天凌晨2点执行

BACKUP_DIR="/root/db-backups"
DB_HOST="127.0.0.1"
DB_PORT="3306"
DB_USER="root"
DB_NAME="nomad_db"

# 从 .env 读取密码
DB_PASS=$(grep -E "^DB_PASS=" /root/nomad-map-project/backend/.env | cut -d= -f2)

mkdir -p "$BACKUP_DIR"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/${DB_NAME}_${TIMESTAMP}.sql.gz"

mysqldump -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" --single-transaction --routines --triggers "$DB_NAME" | gzip > "$BACKUP_FILE"

# 只保留最近 7 天的备份
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +7 -delete

echo "$(date): backup saved to $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))" >> /var/log/db-backup.log
