# CLOUD PC X

Painel inicial para criar e administrar servidores reais na Vultr.

## Requisitos
- Node.js 20+
- Conta Vultr administrada por um adulto responsável
- Token da API Vultr com permissões mínimas necessárias

## Executar
1. Extraia o ZIP.
2. Abra a pasta no terminal.
3. Execute `npm install`.
4. Copie `.env.example` para `.env` e preencha `VULTR_API_KEY`.
5. Execute `npm start`.
6. Abra http://localhost:3000

## Segurança
- O token fica somente no backend, nunca no navegador.
- O projeto começa com limite de 1 máquina ativa/criada por vez.
- Configure alertas e limite de gastos na conta do provedor.
- A API pode gerar cobranças reais. Use apenas com autorização do responsável.
- Windows usa imagens Windows Server licenciadas e pode custar mais. Não é um Windows desktop comum.

## Limitações desta primeira versão
- O painel cria instâncias Linux ou Windows Server na Vultr.
- Acesso remoto é feito por ferramentas próprias do sistema (SSH/RDP); o painel ainda não transmite a tela do PC no navegador.
- A lista de regiões e planos é carregada da API. Nem toda combinação de região, plano e sistema é válida.
