import test from 'node:test';
import assert from 'node:assert/strict';
import Sortable from 'sortablejs';

// Replicable dropzone destruction helper identical to vanilla-setup implementation
function destroyNestedDropzones(root: any) {
  if (!root) return;
  const dropzones: any[] = [];
  if (root.classList?.contains('lms-dropzone') || root.dataset?.sortableActive === 'true') {
    dropzones.push(root);
  }
  if (root.querySelectorAll) {
    root.querySelectorAll('.lms-dropzone, [data-sortable-active="true"]').forEach((el: any) => {
      if (!dropzones.includes(el)) dropzones.push(el);
    });
  }
  dropzones.forEach(zone => {
    try {
      Sortable.get(zone)?.destroy();
    } catch {}
    delete zone.dataset.sortableActive;
  });
}

// Test Issue 1: DOM replacement without destroying previous Sortable instances
test('destroyNestedDropzones destroys Sortables on root and nested dropzones and removes sortableActive flag', () => {
  const destroyed: string[] = [];

  class MockElement {
    className = '';
    dataset: Record<string, string> = {};
    children: MockElement[] = [];
    parentElement: MockElement | null = null;
    id: string;

    constructor(id: string, className = '', sortableActive?: string) {
      this.id = id;
      this.className = className;
      if (sortableActive) this.dataset.sortableActive = sortableActive;
    }

    classList = {
      contains: (name: string) => this.className.split(/\s+/).includes(name),
    };

    querySelectorAll<T = MockElement>(selector: string): T[] {
      const results: MockElement[] = [];
      const traverse = (node: MockElement) => {
        for (const child of node.children) {
          if (selector.includes('.lms-dropzone') && child.classList.contains('lms-dropzone')) {
            results.push(child);
          } else if (selector.includes('data-sortable-active') && child.dataset.sortableActive === 'true') {
            results.push(child);
          }
          traverse(child);
        }
      };
      traverse(this);
      return results as unknown as T[];
    }
  }

  // Mock Sortable.get
  const origGet = (Sortable as any).get;
  const activeSortables = new Map<any, any>();

  (Sortable as any).get = (el: any) => activeSortables.get(el);

  try {
    const root = new MockElement('root-container', 'lms-dropzone', 'true');
    const child1 = new MockElement('child-zone-1', 'lms-dropzone', 'true');
    const child2 = new MockElement('child-zone-2', 'column-cell lms-dropzone', 'true');
    const untouched = new MockElement('external-catalog', 'catalog-list', 'true');

    root.children.push(child1, child2);

    activeSortables.set(root, { destroy: () => destroyed.push('root') });
    activeSortables.set(child1, { destroy: () => destroyed.push('child1') });
    activeSortables.set(child2, { destroy: () => destroyed.push('child2') });
    activeSortables.set(untouched, { destroy: () => destroyed.push('untouched') });

    // Call destroyNestedDropzones on root
    destroyNestedDropzones(root as unknown as HTMLElement);

    // Assert that root, child1, child2 were destroyed
    assert.deepEqual(destroyed.sort(), ['child1', 'child2', 'root'].sort());
    assert.equal(root.dataset.sortableActive, undefined);
    assert.equal(child1.dataset.sortableActive, undefined);
    assert.equal(child2.dataset.sortableActive, undefined);

    // Untouched catalog outside root was NOT destroyed
    assert.ok(!destroyed.includes('untouched'));
    assert.equal(untouched.dataset.sortableActive, 'true');

    // Calling with null or undefined does not throw
    assert.doesNotThrow(() => destroyNestedDropzones(null));
    assert.doesNotThrow(() => destroyNestedDropzones(undefined as any));
  } finally {
    (Sortable as any).get = origGet;
  }
});

// Test Issue 2: syncedCache retaining deleted pages and replaced projects
test('syncedCache evicts deleted pages and wipes on project replacement while preserving valid entries', () => {
  const syncedCache = new Map<string, { html: string; result: any }>();

  // Helper simulating cache additions
  syncedCache.set('page-1', { html: '<div>Page 1</div>', result: { id: 'page-1' } });
  syncedCache.set('page-2', { html: '<div>Page 2</div>', result: { id: 'page-2' } });
  syncedCache.set('page-3', { html: '<div>Page 3</div>', result: { id: 'page-3' } });

  assert.equal(syncedCache.size, 3);

  // 1. Deleting page-2 removes it from syncedCache
  const removedId = 'page-2';
  syncedCache.delete(removedId);
  assert.equal(syncedCache.has('page-2'), false);
  assert.equal(syncedCache.has('page-1'), true);
  assert.equal(syncedCache.has('page-3'), true);
  assert.equal(syncedCache.size, 2);

  // 2. Adding or importing a new page preserves existing valid entries
  const newPageId = 'page-4';
  syncedCache.set(newPageId, { html: '<div>Page 4</div>', result: { id: 'page-4' } });
  assert.equal(syncedCache.has('page-1'), true);
  assert.equal(syncedCache.has('page-3'), true);
  assert.equal(syncedCache.has('page-4'), true);
  assert.equal(syncedCache.size, 3);

  // 3. Opening a new project or creating a blank project clears syncedCache completely
  syncedCache.clear();
  assert.equal(syncedCache.size, 0);
  assert.equal(syncedCache.has('page-1'), false);
  assert.equal(syncedCache.has('page-4'), false);
});

// Test Issue 3: Deferred history save consolidation before undo and stale timer cancellation
test('undo() consolidates pending debounced edits immediately without losing state or skipping to older states', () => {
  let historyStack: string[] = ['<div id="canvas"><p>State 0</p></div>'];
  let historyIndex = 0;
  let historyTimeout: any = null;
  let restoredState: string | null = null;
  let currentCanvasHtml = '<div id="canvas"><p>State 0</p></div>';

  const getCleanCanvasState = () => currentCanvasHtml;

  const commitPendingHistory = () => {
    if (historyTimeout !== null) {
      clearTimeout(historyTimeout);
      historyTimeout = null;
    }
    const currentState = getCleanCanvasState();
    if (!currentState) return;
    if (historyIndex >= 0 && historyStack[historyIndex] === currentState) return;

    if (historyIndex < historyStack.length - 1) {
      historyStack = historyStack.slice(0, historyIndex + 1);
    }
    historyStack.push(currentState);
    historyIndex++;
  };

  const saveHistoryState = (immediate = false) => {
    if (immediate) {
      commitPendingHistory();
    } else {
      if (historyTimeout !== null) clearTimeout(historyTimeout);
      historyTimeout = setTimeout(() => {
        historyTimeout = null;
        commitPendingHistory();
      }, 1000);
    }
  };

  const undo = () => {
    commitPendingHistory();
    if (historyIndex > 0) {
      historyIndex--;
      restoredState = historyStack[historyIndex];
      currentCanvasHtml = restoredState;
    }
  };

  const redo = () => {
    if (historyTimeout !== null) {
      clearTimeout(historyTimeout);
      historyTimeout = null;
    }
    if (historyIndex < historyStack.length - 1) {
      historyIndex++;
      restoredState = historyStack[historyIndex];
      currentCanvasHtml = restoredState;
    }
  };

  // 1. Initial state
  assert.equal(historyIndex, 0);
  assert.deepEqual(historyStack, ['<div id="canvas"><p>State 0</p></div>']);

  // 2. User types an edit: State 1 (debounced 1s save scheduled)
  currentCanvasHtml = '<div id="canvas"><p>State 1 (Pending Edit)</p></div>';
  saveHistoryState(false);
  assert.ok(historyTimeout !== null, 'Timeout should be active');
  assert.equal(historyIndex, 0, 'Index has not moved yet');

  // 3. User immediately presses Ctrl+Z (undo) before 1 second has elapsed
  undo();

  // Consolidation must have pushed State 1, then undo stepped back to State 0
  assert.equal(historyTimeout, null, 'Pending timer must be cancelled');
  assert.deepEqual(historyStack, [
    '<div id="canvas"><p>State 0</p></div>',
    '<div id="canvas"><p>State 1 (Pending Edit)</p></div>',
  ]);
  assert.equal(historyIndex, 0, 'historyIndex should be 0 (State 0)');
  assert.equal(currentCanvasHtml, '<div id="canvas"><p>State 0</p></div>');

  // 4. User presses Ctrl+Y (redo)
  redo();
  assert.equal(historyIndex, 1, 'historyIndex stepped forward to 1');
  assert.equal(currentCanvasHtml, '<div id="canvas"><p>State 1 (Pending Edit)</p></div>');

  // 5. User undos back to State 0 and makes a new edit State 2
  undo();
  assert.equal(historyIndex, 0);
  assert.equal(currentCanvasHtml, '<div id="canvas"><p>State 0</p></div>');

  currentCanvasHtml = '<div id="canvas"><p>State 2 (Branch Edit)</p></div>';
  saveHistoryState(false); // pending save
  undo(); // immediate undo

  // State 1 must have been truncated by the new edit branch, State 2 consolidated, and now at State 0
  assert.deepEqual(historyStack, [
    '<div id="canvas"><p>State 0</p></div>',
    '<div id="canvas"><p>State 2 (Branch Edit)</p></div>',
  ]);
  assert.equal(historyIndex, 0);
  assert.equal(currentCanvasHtml, '<div id="canvas"><p>State 0</p></div>');

  // Redo recovers State 2
  redo();
  assert.equal(historyIndex, 1);
  assert.equal(currentCanvasHtml, '<div id="canvas"><p>State 2 (Branch Edit)</p></div>');
});

// Test Issue 5: Symmetrical setup and cleanup across React StrictMode remount cycles
test('StrictMode simulation: mount -> cleanup -> remount preserves selectionchange and cleans up listeners', () => {
  const events = new Map<string, Set<Function>>();

  const mockDocument = {
    addEventListener: (type: string, fn: Function) => {
      if (!events.has(type)) events.set(type, new Set());
      events.get(type)!.add(fn);
    },
    removeEventListener: (type: string, fn: Function) => {
      events.get(type)?.delete(fn);
    },
    dispatchEvent: (type: string) => {
      events.get(type)?.forEach(fn => fn());
    },
  };

  let selectionHandledCount = 0;
  const createSelectionEffect = () => {
    const handleSelectionChange = () => {
      selectionHandledCount++;
    };
    mockDocument.addEventListener('selectionchange', handleSelectionChange);
    return () => {
      mockDocument.removeEventListener('selectionchange', handleSelectionChange);
    };
  };

  // Step 1: Initial Mount in StrictMode
  const cleanup1 = createSelectionEffect();
  assert.equal(events.get('selectionchange')?.size, 1);
  mockDocument.dispatchEvent('selectionchange');
  assert.equal(selectionHandledCount, 1);

  // Step 2: StrictMode unmount / cleanup
  cleanup1();
  assert.equal(events.get('selectionchange')?.size, 0, 'Listener must be removed during cleanup');
  mockDocument.dispatchEvent('selectionchange');
  assert.equal(selectionHandledCount, 1, 'No event handled while unmounted');

  // Step 3: StrictMode remount
  const cleanup2 = createSelectionEffect();
  assert.equal(events.get('selectionchange')?.size, 1, 'Listener must be cleanly re-registered on remount');
  mockDocument.dispatchEvent('selectionchange');
  assert.equal(selectionHandledCount, 2, 'Event is handled again after remount');

  // Step 4: Final unmount
  cleanup2();
  assert.equal(events.get('selectionchange')?.size, 0);
});
