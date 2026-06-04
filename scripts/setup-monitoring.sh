#!/bin/bash
# ============================================================================
# Monitoring Stack Installation Script
# Installs Prometheus + Grafana + Loki on EKS cluster using Helm
# Usage: ./scripts/setup-monitoring.sh
# ============================================================================

set -euo pipefail

echo "============================================"
echo "  Installing Monitoring Stack"
echo "============================================"

# ─── Variables ─────────────────────────────────────────────────────────────────
MONITORING_NAMESPACE="monitoring"
LOGGING_NAMESPACE="logging"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "${SCRIPT_DIR}")"
MANIFESTS_DIR="${REPO_ROOT}/k8s-cluster-gitops-config/monitoring"
LOGGING_DIR="${REPO_ROOT}/k8s-cluster-gitops-config/logging"

# ─── Create Namespaces ────────────────────────────────────────────────────────
echo "📦 Creating namespaces..."
kubectl create namespace ${MONITORING_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -
kubectl create namespace ${LOGGING_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# ─── Add Helm Repositories ────────────────────────────────────────────────────
echo "📥 Adding Helm repositories..."
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo add grafana https://grafana.github.io/helm-charts
helm repo update

# ─── Install Prometheus Stack ──────────────────────────────────────────────────
echo "🔥 Installing Prometheus (kube-prometheus-stack)..."
helm upgrade --install prometheus prometheus-community/kube-prometheus-stack \
  --namespace ${MONITORING_NAMESPACE} \
  --values "${MANIFESTS_DIR}/prometheus-values.yaml" \
  --wait --timeout 300s

# ─── Install Grafana ───────────────────────────────────────────────────────────
echo "📊 Installing Grafana..."
helm upgrade --install grafana grafana/grafana \
  --namespace ${MONITORING_NAMESPACE} \
  --values "${MANIFESTS_DIR}/grafana-values.yaml" \
  --wait --timeout 180s

# ─── Apply Alerting Rules ─────────────────────────────────────────────────────
echo "🔔 Applying alerting rules..."
kubectl apply -f "${MANIFESTS_DIR}/alerting-rules.yaml" -n ${MONITORING_NAMESPACE}

# ─── Install Loki ─────────────────────────────────────────────────────────────
echo "📝 Installing Loki (logging)..."
helm upgrade --install loki grafana/loki \
  --namespace ${LOGGING_NAMESPACE} \
  --values "${LOGGING_DIR}/loki-values.yaml" \
  --wait --timeout 300s

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Monitoring Stack Installed! ✅"
echo "============================================"
echo ""
echo "📌 Access Grafana:"
echo "   kubectl port-forward svc/grafana -n ${MONITORING_NAMESPACE} 3000:80"
echo "   URL: http://localhost:3000"
echo "   User: admin | Pass: admin (change in production!)"
echo ""
echo "📌 Access Prometheus:"
echo "   kubectl port-forward svc/prometheus-server -n ${MONITORING_NAMESPACE} 9090:9090"
echo "   URL: http://localhost:9090"
echo ""
echo "📌 Access AlertManager:"
echo "   kubectl port-forward svc/prometheus-alertmanager -n ${MONITORING_NAMESPACE} 9093:9093"
echo "   URL: http://localhost:9093"
echo ""
