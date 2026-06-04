# K8s Cluster GitOps Configuration 🔄

Kubernetes manifests repository for GitOps-based deployment using ArgoCD and Kustomize.

> **This is the GitOps repository.** Application source code and CI pipeline are in the [k8s-cicd-project](https://github.com/hitesh0106/k8s-cicd-project) repository.

## Architecture

ArgoCD monitors this repository and automatically syncs changes to the Kubernetes cluster:

```
[CI Pipeline] ─── Updates image tag ───► [This Repo] ◄─── ArgoCD watches
                                              │
                                              ▼
                                    [EKS Cluster Deployment]
```

## Repository Structure

```
k8s-cluster-gitops-config/
├── base/                      # Base Kustomize manifests
│   ├── namespace.yaml         # App namespace
│   ├── deployment.yaml        # Pod spec with probes & security
│   ├── service.yaml           # ClusterIP service
│   ├── ingress.yaml           # ALB Ingress
│   ├── hpa.yaml               # Horizontal Pod Autoscaler
│   ├── configmap.yaml         # App configuration
│   ├── sealed-secret.yaml     # Encrypted secrets
│   └── kustomization.yaml     # Kustomize entrypoint
├── overlays/                  # Environment-specific patches
│   ├── dev/                   # 1 replica, debug logging
│   ├── staging/               # 2 replicas, production-like
│   └── production/            # 3 replicas, PDB, TLS
├── argocd/                    # ArgoCD Application CRDs
│   ├── application-dev.yaml
│   ├── application-staging.yaml
│   └── application-production.yaml
├── ingress-controller/        # AWS LB Controller values
├── cert-manager/              # TLS certificate management
├── external-dns/              # Route53 DNS automation
├── monitoring/                # Prometheus + Grafana
│   ├── prometheus-values.yaml
│   ├── grafana-values.yaml
│   ├── grafana-dashboards/    # Custom JSON dashboards
│   └── alerting-rules.yaml    # PrometheusRule alerts
└── logging/                   # Loki log aggregation
    └── loki-values.yaml
```

## Environments

| Environment | Path | Auto-Sync | Replicas | HPA |
|-------------|------|-----------|----------|-----|
| Dev | `overlays/dev` | ✅ | 1 | 1-3 |
| Staging | `overlays/staging` | ✅ | 2 | 2-5 |
| Production | `overlays/production` | ❌ Manual | 3 | 3-20 |

## Usage

### Preview Changes
```bash
# Dev overlay
kubectl kustomize overlays/dev

# Production overlay
kubectl kustomize overlays/production
```

### Apply Manually (without ArgoCD)
```bash
kubectl apply -k overlays/dev
```

### Update Image Tag
```bash
cd overlays/dev
kustomize edit set image k8s-cicd-api=<ECR_URL>/k8s-cicd-api:v1.0.0-abc1234
git add . && git commit -m "update: image to v1.0.0-abc1234" && git push
# ArgoCD will auto-sync this change!
```

## Author

**Hitesh** — [GitHub](https://github.com/hitesh0106)
