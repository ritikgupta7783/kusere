import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';

const SiteContext = createContext(null);
export const useSite = () => useContext(SiteContext);

/** Public website copy + store settings, loaded from MongoDB so admin edits show without a redeploy. */
export function SiteProvider({ children }) {
  const [state, setState] = useState({ content: null, settings: null, loading: true, error: false });

  const load = useCallback(async () => {
    try {
      const { data } = await api.get('/content');
      setState({ content: data.content, settings: data.settings, loading: false, error: false });
    } catch {
      setState((s) => ({ ...s, loading: false, error: true }));
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const value = useMemo(() => ({ ...state, reload: load }), [state, load]);
  return <SiteContext.Provider value={value}>{children}</SiteContext.Provider>;
}
