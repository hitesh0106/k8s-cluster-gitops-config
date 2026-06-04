# ============================================================================
# Terraform Remote State Backend Configuration
# S3 for state storage + DynamoDB for state locking
# ============================================================================
#
# NOTE: Before using this backend, you must create the S3 bucket and
# DynamoDB table manually or via a bootstrap script:
#
#   aws s3api create-bucket --bucket k8s-cicd-terraform-state-<ACCOUNT_ID> \
#     --region ap-south-1 --create-bucket-configuration LocationConstraint=ap-south-1
#
#   aws dynamodb create-table --table-name k8s-cicd-terraform-lock \
#     --attribute-definitions AttributeName=LockID,AttributeType=S \
#     --key-schema AttributeName=LockID,KeyType=HASH \
#     --billing-mode PAY_PER_REQUEST --region ap-south-1
#
# ============================================================================

terraform {
  backend "s3" {
    bucket         = "k8s-cicd-terraform-state"
    key            = "eks-cluster/terraform.tfstate"
    region         = "ap-south-1"
    encrypt        = true
    dynamodb_table = "k8s-cicd-terraform-lock"

    # Enable versioning on the state bucket for rollback capability
    # (must be configured on the S3 bucket itself)
  }
}
