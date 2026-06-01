<a name="start-building"></a>
<br>
<p align="center">
<img src="img/banner-build-26.png" alt="Microsoft Build 2026" width="1200"/>
</p>

# [Microsoft Build 2026](https://build.microsoft.com)

## 🔥 OD810: Build fast, not fragile on Microsoft Fabric

### Session Description

Ship new apps in minutes without hand-rolling auth, data, and hosting. In this session, see how Microsoft Fabric gives developers and coding agents a code-first backend with typesafe schemas, APIs, functions, storage, and app hosting. Watch a simple app go from idea to running experience, with Fabric-native data ready for governance, analytics, and AI from day one.

### 🚀 Getting started

To follow this session at your own pace, explore the sample app — **Contoso Chef**, a recipe-sharing app built with Rayfin on Microsoft Fabric:

- Clone this repository
- Open the [`/src/`](./src) folder and follow the [Contoso Chef README](./src/README.md) to deploy the sample to Microsoft Fabric with `rayfin up`
- Browse the [session walkthrough](./docs/walkthrough.md) for a slide-by-slide narrative of the session and notes on each demo

### 🧠 Learning Outcomes

By the end of this session, you will be able to:

- **Understand the "prototype-to-production gap"** — why most vibe-coded apps and AI POCs don't reach production, and how starting on an enterprise-ready foundation avoids the rewrite.
- **Use Microsoft Fabric and Rayfin to give developers and coding agents a code-first backend** with typesafe schemas, auth, APIs, storage, and hosting — plus identity, row-level security, and governance built in from day one.
- **Use Rayfin apps to build custom dashboards and visualizations on top of Fabric-native data** — turning operational signals into actionable insights without a separate data integration or migration project.

### 💬 Keep Learning with Copilot

Try these prompts with GitHub Copilot to explore the topics from this session. Open Copilot Chat in Visual Studio Code (`Ctrl+Alt+I` on Windows/Linux, `Cmd+Shift+I` on Mac), paste a prompt, and see what you learn. Try connecting the [Microsoft Learn MCP Server](#-microsoft-learn-mcp-server) for the latest official documentation.

Use these as a starting point — or write your own!

1. Understand the foundation:

   ```
   Using the Microsoft Learn MCP Server, explain what Microsoft Fabric is, how Rayfin fits into it, and which Fabric features (identity, governance, analytics) a Rayfin app inherits out of the box.
   ```

2. Tour the sample app like an agent would:

   ```
   Open the Contoso Chef sample in /src/. Read src/AGENTS.md and src/.agents/skills/rayfin/SKILL.md first, then walk me through how the Recipe and Like entities, row-level security, and storage uploads are wired together — and explain why the React frontend never filters by user_id.
   ```

3. Extend the app safely:

   ```
   In the Contoso Chef sample, design a new feature that lets users tag recipes (e.g. "vegetarian", "dessert"). Propose the schema change, the migration steps with rayfin up, and the access-control rules — without breaking existing recipes.
   ```

4. Build on top of the data:

   ```
   Using the Microsoft Learn MCP Server, show me how to use Rayfin Analytics Apps to build a dashboard on top of the Contoso Chef Fabric data — most viewed recipes, popular ingredients, and active contributors.
   ```

### 💻 Technologies Used

1. [Microsoft Fabric](https://learn.microsoft.com/fabric/) — the unified, code-first analytics and app platform that powers Fabric apps.
1. [Rayfin](https://aka.ms/rayfin) — the code-first toolkit for building enterprise apps on Microsoft Fabric (typesafe schemas, APIs, storage, auth, hosting).
1. [Microsoft Entra ID](https://learn.microsoft.com/entra/fundamentals/what-is-entra) — identity and access for the deployed app via Fabric SSO.
1. [GitHub Copilot](https://docs.github.com/copilot) — the coding-agent workflow used to scaffold and evolve the app inside platform guardrails (skills + MCP).
1. [React](https://react.dev), [Vite](https://vite.dev), and [TypeScript](https://www.typescriptlang.org) — the frontend stack for the Contoso Chef sample app.

### 📚 Resources and Next Steps

| Resource | Description |
|:---------|:------------|
| [Build 2026 Next Steps](https://aka.ms/build26-next-steps) | Explore lab and session repos to further your learning from Microsoft Build |
| [LAB514: Ship AI apps fast with a managed backend in Microsoft Fabric](https://github.com/microsoft/Build26-LAB514-ship-ai-apps-fast-with-a-managed-backend-in-microsoft-fabric) | Related Build 2026 hands-on lab — go deeper on shipping AI apps with a managed backend on Microsoft Fabric |
| [Microsoft Fabric documentation](https://learn.microsoft.com/fabric/) | Full documentation for Microsoft Fabric, including data engineering, real-time intelligence, data warehouse, and app development |
| [Rayfin on aka.ms/rayfin](https://aka.ms/rayfin) | Official Rayfin landing page — getting started, CLI reference, and templates for Fabric apps |
| [Microsoft Entra ID documentation](https://learn.microsoft.com/entra/identity/) | Identity, authentication, and access-control documentation for Microsoft Entra ID |
| [GitHub Copilot documentation](https://docs.github.com/copilot) | Learn how to use GitHub Copilot in your IDE, the CLI, and across the GitHub platform |


### 🌟 Microsoft Learn MCP Server

The Microsoft Learn MCP Server gives your AI agent direct access to Microsoft's official documentation — grounded, up-to-date answers about the products and services covered in this session.

**VS Code** — One click installation: 

[![Install in VS Code](https://img.shields.io/badge/VS_Code-Install_Microsoft_Learn_MCP-0098FF?style=flat-square&logo=visualstudiocode&logoColor=white)](https://vscode.dev/redirect/mcp/install?name=microsoft-learn&config=%7B%22type%22%3A%22http%22%2C%22url%22%3A%22https%3A%2F%2Flearn.microsoft.com%2Fapi%2Fmcp%22%7D)


**GitHub Copilot CLI** — Run this to install the Learn MCP Server as a plugin:
```
/plugin install microsoftdocs/mcp
```

For more info, other clients, and to post questions, visit the [Learn MCP Server repo](https://aka.ms/learnmcp).

## Content Owners

<table>
<tr>
    <td align="center"><a href="http://github.com/sinedied">
        <img src="https://github.com/sinedied.png" width="100px;" alt="Yohan Lasorsa"/><br />
        <sub><b>Yohan Lasorsa</b></sub></a><br />
            <a href="https://github.com/sinedied" title="talk">📢</a>
    </td>
</tr></table>

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit [Contributor License Agreements](https://cla.opensource.microsoft.com).

When you submit a pull request, a CLA bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., status check, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Trademarks

This project may contain trademarks or logos for projects, products, or services. Authorized use of Microsoft
trademarks or logos is subject to and must follow
[Microsoft's Trademark & Brand Guidelines](https://www.microsoft.com/legal/intellectualproperty/trademarks/usage/general).
Use of Microsoft trademarks or logos in modified versions of this project must not cause confusion or imply Microsoft sponsorship.
Any use of third-party trademarks or logos are subject to those third-party's policies.
