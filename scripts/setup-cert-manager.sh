#!/bin/bash
# ============================================================================
# Cert-Manager + ExternalDNS Installation Script
# Installs cert-manager and ExternalDNS on EKS cluster
# Usage: ./scripts/setup-cert-manager.sh
# ============================================================================

set -euo pipefail

echo "============================================"
echo "  Installing Cert-Manager & ExternalDNS"
echo "============================================"

# ─── Variables ─────────────────────────────────────────────────────────────────
CERT_MANAGER_NAMESPACE="cert-manager"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "${SCRIPT_DIR}")"
MANIFESTS_DIR="${REPO_ROOT}/k8s-cluster-gitops-config"

# ─── Add Helm Repositories ────────────────────────────────────────────────────
echo "📥 Adding Helm repositories..."
helm repo add jetstack https://charts.jetstack.io
helm repo add external-dns https://kubernetes-sigs.github.io/external-dns/
helm repo update

# ─── Install Cert-Manager ─────────────────────────────────────────────────────
echo "🔐 Installing cert-manager..."
kubectl create namespace ${CERT_MANAGER_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -

helm upgrade --install cert-manager jetstack/cert-manager \
  --namespace ${CERT_MANAGER_NAMESPACE} \
  --values "${MANIFESTS_DIR}/cert-manager/values.yaml" \
  --wait --timeout 180s

# Wait for cert-manager webhook to be ready
echo "⏳ Waiting for cert-manager webhook..."
kubectl wait --for=condition=ready pod -l app.kubernetes.io/component=webhook \
  -n ${CERT_MANAGER_NAMESPACE} --timeout=120s

# ─── Apply ClusterIssuers ─────────────────────────────────────────────────────
echo "📜 Applying ClusterIssuers..."
kubectl apply -f "${MANIFESTS_DIR}/cert-manager/cluster-issuer.yaml"

# ─── Install ExternalDNS ──────────────────────────────────────────────────────
echo "🌐 Installing ExternalDNS..."
helm upgrade --install external-dns external-dns/external-dns \
  --namespace kube-system \
  --values "${MANIFESTS_DIR}/external-dns/values.yaml" \
  --wait --timeout 180s

# ─── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "============================================"
echo "  Cert-Manager & ExternalDNS Installed! ✅"
echo "============================================"
echo ""
echo "📌 Verify cert-manager:"
echo "   kubectl get pods -n ${CERT_MANAGER_NAMESPACE}"
echo "   kubectl get clusterissuers"
echo ""
echo "📌 Verify ExternalDNS:"
echo "   kubectl get pods -l app.kubernetes.io/name=external-dns -n kube-system"
echo "   kubectl logs -l app.kubernetes.io/name=external-dns -n kube-system"
echo ""
echo "📌 Test certificate (create a test cert):"
echo "   kubectl apply -f - <<EOF"
echo "   apiVersion: cert-manager.io/v1"
echo "   kind: Certificate"
echo "   metadata:"
echo "     name: test-cert"
echo "     namespace: default"
echo "   spec:"
echo "     secretName: test-cert-tls"
echo "     issuerRef:"
echo "       name: letsencrypt-staging"
echo "       kind: ClusterIssuer"
echo "     dnsNames:"
echo "       - test.yourdomain.com"
echo "   EOF"
echo ""
