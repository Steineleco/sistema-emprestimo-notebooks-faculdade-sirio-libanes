import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
} from 'firebase/auth';
import { auth } from '../firebase/config';
import { UserProfile, UserRole } from '../types';

interface AuthContextType {
  currentUser: User | null;
  profile: UserProfile;
  role: UserRole;
  setRole: (role: UserRole) => void;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  simulateStudent: (student: { nome: string; ra: string; email: string; curso: string; semestre: string; whatsapp: string }) => void;
}

const DEFAULT_STUDENT_PROFILE: UserProfile = {
  uid: 'demo-student-1',
  email: 'lucas.silva@faculdadesiriolibanes.org.br',
  displayName: 'Lucas Henrique Silva',
  role: 'aluno',
  ra: '20241045810002',
  curso: 'Medicina',
  whatsapp: '(11) 98765-4321',
};

const DEFAULT_ADMIN_PROFILE: UserProfile = {
  uid: 'admin-ti-1',
  email: 'admin.ti@faculdadesiriolibanes.org.br',
  displayName: 'Administrador Geral TI (Sírio-Libanês)',
  role: 'ADM',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDevolucaoUrl =
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('tab') === 'devolucao' ||
      new URLSearchParams(window.location.search).get('devolucao') === 'true' ||
      new URLSearchParams(window.location.search).has('protocolo'));

  const isStudentUrl =
    !isDevolucaoUrl &&
    typeof window !== 'undefined' &&
    (new URLSearchParams(window.location.search).get('aluno') === 'true' ||
      new URLSearchParams(window.location.search).get('autofill') === 'true');

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRoleState] = useState<UserRole>(
    isDevolucaoUrl ? 'tecnico' : isStudentUrl ? 'aluno' : 'ADM'
  );
  const [profile, setProfile] = useState<UserProfile>(
    isDevolucaoUrl
      ? {
          uid: 'tecnico-plantao-1',
          email: 'atendimento.ti@faculdadesiriolibanes.org.br',
          displayName: 'Central de Atendimento TI (Recepção Presencial)',
          role: 'tecnico',
        }
      : isStudentUrl
      ? DEFAULT_STUDENT_PROFILE
      : DEFAULT_ADMIN_PROFILE
  );

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        const isAdminEmail =
          user.email === 'rssdasilva8021@gmail.com' ||
          user.email?.includes('admin');
        const defaultAssignedRole: UserRole = isAdminEmail ? 'ADM' : 'tecnico';

        setRoleState((prev) => (prev === 'aluno' ? defaultAssignedRole : prev));
        setProfile((prev) => ({
          ...prev,
          uid: user.uid,
          email: user.email || prev.email,
          displayName: user.displayName || prev.displayName,
          role: defaultAssignedRole,
        }));
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole);
    setProfile((prev) => ({
      ...prev,
      role: newRole,
      displayName:
        newRole === 'ADM'
          ? 'Administrador Geral TI'
          : newRole === 'tecnico'
          ? 'Técnico Especialista em TI'
          : 'Lucas Henrique Silva (Aluno)',
      email:
        newRole === 'ADM'
          ? 'admin.ti@faculdadesiriolibanes.org.br'
          : newRole === 'tecnico'
          ? 'suporte.ti@faculdadesiriolibanes.org.br'
          : 'lucas.silva@faculdadesiriolibanes.org.br',
    }));
  };

  const simulateStudent = (student: {
    nome: string;
    ra: string;
    email: string;
    curso: string;
    semestre: string;
    whatsapp: string;
  }) => {
    setRoleState('aluno');
    setProfile({
      uid: `student-${student.ra}`,
      displayName: student.nome,
      email: student.email,
      ra: student.ra,
      curso: student.curso,
      whatsapp: student.whatsapp,
      role: 'aluno',
    });
  };

  const handleSignInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error('Erro ao autenticar com Google:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setRoleState('aluno');
      setProfile(DEFAULT_STUDENT_PROFILE);
    } catch (error) {
      console.error('Erro ao deslogar:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        role,
        setRole,
        loading,
        signInWithGoogle: handleSignInWithGoogle,
        logout: handleLogout,
        simulateStudent,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
