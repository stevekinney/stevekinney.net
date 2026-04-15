---
title: 'Cleanup and Teardown'
description: >-
  Tear down every AWS resource you created in this course in the correct order so you stop paying for it.
date: 2026-04-15
modified: 2026-04-15
tags:
  - aws
  - cleanup
  - cost-management
  - teardown
---

The course opened with "real money, real infrastructure." This is where we close that loop. Most of what you built costs pennies per month while it's idle—but "pennies" across a dozen services, over a year you forgot about, compounds into real money. Worse, some services (ACM certificates, Route 53 hosted zones, CloudFront distributions) keep billing even when nobody uses them. This lesson tears everything down in the order AWS actually allows.

If you want AWS's canonical version of any of the delete commands, the [AWS CLI command reference](https://docs.aws.amazon.com/cli/latest/reference/) is the place to look. I'll link specific commands inline where the flags are fiddly.

## The Teardown Principle

AWS resources have dependencies. You can't delete a role while a Lambda is still using it; you can't delete an S3 bucket that has objects in it; you can't delete a CloudFront distribution that's still `Enabled`. The rule is almost always: **delete things that depend on a resource before deleting the resource itself.**

The order below is the one that actually works. Skipping around will produce `ResourceInUseException` and `DependencyViolation` errors until you give up and come back to it.

## What Keeps Charging

Before you start, a short list of services that keep billing you whether or not anyone uses them:

- **CloudFront distributions.** Even disabled, they don't cost much—but deleted costs zero.
- **Route 53 hosted zones.** $0.50/month _per zone_. Forgotten hosted zones are the classic "$12/year" surprise.
- **ACM certificates.** Free, but they count toward your quota. Delete unused certs.
- **DynamoDB tables in on-demand mode.** Charge nothing for zero requests, but storage costs for existing items still accrue.
- **CloudWatch Log Groups.** Indefinite retention by default. Delete or set retention when you tear down.
- **Elastic IPs** (not used in this course, but: always delete these).
- **S3 buckets with versioning enabled.** Every object version still costs you. Empty _all_ versions before deleting.

## Order of Operations

The safe sequence for this course's footprint, top to bottom:

1. CloudFront distributions (disable, wait, delete) and OACs.
2. Route 53 records (except NS and SOA) and hosted zones.
3. ACM certificates.
4. API Gateway APIs and custom domain names.
5. Lambda functions, versions, and layer attachments.
6. IAM execution roles and their policies (detach first, then delete).
7. DynamoDB tables.
8. Parameter Store parameters and Secrets Manager secrets.
9. CloudWatch log groups, alarms, and SNS topics.
10. S3 buckets (empty all versions, then delete).
11. Budgets, cost alerts.
12. IAM users you no longer need (deploy-bot, etc.) and their access keys.

Keep the root user, your `admin` user, and the account itself. Those stay for the next project.

## 1. CloudFront

CloudFront distributions must be **disabled**, fully deployed in that disabled state, and _then_ deleted. Disabling takes 15–30 minutes. Deletion is fast once the status is `Deployed`.

```bash
DIST_ID=E1A2B3C4D5E6F7

# Fetch current config + ETag
aws cloudfront get-distribution-config --id "$DIST_ID" \
  --query 'DistributionConfig' --output json > dist-config.json
ETAG=$(aws cloudfront get-distribution-config --id "$DIST_ID" \
  --query 'ETag' --output text)

# Flip Enabled to false in dist-config.json (use jq or your editor)
jq '.Enabled = false' dist-config.json > dist-config.tmp && mv dist-config.tmp dist-config.json

aws cloudfront update-distribution \
  --id "$DIST_ID" \
  --distribution-config file://dist-config.json \
  --if-match "$ETAG"

aws cloudfront wait distribution-deployed --id "$DIST_ID"

NEW_ETAG=$(aws cloudfront get-distribution-config --id "$DIST_ID" \
  --query 'ETag' --output text)
aws cloudfront delete-distribution --id "$DIST_ID" --if-match "$NEW_ETAG"
```

Then delete the OAC:

```bash
OAC_ID=E1OAC2EXAMPLE
OAC_ETAG=$(aws cloudfront get-origin-access-control --id "$OAC_ID" \
  --query 'ETag' --output text)
aws cloudfront delete-origin-access-control --id "$OAC_ID" --if-match "$OAC_ETAG"
```

## 2. Route 53

You can't delete a hosted zone with any records other than the default `NS` and `SOA`. List what's there, delete each record, then the zone.

```bash
ZONE_ID=Z1ABCDEF123456

# Dump non-default records to inspect
aws route53 list-resource-record-sets --hosted-zone-id "$ZONE_ID" \
  --query 'ResourceRecordSets[?Type!=`NS` && Type!=`SOA`]'

# For each non-default record, submit a change batch with Action=DELETE.
# Script this if you have more than a few. Then:

aws route53 delete-hosted-zone --id "$ZONE_ID"
```

> [!TIP]
> If you registered the domain through Route 53, **don't delete the hosted zone** unless you're also transferring or abandoning the domain. Registered domains expect their hosted zone to exist.

## 3. ACM Certificates

Certificates can't be deleted while they're attached to a CloudFront distribution or API Gateway custom domain. Do CloudFront and API Gateway first; then:

```bash
aws acm delete-certificate \
  --certificate-arn arn:aws:acm:us-east-1:123456789012:certificate/a1b2c3d4-e5f6-7890-abcd-ef1234567890 \
  --region us-east-1
```

## 4. API Gateway

```bash
aws apigatewayv2 delete-api --api-id abc123def4 --region us-east-1

# Custom domain, if you attached one:
aws apigatewayv2 delete-api-mapping \
  --api-mapping-id m1a2p3 \
  --domain-name api.example.com \
  --region us-east-1
aws apigatewayv2 delete-domain-name \
  --domain-name api.example.com \
  --region us-east-1
```

## 5. Lambda

Delete each function. Versions attached to the function go with it. Lambda@Edge functions in CloudFront get replicated to edge locations—AWS cleans those up asynchronously after you delete the function; don't be surprised if the console still shows replicas for up to a few hours.

```bash
aws lambda delete-function --function-name summit-supply-api --region us-east-1
aws lambda delete-function --function-name my-frontend-app-api --region us-east-1
```

## 6. IAM Roles and Policies

You can't delete a role while policies are attached. Detach first.

```bash
ROLE=summit-supply-api-role

# List and detach managed policies
for ARN in $(aws iam list-attached-role-policies --role-name "$ROLE" \
  --query 'AttachedPolicies[].PolicyArn' --output text); do
  aws iam detach-role-policy --role-name "$ROLE" --policy-arn "$ARN"
done

# Delete inline policies
for NAME in $(aws iam list-role-policies --role-name "$ROLE" \
  --query 'PolicyNames[]' --output text); do
  aws iam delete-role-policy --role-name "$ROLE" --policy-name "$NAME"
done

aws iam delete-role --role-name "$ROLE"
```

Repeat for every execution role the course created. Delete customer-managed policies (`DeployBotPolicy`, etc.) after no role or user references them.

## 7. DynamoDB

```bash
aws dynamodb delete-table \
  --table-name summit-supply-saved-lists \
  --region us-east-1
```

If you had point-in-time recovery enabled, final backups may linger for the retention window.

## 8. Parameter Store and Secrets Manager

```bash
aws ssm delete-parameter \
  --name /summit-supply/production/search-api-key \
  --region us-east-1

# Secrets Manager requires --force-delete-without-recovery to actually delete
# immediately; otherwise the secret sits in a 7-30 day recovery window.
aws secretsmanager delete-secret \
  --secret-id /summit-supply/production/database-credentials \
  --force-delete-without-recovery \
  --region us-east-1
```

## 9. CloudWatch

```bash
aws logs delete-log-group \
  --log-group-name /aws/lambda/summit-supply-api \
  --region us-east-1

aws cloudwatch delete-alarms \
  --alarm-names summit-supply-5xx-rate \
  --region us-east-1

aws sns delete-topic \
  --topic-arn arn:aws:sns:us-east-1:123456789012:summit-supply-alerts \
  --region us-east-1
```

## 10. S3

Versioning-enabled buckets need every version _and_ every delete marker removed before the bucket can go.

```bash
BUCKET=my-frontend-app-assets

# Delete all current objects
aws s3 rm "s3://$BUCKET" --recursive

# Delete all non-current versions and delete markers
aws s3api list-object-versions --bucket "$BUCKET" \
  --query '{Objects: [Versions[].{Key:Key,VersionId:VersionId}, DeleteMarkers[].{Key:Key,VersionId:VersionId}][]}' \
  --output json > versions.json

# If versions.json has non-empty Objects, run:
aws s3api delete-objects --bucket "$BUCKET" --delete file://versions.json

aws s3api delete-bucket --bucket "$BUCKET" --region us-east-1
```

## 11. Budgets and Cost Alerts

```bash
aws budgets delete-budget \
  --account-id 123456789012 \
  --budget-name monthly-learning-budget
```

## 12. IAM Users

If you created `deploy-bot` or any other service user purely for the course, delete it once its CloudFront/S3 work is gone. Access keys must be deleted first.

```bash
USER=deploy-bot

for KEY in $(aws iam list-access-keys --user-name "$USER" \
  --query 'AccessKeyMetadata[].AccessKeyId' --output text); do
  aws iam delete-access-key --user-name "$USER" --access-key-id "$KEY"
done

for ARN in $(aws iam list-attached-user-policies --user-name "$USER" \
  --query 'AttachedPolicies[].PolicyArn' --output text); do
  aws iam detach-user-policy --user-name "$USER" --policy-arn "$ARN"
done

aws iam delete-user --user-name "$USER"
```

## Verifying Nothing Is Left

A few quick sanity checks:

```bash
aws cloudfront list-distributions --query 'DistributionList.Items[].Id' --output text
aws lambda list-functions --region us-east-1 --query 'Functions[].FunctionName' --output text
aws dynamodb list-tables --region us-east-1 --query 'TableNames[]' --output text
aws s3 ls
aws route53 list-hosted-zones --query 'HostedZones[].Name' --output text
```

If every list is empty (or only contains things you deliberately kept), you're clean.

Finally, check the [Billing console](https://console.aws.amazon.com/billing/home) a few days later. Ongoing charges after teardown mean something is still alive. The most common culprits are S3 versions you didn't clear, a Route 53 hosted zone you forgot about, or a Lambda@Edge replica that hasn't finished deleting.

The lights are off. Good work.
