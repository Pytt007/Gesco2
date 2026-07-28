import { useState, useEffect, useCallback } from 'react';
import { DocumentBlock, BlockCategory, blockService } from '../../services/documents/builder';

/**
 * Hook React pour la gestion et le chargement du catalogue des blocs de document
 */
export function useDocumentBlocks(categoryFilter?: BlockCategory) {
  const [blocks, setBlocks] = useState<DocumentBlock[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchBlocks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let data = await blockService.getBlocks();
      if (categoryFilter) {
        data = data.filter((b) => b.category === categoryFilter);
      }
      setBlocks(data);
    } catch (err: any) {
      setError(err.message || 'Erreur lors du chargement des blocs');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  useEffect(() => {
    fetchBlocks();
  }, [fetchBlocks]);

  return {
    blocks,
    loading,
    error,
    refresh: fetchBlocks,
  };
}
