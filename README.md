# Razer Obfuscator

## Roblox loading fix

The default output is now **static Roblox-safe Luau**. It does not reconstruct source with `loadstring` or `load`, because those APIs are not guaranteed in Roblox and are a common reason generated scripts fail to run.

The old fake VM dispatcher has been removed. `vm: true` now fails clearly instead of pretending to be virtualization. Base64/encryption/loader options are rejected in Roblox-safe mode for the same reason.

Run locally:

```powershell
npm test
npm start
Start-Process http://localhost:8080
```

## VM credit and licensing

This release does **not** bundle or execute code from a third-party VM repository. Therefore no third-party VM attribution is claimed. If a real VM is later integrated, its exact repository, license, authors, and required copyright notice will be included here and in `NOTICE` before distribution.

A possible research candidate is [`uniquadev/LuauVM`](https://github.com/uniquadev/LuauVM), but mentioning it is not an assertion that its code is currently included.

## Scope

The tool currently provides conservative lexical transformations and numeric constant hiding for standard Roblox Studio Luau. It is not a full Luau compiler or VM. Unsupported future VM modes must reject input rather than silently produce code that cannot run.
