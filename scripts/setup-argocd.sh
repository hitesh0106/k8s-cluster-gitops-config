#!/bin/bash
# ============================================================================
# ArgoCD Installation Script
# Installs ArgoCD on EKS cluster using Helm
# Usage: ./scripts/setup-argocd.sh
# ============================================================================

set -euo pipefail

echo "============================================"
echo "  Installing ArgoCD on EKS Cluster"
echo "============================================"

# ─── Variables ─────────────────────────────────────────────────────────────────
ARGOCD_NAMESPACE="argocd"
ARGOCD_VERSION="7.3.3"  # Helm chart version

# ─── Create Namespace ─────────────────────────────────────────────────────────
echo "📦 Creating namespace: ${ARGOCD_NAMESPACE}"
kubectl create namespace ${ARGOCD_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

# ─── Add Helm Repository ──────────────────────────────────────────────────────
echo "📥 Adding ArgoCD Helm repository..."
helm repo add argo https://argoproj.github.io/argo-helm
helm repo update

# ─── Install ArgoCD ───────────────────────────────────────────────────────────
echo "🚀 Installing ArgoCD v${ARGOCD_VERSION}..."
helm upgrade --install argocd argo/argo-cd \
  --namespace ${ARGOCD_NAMESPACE} \
  --version ${ARGOCD_VERSION} \
  --set server.service.type=LoadBalancer \
  --set server.extraArgs="{--insecure}" \
  --set configs.params."server\.insecure"=true \
  --set controller.resources.requests.cpu=250m \
  --set controller.resources.requests.memory=256Mi \
  --set controller.resources.limits.cpu=500m \
  --set controller.resources.limits.memory=512Mi \
  --set server.resources.requests.cpu=50m \
  --set server.resources.requests.memory=64Mi \
  --set server.resources.limits.cpu=100m \
  --set server.resources.limits.memory=128Mi \
  --wait --timeout 300s

# ─── Wait for pods to be ready ────────────────────────────────────────────────
echo "⏳ Waiting for ArgoCD pods to be ready..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/name=argocd-server \
  -n ${ARGOCD_NAMESPACE} --timeout=120s

# ─── Get Initial Admin Password ───────────────────────────────────────────────
echo ""
echo "============================================"
echo "  ArgoCD Installation Complete! ✅"
echo "============================================"
echo ""
echo "📌 Get the initial admin password:"
echo "   kubectl -n ${ARGOCD_NAMESPACE} get secret argocd-initial-admin-secret -o jsonpath='{.data.password}' | base64 -d"
echo ""
echo "📌 Port forward to access ArgoCD UI:"
echo "   kubectl port-forward svc/argocd-server -n ${ARGOCD_NAMESPACE} 8080:443"
echo "   Then open: https://localhost:8080"
echo ""
echo "📌 Login via CLI:"
echo "   argocd login localhost:8080 --username admin --password <password> --insecure"
echo ""

# ─── Apply ArgoCD Applications ────────────────────────────────────────────────
echo "📦 Applying ArgoCD Application manifests..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "${SCRIPT_DIR}")"
MANIFESTS_DIR="${REPO_ROOT}/k8s-cluster-gitops-config/argocd"

if [ -d "${MANIFESTS_DIR}" ]; then
  kubectl apply -f "${MANIFESTS_DIR}/" -n ${ARGOCD_NAMESPACE}
  echo "✅ ArgoCD Applications applied successfully!"
else
  echo "⚠️  ArgoCD manifests directory not found at: ${MANIFESTS_DIR}"
  echo "   Apply manually: kubectl apply -f <path-to-argocd-manifests>/ -n ${ARGOCD_NAMESPACE}"
fi
