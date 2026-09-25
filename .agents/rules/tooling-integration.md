---
trigger: always_on
description: Diretrizes de integração e orquestração entre Graphify, Ponytail e Agent Skills.
---

# Integração de Ferramentas: Graphify, Ponytail & Agent Skills

Este projeto utiliza três camadas complementares de assistência inteligente. O agente deve aplicar cada ferramenta em seu domínio correspondente, evitando conflitos de decisão:

---

## 1. Graphify — Compreensão Arquitetural e Grafo de Dependências
* **Quando usar**: 
  * Para entender a arquitetura global, relações entre componentes, modelos de dados e dependências cruzadas.
  * Sempre que precisar responder a dúvidas sobre fluxo de código ou mapear arquivos afetados por uma mudança.
* **Ações**:
  * Consultar `graphify-out/graph.json` via `graphify query "<pergunta>"` ou rotas/símbolos via `graphify path` e `graphify explain`.
  * Manter o grafo atualizado executando `graphify extract . --code-only` após alterações estruturais relevantes.

---

## 2. Ponytail — Filosofia de Código Minimalista e Qualidade
* **Quando usar**:
  * Em qualquer tarefa de escrita, refatoração, revisão e simplificação de código.
  * Para manter a disciplina do "lazy senior developer": a melhor linha de código é a que não precisa ser escrita (YAGNI).
* **Harmonia com o Graphify**:
  * O Ponytail determina que o "degrau da escada" só é escolhido *após* entender o problema real. Use o Graphify para mapear os fluxos antes de propor a solução mínima.
* **Ações**:
  * Reutilizar utilitários e padrões existentes na base de código antes de criar novos.
  * Priorizar bibliotecas nativas e dependências já instaladas (`package.json`).
  * Conduzir revisões focadas em cortar sobre-engenharia (`ponytail-review`) e auditar dívida técnica deliberada (`ponytail-debt`).

---

## 3. Agent Skills (Addy Osmani) — Rigor de Engenharia, Qualidade e Ciclo de Vida (SDLC)
* **Quando usar**:
  * Para conduzir processos estruturados de engenharia de software ponta a ponta: especificação (`spec-driven-development`), quebra de tarefas (`planning-and-task-breakdown`), implementação incremental (`incremental-implementation`) e testes (`test-driven-development`).
  * Para garantia de qualidade, segurança e performance: auditoria de código (`code-review-and-quality`), simplificação (`code-simplification`), segurança e OWASP (`security-and-hardening`), debugging sistemático (`debugging-and-error-recovery`) e performance (`performance-optimization`).
  * Em construção de UI e design de interfaces acessíveis (`frontend-ui-engineering`, `api-and-interface-design`).
* **Resolução de Precedência**:
  * **Graphify** mostra *onde* as alterações se conectam ao restante do projeto e as dependências afetadas.
  * **Ponytail** impõe a mentalidade minimalista: valida *se* a abstração é necessária ou se pode ser cortada (YAGNI).
  * **Agent Skills (Addy Osmani)** definem *o método e a disciplina*: aplicam TDD, anti-racionalização, verificações concretas e padrões de engenharia de ponta a ponta.
