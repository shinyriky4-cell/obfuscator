# Razer Obfuscator

The previous checkout had files written to the wrong paths, which caused npm to parse JavaScript as `package.json`. This version restores the correct project layout.

Run locally:

```powershell
npm test
npm start
Start-Process http://localhost:8080
```

CLI example:

```powershell
node .\bin\lua-obfuscator.js .\input.lua -o .\output.lua --level 1 --standalone
```

`package.json` must remain JSON. The test file belongs at `test/obfuscator.test.js`, and the implementation belongs at `src/obfuscator.js`.

The tool targets standard Lua/Luau and Roblox Studio workflows. It does not target executor-only APIs or exploit runtimes.
