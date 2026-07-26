# Dashboard Aquamagic Aflitos

Painel para acompanhar o desempenho da lavanderia a partir de planilhas Excel.

## Uso local (você)

1. Abra `index.html` (duplo clique)
2. **Atualizar Dados** → selecione `Base_infos_lavanderia.xlsx`
3. **Publicar na web** → copie o JSON para `data/dashboard-data.json`
4. Execute **`publicar.bat`** para enviar ao GitHub

## Link para sócios (somente visualização)

**https://rodolpholimavp-cmd.github.io/Aquamagic_Aflitos/**

Instruções completas em **[COMPARTILHAR.md](COMPARTILHAR.md)**.

## Colunas esperadas na planilha

| Coluna      | Exemplo           |
|-------------|-------------------|
| Data        | 15/07/2026        |
| Total Venda | 12,50             |
| Produtos    | Lavagem / Secagem |
| Máquina     | 1 - LAVAR - 01    |
| Tipo Cartão | Crédito, PIX      |
| Usuário     | Nome              |

Pagamento em branco → **Fidelidade**.
