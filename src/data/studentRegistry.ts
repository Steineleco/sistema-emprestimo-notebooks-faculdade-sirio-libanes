/**
 * Cadastro oficial de alunos da Faculdade Sírio-Libanês
 * Todos os RAs possuem exatamente 14 caracteres numéricos (ex: 20241088420001)
 */

export interface RegisteredStudent {
  nome: string;
  ra: string; // 14 caracteres numéricos
  curso: string;
  semestre: string;
  email: string; // @faculdadesiriolibanes.org.br
  whatsapp: string;
  notebookPadrao?: string;
}

export const REGISTERED_STUDENTS: RegisteredStudent[] = [
  {
    nome: 'Mariana Albuquerque Costa',
    ra: '20241088420001',
    curso: 'Medicina',
    semestre: '5º Semestre',
    email: 'mariana.costa@faculdadesiriolibanes.org.br',
    whatsapp: '(11) 98123-4567',
    notebookPadrao: 'FSL-NB-01',
  },
  {
    nome: 'Lucas Henrique Silva',
    ra: '20241045810002',
    curso: 'Medicina',
    semestre: '3º Semestre',
    email: 'lucas.silva@faculdadesiriolibanes.org.br',
    whatsapp: '(11) 98765-4321',
    notebookPadrao: 'FSL-NB-03',
  },
  {
    nome: 'Carolina Mendes de Oliveira',
    ra: '20231099200003',
    curso: 'Enfermagem',
    semestre: '6º Semestre',
    email: 'carolina.mendes@faculdadesiriolibanes.org.br',
    whatsapp: '(11) 97654-3210',
    notebookPadrao: 'FSL-NB-05',
  },
  {
    nome: 'Gabriel Ramos Vasconcelos',
    ra: '20251022140004',
    curso: 'Biomedicina',
    semestre: '2º Semestre',
    email: 'gabriel.ramos@faculdadesiriolibanes.org.br',
    whatsapp: '(11) 99887-6543',
    notebookPadrao: 'FSL-NB-02',
  },
  {
    nome: 'Beatriz Helena Santos',
    ra: '20232011450005',
    curso: 'Fisioterapia',
    semestre: '4º Semestre',
    email: 'beatriz.santos@faculdadesiriolibanes.org.br',
    whatsapp: '(11) 97123-9988',
    notebookPadrao: 'FSL-NB-04',
  },
  {
    nome: 'Felipe Augusto Nogueira',
    ra: '20241033210006',
    curso: 'Farmácia',
    semestre: '1º Semestre',
    email: 'felipe.nogueira@faculdadesiriolibanes.org.br',
    whatsapp: '(11) 98234-1122',
    notebookPadrao: 'FSL-NB-06',
  },
  {
    nome: 'Juliana Camargo Ferraz',
    ra: '20222044120007',
    curso: 'Psicologia',
    semestre: '8º Semestre',
    email: 'juliana.ferraz@faculdadesiriolibanes.org.br',
    whatsapp: '(11) 99111-4455',
    notebookPadrao: 'FSL-NB-07',
  },
  {
    nome: 'Rafael Lima Rodrigues',
    ra: '20242055990008',
    curso: 'Nutrição',
    semestre: '3º Semestre',
    email: 'rafael.lima@faculdadesiriolibanes.org.br',
    whatsapp: '(11) 98455-6677',
    notebookPadrao: 'FSL-NB-09',
  },
  {
    nome: 'Amanda Carvalho Pires',
    ra: '20231077880009',
    curso: 'Gestão Hospitalar',
    semestre: '5º Semestre',
    email: 'amanda.pires@faculdadesiriolibanes.org.br',
    whatsapp: '(11) 97333-8899',
    notebookPadrao: 'FSL-NB-10',
  },
  {
    nome: 'Thiago Martins Souza',
    ra: '20251099000010',
    curso: 'Tecnologia em Saúde & IA',
    semestre: '2º Semestre',
    email: 'thiago.martins@faculdadesiriolibanes.org.br',
    whatsapp: '(11) 99222-3344',
    notebookPadrao: 'FSL-NB-01',
  },
  {
    nome: 'Larissa Duarte Prado',
    ra: '20221088770011',
    curso: 'Residência Médica / Pós-Graduação',
    semestre: '7º Semestre',
    email: 'larissa.prado@faculdadesiriolibanes.org.br',
    whatsapp: '(11) 98888-2233',
    notebookPadrao: 'FSL-NB-03',
  },
];

/**
 * Normaliza strings para busca insensível a acentos e maiúsculas
 */
export function normalizeStudentName(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

/**
 * Busca aluno cadastrado pelo Nome Completo (ou substring significativo)
 */
export function findStudentByName(inputName: string): RegisteredStudent | undefined {
  const cleanInput = normalizeStudentName(inputName);
  if (!cleanInput || cleanInput.length < 3) return undefined;

  // Busca exata
  const exact = REGISTERED_STUDENTS.find(
    (s) => normalizeStudentName(s.nome) === cleanInput
  );
  if (exact) return exact;

  // Busca se o nome cadastrado contém o input ou se o input contém o nome
  const partial = REGISTERED_STUDENTS.find(
    (s) =>
      normalizeStudentName(s.nome).includes(cleanInput) ||
      cleanInput.includes(normalizeStudentName(s.nome))
  );
  if (partial) return partial;

  return undefined;
}

/**
 * Busca aluno cadastrado pelo RA (14 dígitos)
 */
export function findStudentByRa(ra: string): RegisteredStudent | undefined {
  const clean = ra.replace(/\D/g, '');
  if (!clean) return undefined;
  return REGISTERED_STUDENTS.find((s) => s.ra === clean);
}
