# STAGE 2: React Query Optimization Plan

## Issues Identified:

### 1. **CRITICAL: App.jsx is 10,326 lines** ⚠️
- Monolithic component causing massive re-renders
- Every state change re-renders everything
- Hard to maintain and debug

### 2. **Realtime Subscriptions Causing Cascading Re-renders**
- TaskContext.jsx: Realtime subscription updates entire tasks array
- DeliveryTaskContext.jsx: Same issue
- Every update triggers full component tree re-render

### 3. **Missing Memoization in Contexts**
- Context values not wrapped in useMemo
- Causes unnecessary re-renders in all consumers

### 4. **Too Many Context Providers (12 providers nested)**
- Every context update can trigger re-renders in all children
- Performance bottleneck

## Optimization Strategy:

### Phase A: Quick Wins (High Impact, Low Risk)
1. Add useMemo to all context values
2. Add useCallback to all context functions
3. Optimize realtime subscription handlers

### Phase B: Component Splitting (Medium Risk)
1. Extract page components from App.jsx
2. Code-split routes with React.lazy()
3. Create reusable sub-components

### Phase C: Advanced (Higher Risk)
1. Implement React Query for data fetching
2. Remove redundant contexts
3. Virtualize long lists

## Implementation Order:

**We'll do Phase A first** - it's safe, high-impact, and won't break anything.
