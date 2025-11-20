# 🔧 Soluções para Erro de Email

## ❌ Erro Encontrado

```
Código: 535
Mensagem: 5.7.8 Username and Password not accepted
```

O Gmail está **rejeitando a autenticação** com a senha fornecida.

## ✅ Soluções Possíveis

### Opção 1: Senha de App do Gmail (Recomendado)

Se a página de senhas de app não está disponível, tente:

1. **Acesse direto:** https://myaccount.google.com/security
2. **Procure por:** "Senhas de app" ou "App passwords"
3. **Ou ative primeiro a verificação em 2 etapas:**
   - Vá em: https://myaccount.google.com/security
   - Ative "Verificação em duas etapas"
   - Depois tente acessar senhas de app novamente

### Opção 2: Verificar Senha Atual

1. Verifique se a senha no `.env` está correta
2. Tente fazer login manual no Gmail com essa senha
3. Se não funcionar, a senha pode ter sido alterada

### Opção 3: Ativar Acesso de Apps Menos Seguros (NÃO RECOMENDADO)

⚠️ **ATENÇÃO:** Esta opção foi descontinuada pelo Google e não é recomendada por segurança.

### Opção 4: Usar Serviço de Email Alternativo

Se o Gmail continuar bloqueando, você pode usar:

- **SendGrid** (gratuito até 100 emails/dia)
- **Mailgun** (gratuito até 5.000 emails/mês)
- **AWS SES** (gratuito até 62.000 emails/mês)

## 🔍 Status Atual

- ✅ Conexão com servidor SMTP: **OK**
- ✅ TLS iniciado: **OK**
- ❌ Autenticação: **FALHOU**

## 📝 Próximos Passos

1. Tente gerar uma Senha de App do Gmail (mesmo que precise ativar 2FA primeiro)
2. Atualize o `.env` com a nova senha
3. Execute `python test_email.py` novamente para testar



