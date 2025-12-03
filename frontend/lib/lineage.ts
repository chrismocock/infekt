// Lineage calculation and traversal logic

export interface TagNode {
  id: string;
  tagger_id: string;
  target_id: string;
  parent_tag_id: string | null;
  root_user_id: string;
  generation: number;
  timestamp: string;
}

export interface LineagePath {
  tags: TagNode[];
  depth: number;
  rootUserId: string;
}

/**
 * Calculate generation depth for a tag
 */
export function calculateGenerationDepth(
  parentGeneration: number
): number {
  return parentGeneration + 1;
}

/**
 * Traverse parent tag chain to find root
 */
export function traverseToRoot(
  tags: TagNode[],
  startTagId: string
): LineagePath {
  const path: TagNode[] = [];
  let currentTag = tags.find((t) => t.id === startTagId);

  if (!currentTag) {
    return { tags: [], depth: 0, rootUserId: '' };
  }

  const rootUserId = currentTag.root_user_id;

  while (currentTag) {
    path.push(currentTag);
    if (!currentTag.parent_tag_id) {
      break; // Reached root
    }
    currentTag = tags.find((t) => t.id === currentTag!.parent_tag_id);
  }

  return {
    tags: path.reverse(), // Reverse to show root to current
    depth: path.length - 1,
    rootUserId,
  };
}

/**
 * Get all ancestors for a tag
 */
export function getAncestors(
  tags: TagNode[],
  tagId: string
): TagNode[] {
  const path = traverseToRoot(tags, tagId);
  return path.tags.slice(0, -1); // Exclude the tag itself
}

/**
 * Calculate recursive score for an ancestor
 * Formula: 0.5 ^ (current_generation - ancestor_generation)
 */
export function calculateAncestorScore(
  currentGeneration: number,
  ancestorGeneration: number
): number {
  const generationDiff = currentGeneration - ancestorGeneration;
  return Math.pow(0.5, generationDiff);
}

/**
 * Build lineage tree structure
 */
export function buildLineageTree(tags: TagNode[]): Map<string, TagNode[]> {
  const tree = new Map<string, TagNode[]>();

  tags.forEach((tag) => {
    const parentId = tag.parent_tag_id || 'root';
    if (!tree.has(parentId)) {
      tree.set(parentId, []);
    }
    tree.get(parentId)!.push(tag);
  });

  return tree;
}

