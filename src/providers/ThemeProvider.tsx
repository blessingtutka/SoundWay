import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import {
  useColorScheme as useRNColorScheme,
  ColorSchemeName,
} from 'react-native';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

const normalizeTheme = (scheme: ColorSchemeName | null): Theme => {
  return scheme === 'dark' ? 'dark' : 'light';
};

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const systemColorScheme = useRNColorScheme();
  const [theme, setTheme] = useState<Theme>(normalizeTheme(systemColorScheme));

  useEffect(() => {
    setTheme(normalizeTheme(systemColorScheme));
  }, [systemColorScheme]);

  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
};

export const useColorScheme = (): Theme => {
  return useTheme().theme;
};
