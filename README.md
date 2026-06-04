# K8s CI/CD GitOps Project 🚀

Production-grade Kubernetes CI/CD project with GitOps practices using ArgoCD, Terraform, and GitHub Actions.

## Architecture

```
[Developer] ➔ Push Code ➔ [GitHub] ➔ Triggers ➔ [GitHub Actions CI]
                                                      │
                                          (Lint → Test → SonarQube → Trivy)
                                                      │
                                                      ▼
                                              (Build & Push to ECR)
                                                      │
                                              (Update K8s Manifests)
                                                      │
                                                      ▼
[AWS EKS Cluster] ◄── ArgoCD pulls & syncs ◄── [k8s-manifests repo]
       │
       ├── Ingress Controller (ALB)
       ├── Cert-Manager (SSL/TLS)
       ├── ExternalDNS (Route53)
       ├── HPA (Auto-scaling)
       └── Prometheus + Grafana + Loki (Observability)
```

## Tech Stack

| Component | Technology |
|-----------|-----------|
| **Application** | Node.js (Express) REST API |
| **Containerization** | Docker (Multi-stage, Distroless) |
| **CI Pipeline** | GitHub Actions |
| **Infrastructure** | Terraform (AWS EKS, VPC, ECR) |
| **GitOps CD** | ArgoCD |
| **K8s Manifests** | Kustomize (base + overlays) |
| **Ingress** | AWS ALB Controller |
| **TLS** | Cert-Manager + Let's Encrypt |
| **DNS** | ExternalDNS + Route53 |
| **Monitoring** | Prometheus + Grafana |
| **Logging** | Loki + Promtail |
| **Security** | Trivy, SonarCloud, Sealed Secrets |

## Project Structure

```
k8s-cicd/
├── app/                    # Node.js REST API
│   ├── src/
│   │   ├── index.js        # Express server with graceful shutdown
│   │   ├── routes/         # Health checks + API routes
│   │   ├── middleware/     # Error handler + Winston logger
│   │   └── config/        # Centralized configuration
│   ├── tests/             # Jest unit tests
│   ├── Dockerfile         # Multi-stage distroless build
│   └── package.json
├── terraform/             # AWS Infrastructure as Code
│   ├── vpc.tf             # VPC with public/private subnets
│   ├── eks.tf             # EKS cluster + managed node groups
│   ├── ecr.tf             # Container registry
│   ├── iam.tf             # IAM roles + IRSA
│   └── ...
├── .github/workflows/     # CI pipeline
│   └── ci-pipeline.yml    # Lint → Test → Scan → Build → Push → Update
├── scripts/               # Setup automation scripts
│   ├── setup-argocd.sh
│   ├── setup-monitoring.sh
│   └── setup-cert-manager.sh
└── docker-compose.yml     # Local development
```

## Quick Start

### 1. Local Development

```bash
# Install dependencies
cd app && npm install

# Run locally
npm run dev

# Run tests
npm test

# Lint code
npm run lint
```

### 2. Docker

```bash
# Build image
docker build -t k8s-cicd-api ./app

# Run with Docker Compose
docker-compose up -d

# Test
curl http://localhost:3000/health/live
curl http://localhost:3000/api/v1/items
```

### 3. Terraform (AWS Infrastructure)

```bash
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars with your values

terraform init
terraform plan
terraform apply
```

### 4. Kubernetes Setup

```bash
# Update kubeconfig
aws eks update-kubeconfig --region ap-south-1 --name k8s-cicd-cluster

# Install ArgoCD
./scripts/setup-argocd.sh

# Install monitoring
./scripts/setup-monitoring.sh

# Install cert-manager + ExternalDNS
./scripts/setup-cert-manager.sh
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Welcome message |
| GET | `/health/live` | Liveness probe |
| GET | `/health/ready` | Readiness probe |
| GET | `/health/startup` | Startup probe |
| GET | `/api/v1/info` | Application info |
| GET | `/api/v1/items` | List items (paginated) |
| GET | `/api/v1/items/:id` | Get single item |
| POST | `/api/v1/items` | Create item |
| PUT | `/api/v1/items/:id` | Update item |
| DELETE | `/api/v1/items/:id` | Delete item |

## Security Features

- 🔒 **Helmet.js** — Security headers
- 🛡️ **Rate Limiting** — DDoS protection
- 🔑 **Non-root containers** — Distroless base image
- 📦 **Sealed Secrets** — Encrypted secrets in Git
- 🔍 **Trivy** — Container vulnerability scanning
- 📊 **SonarCloud** — Static code analysis (SAST)
- 🌐 **Private Subnets** — Worker nodes in private subnets (Zero Trust)
- 🔐 **KMS Encryption** — EKS secrets encrypted at rest

## Environments

| Environment | Replicas | HPA | Auto-Sync | Resources |
|-------------|----------|-----|-----------|-----------|
| **Dev** | 1 | Min:1 Max:3 | ✅ Yes | Low |
| **Staging** | 2 | Min:2 Max:5 | ✅ Yes | Medium |
| **Production** | 3 | Min:3 Max:20 | ❌ Manual | High |

## License

MIT

## Author

**Hitesh** — [GitHub](https://github.com/hitesh0106)
