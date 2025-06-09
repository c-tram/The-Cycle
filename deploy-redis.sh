#!/bin/bash
# Script to deploy Azure Cache for Redis for The Cycle application

# Set variables - modify these to match your environment
RESOURCE_GROUP="TheCycleResourceGroup"
LOCATION="eastus"
APP_NAME="thecycle"
REDIS_NAME="${APP_NAME}-redis"
REDIS_SKU="Basic"
REDIS_FAMILY="C"
REDIS_CAPACITY=0 # 0 = 250MB, 1 = 1GB, etc.
AZURE_SUBSCRIPTION=""  # Set your subscription ID

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function for error handling
function error_exit() {
    echo -e "${RED}ERROR: $1${NC}" >&2
    exit 1
}

# Check if Azure CLI is installed
if ! command -v az &> /dev/null; then
    error_exit "Azure CLI is not installed. Please install it first."
fi

# Login to Azure if not already logged in
echo -e "${YELLOW}Checking Azure CLI login status...${NC}"
az account show &> /dev/null || az login || error_exit "Failed to login to Azure"

# Set subscription if provided
if [ ! -z "$AZURE_SUBSCRIPTION" ]; then
    echo -e "${YELLOW}Setting Azure subscription...${NC}"
    az account set --subscription "$AZURE_SUBSCRIPTION" || error_exit "Failed to set subscription"
fi

# Check if resource group exists or create it
echo -e "${YELLOW}Checking resource group...${NC}"
if ! az group show --name "$RESOURCE_GROUP" &> /dev/null; then
    echo -e "${YELLOW}Creating resource group $RESOURCE_GROUP in $LOCATION...${NC}"
    az group create --name "$RESOURCE_GROUP" --location "$LOCATION" || error_exit "Failed to create resource group"
fi

# Check if Redis cache already exists
echo -e "${YELLOW}Checking if Redis cache already exists...${NC}"
if az redis show --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" &> /dev/null; then
    echo -e "${YELLOW}Redis cache $REDIS_NAME already exists. Getting connection information...${NC}"
else
    # Create Azure Cache for Redis
    echo -e "${YELLOW}Creating Azure Cache for Redis...${NC}"
    echo -e "${YELLOW}This may take several minutes...${NC}"
    az redis create \
        --name "$REDIS_NAME" \
        --resource-group "$RESOURCE_GROUP" \
        --location "$LOCATION" \
        --sku "$REDIS_SKU" \
        --vm-size "${REDIS_FAMILY}${REDIS_CAPACITY}" || error_exit "Failed to create Redis cache"
fi

# Get Redis connection information
echo -e "${YELLOW}Getting Redis connection information...${NC}"
REDIS_HOST=$(az redis show --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" --query hostName -o tsv)
REDIS_PORT=$(az redis show --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" --query sslPort -o tsv)

# Check if key authentication is disabled (AAD auth is used)
ACCESS_KEY_DISABLED=$(az redis show --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" --query properties.disableAccessKeyAuthentication -o tsv || echo "false")
AAD_ENABLED=$(az redis show --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" --query "properties.redisConfiguration.aad-enabled" -o tsv || echo "false")

if [[ "$ACCESS_KEY_DISABLED" == "true" && "$AAD_ENABLED" == "true" ]]; then
  echo -e "${YELLOW}Azure AD authentication is enabled for Redis cache $REDIS_NAME${NC}"
  REDIS_AUTH_MODE="aad"
  # For AAD auth, we'll use managed identity
  REDIS_KEY=""
else
  echo -e "${YELLOW}Standard key authentication is used for Redis cache $REDIS_NAME${NC}"
  REDIS_AUTH_MODE="key"
  # Get the primary access key
  REDIS_KEY=$(az redis list-keys --name "$REDIS_NAME" --resource-group "$RESOURCE_GROUP" --query primaryKey -o tsv || echo "")
fi

# Set Redis environment variables in App Service
echo -e "${YELLOW}Updating App Service with Redis connection settings...${NC}"
az webapp config appsettings set \
    --name "$APP_NAME" \
    --resource-group "$RESOURCE_GROUP" \
    --settings \
    "REDIS_HOST=$REDIS_HOST" \
    "REDIS_PORT=$REDIS_PORT" \
    "REDIS_PASSWORD=$REDIS_KEY" \
    "REDIS_AUTH_MODE=$REDIS_AUTH_MODE" \
    "REDIS_TLS=true" \
    "NODE_ENV=production" || error_exit "Failed to update app settings"

# Output connection information
echo -e "${GREEN}Azure Cache for Redis deployed successfully!${NC}"
echo -e "${GREEN}Connection information:${NC}"
echo -e "${GREEN}REDIS_HOST=${NC}$REDIS_HOST"
echo -e "${GREEN}REDIS_PORT=${NC}$REDIS_PORT"
echo -e "${GREEN}REDIS_TLS=${NC}true"
echo -e "${YELLOW}Access key is not displayed for security. It has been set in the App Service configuration.${NC}"
echo -e "${GREEN}You can test the Redis connection by visiting:${NC}"
echo -e "${GREEN}https://$APP_NAME.azurewebsites.net/api/health/redis${NC}"
