# Compartilhar o dashboard com seus sócios

## Link que seus sócios vão usar (somente visualização)

**https://rodolpholimavp-cmd.github.io/Aquamagic_Aflitos/**

Eles abrem no navegador e veem os gráficos. Não conseguem atualizar a planilha.

---

## Configuração única (faça uma vez)

### 1. Enviar o projeto para o GitHub

Abra o **PowerShell** nesta pasta (`lavanderia-dashboard`) e execute:

```powershell
git init
git add -A
git commit -m "Dashboard Aquamagic Aflitos"
git branch -M main
git remote add origin https://github.com/rodolpholimavp-cmd/Aquamagic_Aflitos.git
git push -u origin main
```

Na primeira vez, o GitHub pedirá login (navegador ou token).

### 2. Ativar o GitHub Pages

1. Acesse: https://github.com/rodolpholimavp-cmd/Aquamagic_Aflitos/settings/pages
2. Em **Source**, escolha **Deploy from a branch**
3. Branch: **main** | Pasta: **/ (root)**
4. Clique **Save**

Em 1–2 minutos o link ficará ativo.

---

## Rotina quando atualizar a planilha Excel

Sua planilha: `Base_infos_lavanderia` (OneDrive)

1. Abra **`index.html`** (duplo clique) no seu computador
2. Clique em **Atualizar Dados** → selecione a planilha Excel
3. Clique em **Publicar na web** → baixa o arquivo `dashboard-data.json`
4. **Copie** esse arquivo para a pasta `data\` do projeto, substituindo `dashboard-data.json`
5. Dê **duplo clique** em **`publicar.bat`**

Pronto. Seus sócios atualizam a página (F5) e veem os dados novos.

---

## Resumo

| Você (local) | Sócios (internet) |
|---|---|
| Abre `index.html` | Abrem o link do GitHub Pages |
| **Atualizar Dados** + **Publicar na web** + `publicar.bat` | Só visualizam |
| Carrega Excel do OneDrive manualmente | Não precisam da planilha |
