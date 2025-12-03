import { useState, useEffect } from 'react';
import { getMutationTree, unlockMutation, MutationNode } from '../lib/api';

export function useMutations(branch?: string) {
  const [nodes, setNodes] = useState<MutationNode[]>([]);
  const [mutationPoints, setMutationPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const loadMutationTree = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getMutationTree(branch);
      setNodes(data.nodes);
      setMutationPoints(data.mutation_points);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMutationTree();
  }, [branch]);

  const unlock = async (nodeId: string) => {
    try {
      setError(null);
      const result = await unlockMutation(nodeId);
      setNodes(result.nodes);
      setMutationPoints(result.mutation_points);
      return result;
    } catch (err) {
      setError(err as Error);
      throw err;
    }
  };

  return {
    nodes,
    mutationPoints,
    loading,
    error,
    unlock,
    refresh: loadMutationTree,
  };
}

