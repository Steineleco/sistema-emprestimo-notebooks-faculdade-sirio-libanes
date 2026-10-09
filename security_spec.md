# Security Specification: Sistema de Empréstimo de Notebooks

## 1. Data Invariants
- `notebooks/{notebookId}`:
  - `notebookId` must match hostname format.
  - `status` can only be `GUARDADO`, `EMPRESTADO`, or `MANUTENCAO`.
  - Only authenticated technicians or admins (or users in initial setup) can create/update notebooks.
  - Notebook read is permitted for authenticated users to list available notebooks (`GUARDADO`).
- `emprestimos/{emprestimoId}`:
  - `protocolo` must follow regex `^NB-[0-9]{8}-[0-9]{4}$`.
  - `ra` must be 10 numeric digits `^[0-9]{10}$`.
  - `email` must end with `@faculdadesiriolibanes.org.br`.
  - `status` can only be `ABERTO`, `DEVOLVIDO`, or `ATRASADO`.
  - Only technicians or admins can perform loan returns (`dataDevolucao`, `tecnicoDevolucao`, status change to `DEVOLVIDO`).
  - Active loan block: A student with an open loan cannot take another notebook.

## 2. The Dirty Dozen Payloads (Vectors to Block)
1. **Invalid Domain Email:** Student submits with `@gmail.com` instead of `@faculdadesiriolibanes.org.br`.
2. **Invalid RA Length:** Student submits 8 digits instead of 10 digits.
3. **Invalid RA Non-Numeric:** Student submits `123456789A`.
4. **Invalid Protocol Format:** Non-standard protocol payload like `PROTO-123`.
5. **Unauthorized Status Escalation:** Student attempts to directly mark loan as `DEVOLVIDO` without technician verification.
6. **Ghost Fields Injection:** Injecting unauthorized properties like `{ isSuperAdmin: true }` in notebook or loan.
7. **Malicious Protocol ID Length / Poisoning:** 2KB document ID or invalid path characters.
8. **Double Loan Attack:** Student submitting while already holding an active open loan.
9. **Notebook Status Poisoning:** Modifying notebook status to unauthorized arbitrary string.
10. **Tampering with Checkout Time:** Backdating or falsifying checkout time arbitrarily.
11. **Impersonating Returning Technician:** Non-technician signing as `tecnicoDevolucao`.
12. **Denial of Wallet Overload:** Payloads with strings exceeding max lengths.
