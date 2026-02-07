import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  BoardCommenter,
  getBoardToken,
  setBoardToken,
  clearBoardToken,
  boardSignup,
  boardLogin,
  boardGetMe,
} from '../api';

interface BoardAuthContextType {
  commenter: BoardCommenter | null;
  loading: boolean;
  signup: (name: string, email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const BoardAuthContext = createContext<BoardAuthContextType>({
  commenter: null,
  loading: true,
  signup: async () => {},
  login: async () => {},
  logout: () => {},
});

export function useBoardAuth() {
  return useContext(BoardAuthContext);
}

export function BoardAuthProvider({
  slug,
  children,
}: {
  slug: string;
  children: React.ReactNode;
}) {
  const [commenter, setCommenter] = useState<BoardCommenter | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getBoardToken();
    if (!token) {
      setLoading(false);
      return;
    }
    boardGetMe(slug)
      .then(({ user }) => setCommenter(user))
      .catch(() => clearBoardToken())
      .finally(() => setLoading(false));
  }, [slug]);

  const signup = useCallback(async (name: string, email: string, password: string) => {
    const { token, user } = await boardSignup(slug, name, email, password);
    setBoardToken(token);
    setCommenter(user);
  }, [slug]);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await boardLogin(slug, email, password);
    setBoardToken(token);
    setCommenter(user);
  }, [slug]);

  const logout = useCallback(() => {
    clearBoardToken();
    setCommenter(null);
  }, []);

  return (
    <BoardAuthContext.Provider value={{ commenter, loading, signup, login, logout }}>
      {children}
    </BoardAuthContext.Provider>
  );
}
