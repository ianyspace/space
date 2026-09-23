/**
 * B+ tree implementation that records every operation as a list of snapshots so
 * the UI can replay (animate) the whole process step by step.
 *
 * Conventions (classic textbook definition):
 *   - `order` (m)  = the maximum number of children a node may have.
 *   - max keys     = m - 1
 *   - min keys     = ceil(m / 2) - 1   (except the root, which may hold as few as 0)
 *   - All real keys live in the leaves, which are linked left to right.
 *   - Internal nodes only store separator keys ("copies in the leaves, moves in
 *     the internal nodes": a leaf split copies a key up, an internal split moves
 *     the middle key up).
 */

let idCounter = 0;

export function createNode(leaf = true) {
  idCounter += 1;
  return { id: `n${idCounter}`, keys: [], children: [], leaf, next: null };
}

export function resetIdCounter() {
  idCounter = 0;
}

export function cloneTree(node) {
  if (!node) return null;
  return {
    id: node.id,
    keys: [...node.keys],
    leaf: node.leaf,
    next: node.next,
    children: node.children.map(cloneTree),
  };
}

/** Rebuilds the leaf sibling links after a structural change. */
function relinkLeaves(root) {
  const leaves = [];
  const walk = (node) => {
    if (node.leaf) {
      leaves.push(node);
      return;
    }
    node.children.forEach(walk);
  };
  walk(root);

  leaves.forEach((leaf, index) => {
    leaf.next = index < leaves.length - 1 ? leaves[index + 1].id : null;
  });
}

function makeContext(root, order, steps) {
  const push = (step) => {
    relinkLeaves(root.root);
    steps.push({ ...step, root: cloneTree(root.root) });
  };

  return {
    order,
    maxKeys: order - 1,
    minKeys: Math.ceil(order / 2) - 1,
    root,
    push,
  };
}

/* ------------------------------------------------------------------ *
 *  Insert
 * ------------------------------------------------------------------ */

/**
 * Splits an overflowing node in place and returns the promoted separator plus
 * the freshly created right sibling. The caller is responsible for attaching
 * `right` to the parent, so a recorded snapshot always shows a consistent tree.
 */
function splitChild(node, ctx) {
  const total = node.keys.length;

  if (node.leaf) {
    const mid = Math.ceil(ctx.order / 2);
    const right = createNode(true);
    right.keys = node.keys.splice(mid);
    return { promote: right.keys[0], right, total };
  }

  const mid = Math.floor(ctx.order / 2);
  const promote = node.keys[mid];
  const right = createNode(false);
  right.keys = node.keys.slice(mid + 1);
  right.children = node.children.slice(mid + 1);
  node.keys = node.keys.slice(0, mid);
  node.children = node.children.slice(0, mid + 1);
  return { promote, right, total };
}

/**
 * Walks down to the target leaf, inserting `key`. Returns:
 *   - null            : nothing to do
 *   - 'duplicate'     : the key already exists
 *   - <node>          : this node overflowed and must be split by the caller
 *                       (the parent, or the root handler in `insertSteps`)
 */
function insertIntoSubtree(node, key, ctx, path) {
  if (node.leaf) {
    const idx = node.keys.findIndex((k) => key < k);
    const at = idx === -1 ? node.keys.length : idx;

    if (node.keys[at] === key) {
      ctx.push({
        action: 'duplicate',
        active: [node.id],
        path,
        message: `叶子节点里已经有 ${key} 了，B+ 树通常不允许重复键，插入结束。`,
      });
      return 'duplicate';
    }

    node.keys.splice(at, 0, key);
    ctx.push({
      action: 'insert',
      active: [node.id],
      path,
      message: `到达叶子节点，把 ${key} 插入到有序位置：现在叶子是 [${node.keys.join(', ')}]。`,
    });

    if (node.keys.length <= ctx.maxKeys) return null;
    return node;
  }

  let i = 0;
  while (i < node.keys.length && key >= node.keys[i]) i += 1;

  ctx.push({
    action: 'compare',
    active: [node.id],
    path,
    message: `内部节点是 [${node.keys.join(', ')}]，${
      i === 0 ? `${key} < ${node.keys[0]}` : `${key} ≥ ${node.keys[i - 1]}`
    }，走向第 ${i + 1} 个孩子。`,
  });

  const child = node.children[i];
  const overflowing = insertIntoSubtree(child, key, ctx, [...path, node.id]);
  if (overflowing === 'duplicate') return 'duplicate';
  if (!overflowing) return null;

  // Split the overflowing child and adopt the new sibling right away, so the
  // snapshot we record is a valid B+ tree (no dangling half-split node).
  const { promote, right, total } = splitChild(overflowing, ctx);
  node.keys.splice(i, 0, promote);
  node.children.splice(i + 1, 0, right);

  const parentOverflowed = node.keys.length > ctx.maxKeys;
  const leafMessage =
    `叶子有 ${total} 个键，超过上限 ${ctx.maxKeys}，分裂成左 [${overflowing.keys.join(
      ', ',
    )}] 和右 [${right.keys.join(', ')}]；右半的第一个键 ${promote} 被复制到父节点作为分隔键。`;
  const innerMessage =
    `内部节点有 ${total} 个键，超过上限 ${ctx.maxKeys}，分裂成左 [${overflowing.keys.join(
      ', ',
    )}] 和右 [${right.keys.join(', ')}]；中间键 ${promote} 被上移到父节点（内部节点是移动，不是复制）。`;

  ctx.push({
    action: 'split',
    active: parentOverflowed ? [overflowing.id, node.id] : [overflowing.id],
    created: [right.id],
    path: [...path, node.id],
    message: `${overflowing.leaf ? leafMessage : innerMessage}${
      parentOverflowed ? ' 注意：父节点也因此超出上限了，接下来会继续向上分裂。' : ''
    }`,
  });

  if (!parentOverflowed) return null;
  return node;
}

export function insertSteps(order, rootInput, key) {
  const holder = { root: cloneTree(rootInput) };
  const steps = [];
  const ctx = makeContext(holder, order, steps);

  ctx.push({
    action: 'start',
    active: [],
    path: [],
    message: `开始插入 ${key}：先沿着内部节点一路向下，找到它应该落入的叶子节点。`,
  });

  const overflowing = insertIntoSubtree(holder.root, key, ctx, []);

  if (overflowing === 'duplicate') {
    ctx.push({
      action: 'done',
      active: [],
      path: [],
      message: '键已存在，本次插入没有改动树。',
    });
    return steps;
  }

  if (overflowing) {
    const { promote, right } = splitChild(overflowing, ctx);
    const newRoot = createNode(false);
    newRoot.keys = [promote];
    newRoot.children = [overflowing, right];
    holder.root = newRoot;

    ctx.push({
      action: 'newroot',
      active: [newRoot.id],
      created: [newRoot.id, right.id],
      path: [],
      message: `溢出一直传到了根节点，于是把根分裂并创建新的根节点，树高 +1。B+ 树就是这样“长高”的。`,
    });
  }

  ctx.push({
    action: 'done',
    active: [],
    path: [],
    message: `插入完成 ✅ 所有叶子仍在同一层，树保持平衡。`,
  });

  return steps;
}

/* ------------------------------------------------------------------ *
 *  Delete
 * ------------------------------------------------------------------ */

/** Fixes an underflowing child of `parent` (borrow or merge), returns whether `parent` now underflows. */
function fixUnderflow(parent, i, ctx, path) {
  const child = parent.children[i];
  const left = i > 0 ? parent.children[i - 1] : null;
  const right = i < parent.children.length - 1 ? parent.children[i + 1] : null;

  // 1) borrow from the left sibling
  if (left && left.keys.length > ctx.minKeys) {
    if (child.leaf) {
      child.keys.unshift(left.keys.pop());
      parent.keys[i - 1] = child.keys[0];
    } else {
      child.keys.unshift(parent.keys[i - 1]);
      child.children.unshift(left.children.pop());
      parent.keys[i - 1] = left.keys.pop();
    }
    ctx.push({
      action: 'borrow',
      active: [child.id, left.id],
      path,
      message: `左兄弟还有富余，向它“借”一个键；注意要把父节点里的分隔键更新为 ${parent.keys[
        i - 1
      ]}，保证“左子树全部小于分隔键”依然成立。`,
    });
    return false;
  }

  // 2) borrow from the right sibling
  if (right && right.keys.length > ctx.minKeys) {
    if (child.leaf) {
      child.keys.push(right.keys.shift());
      parent.keys[i] = right.keys[0];
    } else {
      child.keys.push(parent.keys[i]);
      child.children.push(right.children.shift());
      parent.keys[i] = right.keys.shift();
    }
    ctx.push({
      action: 'borrow',
      active: [child.id, right.id],
      path,
      message: `右兄弟还有富余，向它“借”一个键，并把父节点分隔键更新为 ${parent.keys[i]}。`,
    });
    return false;
  }

  // 3) merge with a sibling
  if (left) {
    if (child.leaf) {
      left.keys.push(...child.keys);
    } else {
      left.keys.push(parent.keys[i - 1], ...child.keys);
      left.children.push(...child.children);
    }
    parent.keys.splice(i - 1, 1);
    parent.children.splice(i, 1);
    ctx.push({
      action: 'merge',
      active: [left.id],
      path,
      message: `两个兄弟都没有富余，只能合并：把右节点并入左节点，并在父节点里删掉对应的分隔键。`,
    });
  } else if (right) {
    if (child.leaf) {
      child.keys.push(...right.keys);
    } else {
      child.keys.push(parent.keys[i], ...right.keys);
      child.children.push(...right.children);
    }
    parent.keys.splice(i, 1);
    parent.children.splice(i + 1, 1);
    ctx.push({
      action: 'merge',
      active: [child.id],
      path,
      message: `和右兄弟合并：把它们之间的分隔键一起拿下来，再删掉父节点里多余的指针。`,
    });
  }

  const parentUnderflow = parent !== ctx.root.root && parent.keys.length < ctx.minKeys;
  if (parentUnderflow) {
    ctx.push({
      action: 'underflow',
      active: [parent.id],
      path,
      message: `合并后父节点的键数小于下限 ${ctx.minKeys}，需要继续向上借位或合并。`,
    });
  }
  return parentUnderflow;
}

function removeRec(node, key, ctx, path) {
  if (node.leaf) {
    const idx = node.keys.indexOf(key);
    if (idx === -1) {
      ctx.push({
        action: 'notfound',
        active: [node.id],
        path,
        message: `一直找到叶子节点，也没有发现 ${key}，删除结束。`,
      });
      return { removed: false };
    }

    node.keys.splice(idx, 1);
    ctx.push({
      action: 'remove',
      active: [node.id],
      path,
      message: `在叶子节点中删掉 ${key}：剩下 [${node.keys.join(', ')}]。`,
    });

    const underflow = node !== ctx.root.root && node.keys.length < ctx.minKeys;
    if (underflow) {
      ctx.push({
        action: 'underflow',
        active: [node.id],
        path,
        message: `叶子键数 ${node.keys.length} 小于下限 ${ctx.minKeys}（下溢），需要向兄弟借键或与兄弟合并。`,
      });
    }
    return { removed: true, underflow };
  }

  let i = 0;
  while (i < node.keys.length && key >= node.keys[i]) i += 1;

  ctx.push({
    action: 'compare',
    active: [node.id],
    path,
    message: `内部节点是 [${node.keys.join(', ')}]，进入第 ${i + 1} 个孩子继续查找 ${key}。`,
  });

  const res = removeRec(node.children[i], key, ctx, [...path, node.id]);
  if (!res.removed) return res;
  if (!res.underflow) return { removed: true };

  const underflow = fixUnderflow(node, i, ctx, path);
  return { removed: true, underflow };
}

export function removeSteps(order, rootInput, key) {
  const holder = { root: cloneTree(rootInput) };
  const steps = [];
  const ctx = makeContext(holder, order, steps);

  ctx.push({
    action: 'start',
    active: [],
    path: [],
    message: `开始删除 ${key}：先定位包含它的叶子节点。`,
  });

  const res = removeRec(holder.root, key, ctx, []);

  if (!res.removed) {
    ctx.push({
      action: 'done',
      active: [],
      path: [],
      message: `树中没有 ${key}，本次删除没有改动任何节点。`,
    });
    return steps;
  }

  if (!holder.root.leaf && holder.root.keys.length === 0 && holder.root.children.length === 1) {
    holder.root = holder.root.children[0];
    ctx.push({
      action: 'done',
      active: [holder.root.id],
      path: [],
      message: `根节点已经没有键了，让它唯一的孩子成为新根，树高 -1。`,
    });
  }

  ctx.push({
    action: 'done',
    active: [],
    path: [],
    message: `删除完成 ✅ 借位/合并处理完毕，所有叶子仍在同一层。`,
  });

  return steps;
}

/* ------------------------------------------------------------------ *
 *  Search
 * ------------------------------------------------------------------ */

export function searchSteps(order, rootInput, key) {
  const holder = { root: cloneTree(rootInput) };
  const steps = [];
  const ctx = makeContext(holder, order, steps);

  let node = holder.root;
  const path = [];

  ctx.push({
    action: 'start',
    active: [],
    path: [],
    message: `开始查找 ${key}：从根节点出发，逐层缩小范围。`,
  });

  while (node) {
    if (node.leaf) {
      const found = node.keys.includes(key);
      ctx.push({
        action: found ? 'found' : 'notfound',
        active: [node.id],
        path,
        foundKey: found ? key : null,
        message: found
          ? `在叶子节点 [${node.keys.join(', ')}] 中找到了 ${key} ✅`
          : `到达叶子节点 [${node.keys.join(', ')}]，没有找到 ${key} ❌`,
      });
      return steps;
    }

    let i = 0;
    while (i < node.keys.length && key >= node.keys[i]) i += 1;

    ctx.push({
      action: 'compare',
      active: [node.id],
      path,
      message: `比较内部节点 [${node.keys.join(', ')}]：${
        i === 0 ? `${key} < ${node.keys[0]}` : `${key} ≥ ${node.keys[i - 1]}`
      }，走第 ${i + 1} 个孩子。`,
    });

    path.push(node.id);
    node = node.children[i];
  }

  return steps;
}

/* ------------------------------------------------------------------ *
 *  Helpers
 * ------------------------------------------------------------------ */

/** Builds a tree from a list of keys without recording steps. */
export function buildTree(order, keys = []) {
  resetIdCounter();

  let root = createNode(true);
  keys.forEach((key) => {
    const holder = { root };
    const ctx = {
      order,
      maxKeys: order - 1,
      minKeys: Math.ceil(order / 2) - 1,
      root: holder,
      push: () => {},
    };

    const overflowing = insertIntoSubtree(holder.root, key, ctx, []);
    if (overflowing && overflowing !== 'duplicate') {
      const { promote, right } = splitChild(overflowing, ctx);
      const newRoot = createNode(false);
      newRoot.keys = [promote];
      newRoot.children = [overflowing, right];
      holder.root = newRoot;
    }
    root = holder.root;
  });

  relinkLeaves(root);
  return root;
}

export function collectValues(root) {
  const values = [];
  const walk = (node) => {
    if (node.leaf) {
      values.push(...node.keys);
      return;
    }
    node.children.forEach(walk);
  };
  walk(root);
  return values;
}

export function treeStats(root) {
  let leaves = 0;
  let depth = 0;
  const walk = (node, level) => {
    depth = Math.max(depth, level);
    if (node.leaf) {
      leaves += 1;
      return;
    }
    node.children.forEach((c) => walk(c, level + 1));
  };
  walk(root, 1);
  return { height: depth, leaves };
}
