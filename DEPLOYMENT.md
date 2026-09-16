# Deployment and domain setup

The included `deploy.ps1` deploys the web UI/API to Azure App Service using PowerShell and Azure CLI. It cannot register `razer.ob.com` automatically: you must own/control the `ob.com` domain and create the DNS record. After deployment:

1. Run `powershell -ExecutionPolicy Bypass -File .\deploy.ps1` from the repository root.
2. Add the printed CNAME record for `razer.ob.com` at your DNS provider.
3. Run the printed `az webapp config hostname add` command.
4. Enable an App Service managed certificate/HTTPS binding for the hostname.

The actual URL will only work once DNS and TLS are configured. Never expose Azure credentials in this repository.

## Compatibility and scope

The output is intended for legitimate Roblox Studio Lua/Luau projects. Roblox's normal client/server runtime does not guarantee `load` or `loadstring`; therefore Level 1 is the portable default, while packed output requires a runtime that explicitly supports dynamic loading. The project does **not** target Roblox executor/exploit environments or bypass Roblox security controls, and it cannot guarantee compatibility with them.

This is a genuine working source obfuscator, but not a full Luau compiler or VM. It lexes safely, renames supported local declarations/references, encodes numbers at runtime, and optionally packs source. Test every output in Studio. Keep authority and secrets on the server; obfuscation cannot protect client-delivered code.
