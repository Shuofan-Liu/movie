#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   chmod +x scripts/deploy_firebase.sh
#   FIREBASE_PROJECT_ID="your-project-id" OWNER_UID="<your-uid>" ./scripts/deploy_firebase.sh
# Notes:
# - OWNER_UID 可选；设置后会自动写入 functions:config 并重新部署 functions
# - 首次使用建议已安装 firebase-tools 并已 firebase login

PROJECT_ID=${FIREBASE_PROJECT_ID:-}
OWNER_UID=${OWNER_UID:-}
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"

if ! command -v firebase >/dev/null 2>&1; then
  echo "[ERROR] firebase-tools 未安装，请先运行: npm i -g firebase-tools" >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "[ERROR] 需要 npm，请安装 Node.js (建议 v18+)" >&2
  exit 1
fi

if [[ -z "$PROJECT_ID" ]]; then
  echo "[ERROR] 请提供 FIREBASE_PROJECT_ID 环境变量，例如:"
  echo "       FIREBASE_PROJECT_ID=your-project-id ./scripts/deploy_firebase.sh"
  exit 1
fi

cd "$ROOT_DIR"

# 写入 .firebaserc（若不存在），避免交互式 firebase use --add
if [[ ! -f .firebaserc ]]; then
  cat > .firebaserc <<JSON
{
  "projects": { "default": "$PROJECT_ID" }
}
JSON
  echo "[INFO] 已写入 .firebaserc（default=$PROJECT_ID）"
else
  echo "[INFO] 已存在 .firebaserc，当前内容："
  cat .firebaserc
fi

# 确保 firebase.json 存在
if [[ ! -f firebase.json ]]; then
  cat > firebase.json <<JSON
{
  "functions": { "source": "functions" },
  "firestore": { "rules": "firestore.rules" }
}
JSON
  echo "[INFO] 已写入 firebase.json"
fi

# 安装并部署 Functions
pushd functions >/dev/null
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm i
fi
popd >/dev/null

# 可选：设置 OWNER_UID（用于 grantAdmin 安全）
if [[ -n "$OWNER_UID" ]]; then
  echo "[INFO] 设置 functions:config security.owner_uid=$OWNER_UID"
  firebase functions:config:set security.owner_uid="$OWNER_UID"
fi

echo "[INFO] 部署 Cloud Functions…"
firebase deploy --only functions

echo "[INFO] 部署 Firestore 规则…"
firebase deploy --only firestore:rules

echo "[DONE] 部署完成。可在前端用 OWNER 账号登录后调用 grantAdmin() 为目标用户赋权。"