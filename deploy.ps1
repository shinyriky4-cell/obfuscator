param(
  [string]$ResourceGroup = 'razer-obfuscator-rg',
  [string]$Location = 'eastus',
  [string]$AppName = 'razer-obfuscator',
  [string]$Domain = 'razer.ob.com'
)
$ErrorActionPreference = 'Stop'
# Requires Azure CLI, an Azure subscription, and DNS control of ob.com.
az login
az group create --name $ResourceGroup --location $Location | Out-Null
az appservice plan create --name "$AppName-plan" --resource-group $ResourceGroup --location $Location --is-linux --sku B1 | Out-Null
az webapp create --resource-group $ResourceGroup --plan "$AppName-plan" --name $AppName --runtime 'NODE:18-lts' | Out-Null
az webapp config appsettings set --resource-group $ResourceGroup --name $AppName --settings SCM_DO_BUILD_DURING_DEPLOYMENT=true PORT=8080 | Out-Null
# Deploy the current repository folder. Run this script from the repository root.
if (Test-Path deploy.zip) { Remove-Item deploy.zip }
Compress-Archive -Path package.json,server.js,src,bin,public -DestinationPath deploy.zip
az webapp deployment source config-zip --resource-group $ResourceGroup --name $AppName --src deploy.zip | Out-Null
$defaultHost = az webapp show --resource-group $ResourceGroup --name $AppName --query defaultHostName -o tsv
Write-Host "App deployed: https://$defaultHost"
Write-Host "Configure DNS CNAME: $Domain -> $defaultHost"
Write-Host "After DNS propagates, bind the custom hostname with:"
Write-Host "az webapp config hostname add -g $ResourceGroup -n $AppName --hostname $Domain"
Write-Host "Then enable managed TLS in Azure App Service for $Domain."
